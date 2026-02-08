/**
 * Soroban escrow contract invocation via Freighter.
 * Robust handling for Token Approvals, Type Encoding (u64/i128), and Transaction Polling.
 */
import {
  signTransaction as freighterSignTransaction,
  getAddress as freighterGetAddress,
  isConnected,
  requestAccess
} from "@stellar/freighter-api";

import {
  Contract,
  TransactionBuilder,
  nativeToScVal,
  scValToNative,
  Address,
  TimeoutInfinite,
  xdr,
  Transaction,
} from "@stellar/stellar-base";
import { Server } from "@stellar/stellar-sdk/rpc";

// --- Configuration ---
const RPC_URL = import.meta.env.VITE_SOROBAN_RPC_URL || "https://soroban-testnet.stellar.org";
const NETWORK_PASSPHRASE = import.meta.env.VITE_NETWORK_PASSPHRASE || "Test SDF Network ; September 2015";

// Valid Soroban token contract ID (Native XLM on Testnet)
// You can switch this to a custom token ID if needed.
export const VALID_TOKEN_ID = "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC";

function isNativeToken(tokenId: string): boolean {
  return tokenId === VALID_TOKEN_ID;
}

// --- Helpers ---

let server: Server | null = null;

function getServer(): Server {
  if (!server) server = new Server(RPC_URL);
  return server;
}

/**
 * Connects wallet and returns the active public key.
 */
export async function getWalletAddress(): Promise<string> {
  const connected = await isConnected();
  if (!connected) await requestAccess();
  
  const res = await freighterGetAddress();
  if (!res || typeof res !== 'object' || !('address' in res)) {
    throw new Error("Freighter not connected or locked.");
  }
  return res.address;
}

/**
 * Submits a signed XDR to the network and polls until completion.
 * Handles the "PENDING" status automatically.
 */
type TxResult = Awaited<ReturnType<Server["getTransaction"]>> & { hash?: string; status?: string; returnValue?: unknown; resultXdr?: string };

async function submitAndPoll(signedXdr: string): Promise<TxResult> {
  const s = getServer();

  const tx = new Transaction(signedXdr, NETWORK_PASSPHRASE);
  const sendRes = await s.sendTransaction(tx) as { status?: string; hash?: string };

  if (sendRes.status === "ERROR") {
    throw new Error(`Transaction Failed to Submit: ${JSON.stringify(sendRes)}`);
  }

  const hash = sendRes.hash;
  if (!hash) throw new Error("No transaction hash returned");

  let result: TxResult | null = null;
  const maxRetries = 30;

  console.log(`Transaction submitted ${hash}. Waiting for confirmation...`);

  for (let i = 0; i < maxRetries; i++) {
    await new Promise((resolve) => setTimeout(resolve, 2000));
    result = (await s.getTransaction(hash)) as TxResult;
    const status = result.status;

    if (status === "SUCCESS") {
      console.log(`Transaction ${hash} SUCCESS!`);
      return { ...result, hash };
    }
    if (status === "FAILED") {
      console.error("Transaction Failed Result:", result);
      throw new Error(`Transaction Failed on-chain: ${(result as { resultXdr?: string }).resultXdr ?? "unknown"}`);
    }
  }

  throw new Error(`Transaction timed out after ${maxRetries * 2} seconds. Hash: ${hash}`);
}

/**
 * General purpose contract invoker.
 */
