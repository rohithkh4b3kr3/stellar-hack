import { Account, Contract, TransactionBuilder, Networks, Keypair, scValToNative, nativeToScVal, Address } from "@stellar/stellar-sdk";
import { Server, Api } from "@stellar/stellar-sdk/rpc";

const rpcUrl = process.env.SOROBAN_RPC_URL ?? "https://soroban-testnet.stellar.org";
const networkPassphrase = process.env.SOROBAN_NETWORK_PASSPHRASE ?? Networks.TESTNET;

let server: Server | null = null;

function getServer(): Server {
  if (!server) server = new Server(rpcUrl);
  return server;
}

const dummyKeypair = Keypair.random();
const dummyAccount = new Account(dummyKeypair.publicKey(), "0");

const JOB_STATE_MAP: Record<string, number> = {
  Funded: 0,
  Completed: 1,
  Cancelled: 2,
  Refunded: 3,
};

function parseState(stateVal: unknown): number {
  if (stateVal == null) return -1;
  if (typeof stateVal === "number") return stateVal;
  if (typeof stateVal === "string" && JOB_STATE_MAP[stateVal] != null) return JOB_STATE_MAP[stateVal];
  if (Array.isArray(stateVal) && stateVal[0]) {
    const s = String(stateVal[0]);
    if (JOB_STATE_MAP[s] != null) return JOB_STATE_MAP[s];
  }
  const obj = stateVal as Record<string, unknown>;
  const v = obj?.v ?? obj?.value ?? stateVal;
  if (typeof v === "number") return v;
  const tag = (obj?.tag ?? obj?.name ?? v) as string | undefined;
  if (typeof tag === "string" && JOB_STATE_MAP[tag] != null) return JOB_STATE_MAP[tag];
  return -1;
}

export async function getJobState(contractId: string, jobId: number): Promise<number> {
  const s = getServer();
  const contract = new Contract(contractId);
  try {
    const tx = new TransactionBuilder(dummyAccount, {
      fee: "10000",
      networkPassphrase,
    })
      .addOperation(contract.call("get_job", nativeToScVal(BigInt(jobId))))
      .setTimeout(180)
      .build();
    const result = await s.simulateTransaction(tx);
    if (Api.isSimulationError(result)) return -1;
    const retval = (result as Api.SimulateTransactionSuccessResponse).result?.retval;
    if (retval == null) return -1;
    const data = scValToNative(retval) as Record<string, unknown>;
    if (data && typeof data === "object" && data.state != null) return parseState(data.state);
  } catch {}
  return -1;
}

export async function getJobInfo(contractId: string, jobId: number): Promise<{
  funded_at: number;
  soft_deadline: number;
  hard_deadline: number;
} | null> {
  try {
    const contract = new Contract(contractId);
    const s = getServer();
    const tx = new TransactionBuilder(dummyAccount, {
      fee: "10000",
      networkPassphrase,
    })
      .addOperation(contract.call("get_job", nativeToScVal(BigInt(jobId))))
      .setTimeout(180)
      .build();
    const result = await s.simulateTransaction(tx);
    if (Api.isSimulationError(result)) return null;
    const retval = (result as Api.SimulateTransactionSuccessResponse).result?.retval;
    if (retval == null) return null;
    const data = scValToNative(retval) as Record<string, unknown>;
    if (!data || typeof data !== "object") return null;
    const funded_at = (data.funded_at ?? (data as Record<string, unknown>).fundedAt) as number | undefined;
    const soft_deadline = (data.soft_deadline ?? (data as Record<string, unknown>).softDeadline) as number | undefined;
    const hard_deadline = (data.hard_deadline ?? (data as Record<string, unknown>).hardDeadline) as number | undefined;
    if (typeof funded_at !== "number" || typeof soft_deadline !== "number" || typeof hard_deadline !== "number")
      return null;
    return { funded_at, soft_deadline, hard_deadline };
  } catch {
    return null;
  }
}

export async function simulateCreateEscrow(
  contractId: string,
  client: string,
  freelancer: string,
  tokenId: string,
  amount: string,
  softDeadline: number
): Promise<{ ok: boolean; error?: string }> {
  const s = getServer();
  const contract = new Contract(contractId);
  const clientAccount = new Account(client, "0");
  const tx = new TransactionBuilder(clientAccount, {
    fee: "10000",
    networkPassphrase,
  })
    .addOperation(
      contract.call(
        "create_escrow",
        nativeToScVal(Address.fromString(client)),
        nativeToScVal(Address.fromString(freelancer)),
        nativeToScVal(Address.fromString(tokenId)),
        nativeToScVal(BigInt(amount)),
        nativeToScVal(BigInt(softDeadline))
      )
    )
    .setTimeout(180)
    .build();
  try {
    const result = await s.simulateTransaction(tx);
    if (Api.isSimulationError(result)) {
      const err = (result as Api.SimulateTransactionErrorResponse).error;
      const msg = typeof err === "string" ? err : (err as { message?: string })?.message ?? String(err);
      return { ok: false, error: msg };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export { rpcUrl, networkPassphrase };
