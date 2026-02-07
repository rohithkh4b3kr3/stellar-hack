/**
 * Soroban contract read-only helpers.
 * FreelanceContract: create_escrow, complete_job, client_cancel_within_6h, claim_refund_after_hard_deadline, get_job
 */
import { Account, Contract, TransactionBuilder, Networks, Keypair, scValToNative, nativeToScVal } from "@stellar/stellar-sdk";
import { Server, Api } from "@stellar/stellar-sdk/rpc";
const rpcUrl = process.env.SOROBAN_RPC_URL ?? "https://soroban-testnet.stellar.org";
const networkPassphrase = process.env.SOROBAN_NETWORK_PASSPHRASE ?? Networks.TESTNET;
let server = null;
function getServer() {
    if (!server)
        server = new Server(rpcUrl);
    return server;
}
const dummyKeypair = Keypair.random();
const dummyAccount = new Account(dummyKeypair.publicKey(), "0");
/** JobState: Funded=0, Completed=1, Cancelled=2, Refunded=3 */
const JOB_STATE_MAP = {
    Funded: 0,
    Completed: 1,
    Cancelled: 2,
    Refunded: 3,
};
function parseState(stateVal) {
    if (stateVal == null)
        return -1;
    if (typeof stateVal === "number")
        return stateVal;
    if (typeof stateVal === "string" && JOB_STATE_MAP[stateVal] != null)
        return JOB_STATE_MAP[stateVal];
    if (Array.isArray(stateVal) && stateVal[0]) {
        const s = String(stateVal[0]);
        if (JOB_STATE_MAP[s] != null)
            return JOB_STATE_MAP[s];
    }
    const obj = stateVal;
    const v = obj?.v ?? obj?.value ?? stateVal;
    if (typeof v === "number")
        return v;
    const tag = (obj?.tag ?? obj?.name ?? v);
    if (typeof tag === "string" && JOB_STATE_MAP[tag] != null)
        return JOB_STATE_MAP[tag];
    return -1;
}
/**
 * Get job state from contract. get_job(job_id: u64) -> JobState (Funded=0, Completed=1, Cancelled=2, Refunded=3).
 */
export async function getJobState(contractId, jobId) {
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
        if (Api.isSimulationError(result))
            return -1;
        const retval = result.result?.retval;
        if (retval == null)
            return -1;
        const data = scValToNative(retval);
        if (data && typeof data === "object" && data.state != null)
            return parseState(data.state);
    }
    catch {
        // job not found or contract error
    }
    return -1;
}
/**
 * Get job details from get_job(job_id).
 */
export async function getJobInfo(contractId, jobId) {
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
        if (Api.isSimulationError(result))
            return null;
        const retval = result.result?.retval;
        if (retval == null)
            return null;
        const data = scValToNative(retval);
        if (!data || typeof data !== "object")
            return null;
        const funded_at = (data.funded_at ?? data.fundedAt);
        const soft_deadline = (data.soft_deadline ?? data.softDeadline);
        const hard_deadline = (data.hard_deadline ?? data.hardDeadline);
        if (typeof funded_at !== "number" || typeof soft_deadline !== "number" || typeof hard_deadline !== "number")
            return null;
        return { funded_at, soft_deadline, hard_deadline };
    }
    catch {
        return null;
    }
}
export { rpcUrl, networkPassphrase };