async function invokeContract(
  contractId: string,
  method: string,
  args: xdr.ScVal[],
  sourceKey: string
): Promise<TxResult> {
  const s = getServer();
  const account = await s.getAccount(sourceKey);
  const contract = new Contract(contractId);

  // Build Operation
  const op = contract.call(method, ...args);

  // Build Transaction
  const tx = new TransactionBuilder(account, {
    fee: "10000",
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(op)
    .setTimeout(TimeoutInfinite)
    .build();

  // Simulate
  const simulated = await s.prepareTransaction(tx);
  
  // Fix: Re-apply network passphrase after simulation (SDK quirk)
  simulated.networkPassphrase = NETWORK_PASSPHRASE;

  // Sign
  const signRes = await freighterSignTransaction(simulated.toXDR(), { 
    networkPassphrase: NETWORK_PASSPHRASE 
  });
  
  if (!signRes.signedTxXdr) throw new Error("User rejected signature");

  // Submit & Poll
  return submitAndPoll(signRes.signedTxXdr);
}

// ---------------------------------------------------------------------------
// Token Approval
// ---------------------------------------------------------------------------

export async function approveToken(
  tokenId: string,
  owner: string,
  spender: string,
  amount: bigint
): Promise<void> {
  console.log(`Approving ${amount} tokens for spender ${spender}...`);
  const s = getServer();
  
  // Calculate expiration (current ledger + ~7 days)
  const latestLedger = await s.getLatestLedger();
  const currentSeq = latestLedger.sequence;
  const expirationLedger = currentSeq + 120960; // ~1 week buffer

  const args = [
    new Address(owner).toScVal(),
    new Address(spender).toScVal(),
    nativeToScVal(amount, { type: "i128" }),
    nativeToScVal(expirationLedger, { type: "u32" })
  ];

  await invokeContract(tokenId, "approve", args, owner);
  console.log("Token approved successfully.");
}

// ---------------------------------------------------------------------------
// Contract Functions
// ---------------------------------------------------------------------------

/**
 * create_escrow
 */
export async function createEscrow(
  contractId: string,
  freelancer: string,
  tokenAddr: string,
  amount: string, // string to avoid precision loss
  softDeadline: number
): Promise<{ txHash: string; jobId: number }> {
  
  const client = await getWalletAddress();
  const amountBig = BigInt(amount);

  // 1. APPROVE TOKENS FIRST (skip for native XLM)
  // The contract needs permission to move funds from Client -> Contract
  if (!isNativeToken(tokenAddr)) {
    await approveToken(tokenAddr, client, contractId, amountBig);
  }

  // 2. CREATE ESCROW
  console.log("Creating escrow...");
  
  // Explicit Type Mapping for Soroban
  // WARNING: 'softDeadline' must be u64. 'amount' must be i128.
  const args = [
    new Address(client).toScVal(),       // Client
    new Address(freelancer).toScVal(),   // Freelancer
    new Address(tokenAddr).toScVal(),    // Token Address
    nativeToScVal(amountBig, { type: "i128" }), // Amount
    nativeToScVal(BigInt(softDeadline), { type: "u64" }) // Deadline
  ];

  const result = await invokeContract(contractId, "create_escrow", args, client);

  // Extract Return Value (Job ID)
  // Soroban returns the value in `resultMetaXdr` which needs parsing, 
  // but usually simple return values are also in `resultXdr` if we decode carefully.
  // For simplicity, we assume successful execution means the job was created.
  // Ideally, you parse result.returnValue if available in your SDK version helpers.
  
  // We can try to decode the result if the SDK helper scValToNative supports the specific return structure
  let jobId = 0;
  const res = result as TxResult;
  try {
    if (res.returnValue != null) {
      jobId = Number(scValToNative(res.returnValue as xdr.ScVal));
    }
  } catch (e) {
    console.warn("Could not parse Job ID from return value, defaulting to timestamp");
    jobId = Date.now();
  }

  return { txHash: res.hash ?? "", jobId };
}

/**
 * complete_job
 */
export async function completeJob(
  sourceKey: string,
  contractId: string,
  jobId: number
): Promise<string> {
  const args = [nativeToScVal(BigInt(jobId), { type: "u64" })];
  const res = await invokeContract(contractId, "complete_job", args, sourceKey);
  return res.hash ?? "";
}

/**
 * cancel_within_6h
 */
export async function clientCancelWithin6h(
  sourceKey: string,
  contractId: string,
  jobId: number
): Promise<string> {
  const args = [nativeToScVal(BigInt(jobId), { type: "u64" })];
  const res = await invokeContract(contractId, "cancel_within_6h", args, sourceKey);
  return res.hash ?? "";
}

/**
 * refund_after_hard_deadline
 */
export async function claimRefundAfterHardDeadline(
  sourceKey: string,
  contractId: string,
  jobId: number
): Promise<string> {
  const args = [nativeToScVal(BigInt(jobId), { type: "u64" })];
  const res = await invokeContract(contractId, "refund_after_hard_deadline", args, sourceKey);
  return res.hash ?? "";
}

// ---------------------------------------------------------------------------
// Error Mapping
// ---------------------------------------------------------------------------

const ERROR_MAP: Record<number, string> = {
  1: "Amount below minimum escrow value",
  2: "Deadline must be in the future",
  3: "Arithmetic overflow",
  4: "Job not found",
  5: "Escrow not active",
  6: "Cancel window expired",
  7: "Refund not available yet",
};

export function mapContractError(e: any): string {
  const msg = e instanceof Error ? e.message : JSON.stringify(e);
  
  if (msg.includes("InvalidAction") || msg.includes("UnreachableCodeReached")) {
    return "Balance or Allowance Error: Ensure you have approved the contract and have enough XLM (plus reserves).";
  }

  // Regex to find "Error(Contract, #)" in logs
  const match = msg.match(/Error\(Contract, (\d+)\)/);
  if (match && match[1]) {
    const code = parseInt(match[1]);
    return ERROR_MAP[code] || `Contract Error Code: ${code}`;
  }

  return msg;
}