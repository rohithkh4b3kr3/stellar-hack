/**
 * Soroban contract invocation via Freighter (bundled npm package).
 */
import { signTransaction as freighterSignTransaction } from "@stellar/freighter-api";
import {
  Account,
  Contract,
  TransactionBuilder,
  Keypair,
  nativeToScVal,
  Address as StellarAddress,
  Networks,
} from "@stellar/stellar-sdk";
import { Server } from "@stellar/stellar-sdk/rpc";

const rpcUrl = import.meta.env.VITE_SOROBAN_RPC_URL || "https://soroban-testnet.stellar.org";
const networkPassphrase = import.meta.env.VITE_NETWORK_PASSPHRASE || Networks.TESTNET;

let server: Server | null = null;
function getServer(): Server {
  if (!server) server = new Server(rpcUrl);
  return server;
}

/** Submit signed XDR to network. */
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
  const server = getServer();
  const sourceKp = Keypair.fromPublicKey(sourcePublicKey);
  const sourceAccount = new Account(sourceKp.publicKey(), "0");
  // Convert args to ScVal format
  const convertedArgs = args.map((arg) => {
    if (typeof arg === "string" && (arg.startsWith("G") || arg.startsWith("C"))) {
      // Treat as Stellar address or contract ID
      return nativeToScVal(StellarAddress.fromString(arg));
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
  tx = await server.prepareTransaction(tx);
  const xdr = tx.toXDR();
  const result = await freighterSignTransaction(xdr, { networkPassphrase });
  if ("error" in result && result.error) throw new Error(result.error);
  const signed = (result as { signedTxXdr: string }).signedTxXdr;
  return submitTransaction(signed);
}

export { rpcUrl, networkPassphrase };

/**
 * Helper functions for common contract operations.
 */

/** Initialize escrow contract */
export async function initProject(
  sourcePublicKey: string,
  contractId: string,
  businessAddress: string,
  freelancerAddress: string,
  tokenId: string,
  totalAmount: string,
  advanceAmount: string,
  deliveryDeadlineTs: number,
  verificationWindowSecs: number
): Promise<string> {
  return invokeContract(sourcePublicKey, contractId, "init_project", [
    businessAddress,
    freelancerAddress,
    tokenId,
    BigInt(totalAmount),
    BigInt(advanceAmount),
    BigInt(deliveryDeadlineTs),
    BigInt(verificationWindowSecs),
  ]);
}

/** Business deposits 30% advance */
export async function depositAdvance(
  sourcePublicKey: string,
  contractId: string,
  businessAddress: string
): Promise<string> {
  return invokeContract(sourcePublicKey, contractId, "deposit_advance", [businessAddress]);
}

/** Deposit remaining 70% before approval */
export async function depositRemaining(
  sourcePublicKey: string,
  contractId: string,
  businessAddress: string
): Promise<string> {
  return invokeContract(sourcePublicKey, contractId, "deposit_remaining", [businessAddress]);
}

/** Hex string to Uint8Array (browser-safe, no Buffer) */
function hexToBytes(hex: string): Uint8Array {
  const match = hex.match(/.{1,2}/g);
  if (!match || match.length !== 32) throw new Error("Hash must be 64 hex chars (32 bytes)");
  return new Uint8Array(match.map((b) => parseInt(b, 16)));
}

/** Freelancer submits delivery hash */
export async function submitDeliveryHash(
  sourcePublicKey: string,
  contractId: string,
  freelancerAddress: string,
  deliveryHashHex: string
): Promise<string> {
  const hashBytes = hexToBytes(deliveryHashHex);
  return invokeContract(sourcePublicKey, contractId, "submit_delivery", [
    freelancerAddress,
    hashBytes,
  ]);
}

/** Business approves delivery; releases full payment */
export async function approveDelivery(
  sourcePublicKey: string,
  contractId: string,
  businessAddress: string
): Promise<string> {
  return invokeContract(sourcePublicKey, contractId, "approve_delivery", [businessAddress]);
}

/** Auto-release payment after verification window */
export async function autoReleaseIfTimeout(
  sourcePublicKey: string,
  contractId: string
): Promise<string> {
  return invokeContract(sourcePublicKey, contractId, "auto_release_if_timeout", []);
}

/** Refund advance if freelancer missed deadline */
export async function refundIfDeadlineMissed(
  sourcePublicKey: string,
  contractId: string
): Promise<string> {
  return invokeContract(sourcePublicKey, contractId, "refund_if_deadline_missed", []);
}
