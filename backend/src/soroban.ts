/**
 * Soroban contract read-only helpers.
 * All fund-moving operations (deposit, approve, refund) are done by the client
 * by signing transactions with Freighter; we only read state for 402 and validation.
 */
import { Contract, SorobanRpc, TransactionBuilder, Network, Keypair } from "@stellar/stellar-sdk";

const rpcUrl = process.env.SOROBAN_RPC_URL ?? "https://soroban-testnet.stellar.org";
const networkPassphrase = process.env.SOROBAN_NETWORK_PASSPHRASE ?? Network.TESTNET;

let server: SorobanRpc.Server | null = null;

function getServer(): SorobanRpc.Server {
  if (!server) server = new SorobanRpc.Server(rpcUrl);
  return server;
}

// Dummy source for simulation only (no real tx submitted).
const dummySource = Keypair.random();

/**
 * Get project state from contract (state enum: 0=Created, 1=AdvanceDeposited, 2=Completed, 3=Refunded).
 * Returns 0 (Created) on any error so 402 is returned when we can't confirm deposit.
 */
export async function getProjectState(contractId: string): Promise<number> {
  try {
    const contract = new Contract(contractId);
    const s = getServer();
    const tx = new TransactionBuilder(dummySource.publicKey(), {
      fee: "10000",
      networkPassphrase,
    })
      .addOperation(contract.call("get_project"))
      .setTimeout(180)
      .build();
    const result = await s.simulateTransaction(tx);
    if (SorobanRpc.Api.isSimulationError(result)) return 0;
    const ret = (result as SorobanRpc.Api.SimulateTransactionSuccessResponse).result?.retval;
    if (ret == null) return 0;
    const stateVal = (ret as any).state;
    if (stateVal == null) return 0;
    const stateNum = stateVal.v ?? stateVal;
    return typeof stateNum === "number" ? stateNum : 0;
  } catch {
    return 0;
  }
}

export { rpcUrl, networkPassphrase };
