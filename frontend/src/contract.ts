/**
 * Soroban contract invocation via Freighter.
 * Builds transaction XDR and submits after user signs.
 */
import {
  Contract,
  TransactionBuilder,
  SorobanRpc,
  Network,
  Keypair,
  nativeToScVal,
  Address as StellarAddress,
} from "@stellar/stellar-sdk";

const rpcUrl = import.meta.env.VITE_SOROBAN_RPC_URL || "https://soroban-testnet.stellar.org";
const networkPassphrase = import.meta.env.VITE_NETWORK_PASSPHRASE || Network.TESTNET;

let server: SorobanRpc.Server | null = null;
function getServer(): SorobanRpc.Server {
  if (!server) server = new SorobanRpc.Server(rpcUrl);
  return server;
}

/** Submit signed XDR to network. */
export async function submitTransaction(signedXdr: string): Promise<string> {
  const s = getServer();
  const result = await s.sendTransaction(signedXdr);
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
  const source = Keypair.fromPublicKey(sourcePublicKey);
  
  // Convert args to ScVal format
  const convertedArgs = args.map((arg) => {
    if (typeof arg === "string" && arg.startsWith("G")) {
      // Treat as Stellar address
      return StellarAddress.fromString(arg).toXDRObject();
    }
    return nativeToScVal(arg);
  });
  
  const op = contract.call(method, ...convertedArgs);
  let tx = new TransactionBuilder(source.publicKey(), {
    fee: "10000",
    networkPassphrase,
  })
    .addOperation(op)
    .setTimeout(180)
    .build();
  tx = await server.prepareTransaction(tx);
  const xdr = tx.toXDR();
  const w = (window as any).freighter;
  if (!w?.signTransaction) throw new Error("Freighter not available");
  const signed = await w.signTransaction(xdr, networkPassphrase);
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

/** Freelancer submits delivery hash */
export async function submitDeliveryHash(
  sourcePublicKey: string,
  contractId: string,
  freelancerAddress: string,
  deliveryHashHex: string
): Promise<string> {
  // Convert 64-char hex string to BytesN<32>
  const hashBuffer = Buffer.from(deliveryHashHex, "hex");
  return invokeContract(sourcePublicKey, contractId, "submit_delivery", [
    freelancerAddress,
    hashBuffer,
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
