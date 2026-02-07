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
  const op = contract.call(method, ...args);
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
