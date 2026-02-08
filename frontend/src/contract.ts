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

const RPC_URL = import.meta.env.VITE_SOROBAN_RPC_URL || "https://soroban-testnet.stellar.org";
const NETWORK_PASSPHRASE = import.meta.env.VITE_NETWORK_PASSPHRASE || "Test SDF Network ; September 2015";

export const VALID_TOKEN_ID = "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC";

function isNativeToken(tokenId: string): boolean {
  return tokenId === VALID_TOKEN_ID;
}

let server: Server | null = null;

function getServer(): Server {
  if (!server) server = new Server(RPC_URL);
  return server;
}

export async function getWalletAddress(): Promise<string> {
  const connected = await isConnected();
  if (!connected) await requestAccess();
  
  const res = await freighterGetAddress();
  if (!res || typeof res !== 'object' || !('address' in res)) {
    throw new Error("Freighter not connected or locked.");
  }
  return res.address;
}

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

async function invokeContract(
  contractId: string,
  method: string,
  args: xdr.ScVal[],
  sourceKey: string
): Promise<TxResult> {
  const s = getServer();
  const account = await s.getAccount(sourceKey);
  const contract = new Contract(contractId);

  const op = contract.call(method, ...args);

  const tx = new TransactionBuilder(account, {
    fee: "10000",
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(op)
    .setTimeout(TimeoutInfinite)
    .build();

  const simulated = await s.prepareTransaction(tx);
  
  simulated.networkPassphrase = NETWORK_PASSPHRASE;

  const signRes = await freighterSignTransaction(simulated.toXDR(), { 
    networkPassphrase: NETWORK_PASSPHRASE 
  });
  
  if (!signRes.signedTxXdr) throw new Error("User rejected signature");

  return submitAndPoll(signRes.signedTxXdr);
}

export async function approveToken(
  tokenId: string,
  owner: string,
  spender: string,
  amount: bigint
): Promise<void> {
  console.log(`Approving ${amount} tokens for spender ${spender}...`);
  const s = getServer();
  
  const latestLedger = await s.getLatestLedger();
  const currentSeq = latestLedger.sequence;
  const expirationLedger = currentSeq + 120960;

  const args = [
    new Address(owner).toScVal(),
    new Address(spender).toScVal(),
    nativeToScVal(amount, { type: "i128" }),
    nativeToScVal(expirationLedger, { type: "u32" })
  ];

  await invokeContract(tokenId, "approve", args, owner);
  console.log("Token approved successfully.");
}

export async function createEscrow(
  contractId: string,
  freelancer: string,
  tokenAddr: string,
  amount: string,
  softDeadline: number
): Promise<{ txHash: string; jobId: number }> {
  
  const client = await getWalletAddress();
  const amountBig = BigInt(amount);

  if (!isNativeToken(tokenAddr)) {
    await approveToken(tokenAddr, client, contractId, amountBig);
  }

  console.log("Creating escrow...");
  
  const args = [
    new Address(client).toScVal(),
    new Address(freelancer).toScVal(),
    new Address(tokenAddr).toScVal(),
    nativeToScVal(amountBig, { type: "i128" }),
    nativeToScVal(BigInt(softDeadline), { type: "u64" })
  ];

  const result = await invokeContract(contractId, "create_escrow", args, client);

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

export async function completeJob(
  sourceKey: string,
  contractId: string,
  jobId: number
): Promise<string> {
  const args = [nativeToScVal(BigInt(jobId), { type: "u64" })];
  const res = await invokeContract(contractId, "complete_job", args, sourceKey);
  return res.hash ?? "";
}

export async function clientCancelWithin6h(
  sourceKey: string,
  contractId: string,
  jobId: number
): Promise<string> {
  const args = [nativeToScVal(BigInt(jobId), { type: "u64" })];
  const res = await invokeContract(contractId, "cancel_within_6h", args, sourceKey);
  return res.hash ?? "";
}

export async function claimRefundAfterHardDeadline(
  sourceKey: string,
  contractId: string,
  jobId: number
): Promise<string> {
  const args = [nativeToScVal(BigInt(jobId), { type: "u64" })];
  const res = await invokeContract(contractId, "refund_after_hard_deadline", args, sourceKey);
  return res.hash ?? "";
}

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

  const match = msg.match(/Error\(Contract, (\d+)\)/);
  if (match && match[1]) {
    const code = parseInt(match[1]);
    return ERROR_MAP[code] || `Contract Error Code: ${code}`;
  }

  return msg;
}