/**
 * Soroban contract invocation via Freighter.
 * FreelanceContract: create_escrow, complete_job, client_cancel_within_6h, claim_refund_after_hard_deadline
 */
import { signTransaction as freighterSignTransaction } from "@stellar/freighter-api";
import {
  Account,
  Contract,
  TransactionBuilder,
  Keypair,
  nativeToScVal,
  scValToNative,
  Address as StellarAddress,
  Asset,
  Networks,
} from "@stellar/stellar-sdk";
import { Server } from "@stellar/stellar-sdk/rpc";

const rpcUrl = import.meta.env.VITE_SOROBAN_RPC_URL || "https://soroban-testnet.stellar.org";
const networkPassphrase = import.meta.env.VITE_NETWORK_PASSPHRASE || Networks.TESTNET;

export function getTokenContractId(
  assetCode: string,
  issuerPublicKey: string,
  passphrase: string = networkPassphrase
): string {
  const asset = new Asset(assetCode.trim(), issuerPublicKey.trim());
  return asset.contractId(passphrase);
}

let server: Server | null = null;
function getServer(): Server {
  if (!server) server = new Server(rpcUrl);
  return server;
}

export async function getCurrentLedger(): Promise<number> {
  const s = getServer();
  const r = await s.getLatestLedger();
  return Number(r.sequence ?? 0);
}

export async function submitTransaction(signedXdr: string): Promise<string> {
  const s = getServer();
  const tx = TransactionBuilder.fromXDR(signedXdr, networkPassphrase);
  const result = await s.sendTransaction(tx);
  if (result.errorResult) throw new Error(String(result.errorResult));
  if (result.status === "ERROR") throw new Error(result.status);
  return result.hash ?? "";
}

/** Build, sign with Freighter, and submit. Returns tx hash. */
export async function invokeContract(
  sourcePublicKey: string,
  contractId: string,
  method: string,
  args: unknown[]
): Promise<string> {
  const contract = new Contract(contractId);
  const s = getServer();
  const sourceKp = Keypair.fromPublicKey(sourcePublicKey);
  const sourceAccount = new Account(sourceKp.publicKey(), "0");
  const convertedArgs = args.map((arg) => {
    if (typeof arg === "string" && (arg.startsWith("G") || arg.startsWith("C"))) {
      return nativeToScVal(StellarAddress.fromString(arg));
    }
    if (arg instanceof Uint8Array) {
      return nativeToScVal(Buffer.from(arg));
    }
    return nativeToScVal(arg);
  });

  const op = contract.call(method, ...convertedArgs);
  let tx = new TransactionBuilder(sourceAccount, {
    fee: "10000",
    networkPassphrase,
  })
    .addOperation(op)
    .setTimeout(180)
    .build();
  tx = await s.prepareTransaction(tx);
  const xdr = tx.toXDR();
  const result = await freighterSignTransaction(xdr, { networkPassphrase });
  if ("error" in result && result.error) throw new Error(result.error);
  const signed = (result as { signedTxXdr: string }).signedTxXdr;
  return submitTransaction(signed);
}

/** Poll until tx is confirmed, then return retval. */
async function getTxResult(hash: string): Promise<import("@stellar/stellar-sdk").xdr.ScVal> {
  const s = getServer();
  for (let i = 0; i < 60; i++) {
    await new Promise((r) => setTimeout(r, 2000));
    const tx = await s.getTransaction(hash);
    const txAny = tx as { status?: string; result?: { retval?: import("@stellar/stellar-sdk").xdr.ScVal } };
    if (txAny.status === "SUCCESS" && txAny.result?.retval != null) {
      return txAny.result.retval;
    }
    if (txAny.status === "FAILED") throw new Error("Transaction failed");
  }
  throw new Error("Transaction timeout");
}

export { rpcUrl, networkPassphrase };

// ---------------------------------------------------------------------------
// FreelanceContract
// ---------------------------------------------------------------------------

/**
 * create_escrow(client, freelancer, token, amount, soft_deadline) -> u64 job_id.
 * Transfers funds in one transaction. Client must have approved token spending first.
 */
export async function createEscrow(
  sourcePublicKey: string,
  contractId: string,
  clientAddress: string,
  freelancerAddress: string,
  tokenId: string,
  amount: string,
  softDeadlineTs: number
): Promise<{ txHash: string; jobId: number }> {
  const hash = await invokeContract(sourcePublicKey, contractId, "create_escrow", [
    clientAddress,
    freelancerAddress,
    tokenId,
    BigInt(amount),
    BigInt(softDeadlineTs),
  ]);
  const retval = await getTxResult(hash);
  const jobId = Number(scValToNative(retval));
  return { txHash: hash, jobId };
}

/**
 * complete_job(job_id) -> () Client approves work; pays freelancer (with penalty if past soft_deadline).
 */
export async function completeJob(
  sourcePublicKey: string,
  contractId: string,
  jobId: number
): Promise<string> {
  return invokeContract(sourcePublicKey, contractId, "complete_job", [jobId]);
}

/**
 * client_cancel_within_6h(job_id) -> () Refund if within 6 hours of funding.
 */
export async function clientCancelWithin6h(
  sourcePublicKey: string,
  contractId: string,
  jobId: number
): Promise<string> {
  return invokeContract(sourcePublicKey, contractId, "client_cancel_within_6h", [jobId]);
}

/**
 * claim_refund_after_hard_deadline(job_id) -> () Refund to client after hard deadline passes.
 */
export async function claimRefundAfterHardDeadline(
  sourcePublicKey: string,
  contractId: string,
  jobId: number
): Promise<string> {
  return invokeContract(sourcePublicKey, contractId, "claim_refund_after_hard_deadline", [jobId]);
}
