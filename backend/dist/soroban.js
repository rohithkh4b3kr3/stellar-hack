/**
 * Soroban contract read-only helpers.
 * All fund-moving operations (deposit, approve, refund) are done by the client
 * by signing transactions with Freighter; we only read state for 402 and validation.
 */
import { Account, Contract, TransactionBuilder, Networks, Keypair, scValToNative } from "@stellar/stellar-sdk";
import { Server, Api } from "@stellar/stellar-sdk/rpc";
const rpcUrl = process.env.SOROBAN_RPC_URL ?? "https://soroban-testnet.stellar.org";
const networkPassphrase = process.env.SOROBAN_NETWORK_PASSPHRASE ?? Networks.TESTNET;
let server = null;
function getServer() {
    if (!server)
        server = new Server(rpcUrl);
    return server;
}
// Dummy source for simulation only (no real tx submitted).
const dummyKeypair = Keypair.random();
const dummyAccount = new Account(dummyKeypair.publicKey(), "0");
const STATE_TAG_MAP = {
    Created: 0,
    AdvanceDeposited: 1,
    DeliverySubmitted: 2,
    Completed: 3,
    Refunded: 4,
};
/**
 * Get project state from contract (state enum: 0=Created, 1=AdvanceDeposited, 2=DeliverySubmitted, 3=Completed, 4=Refunded).
 * Returns 0 (Created) on any error so 402 is returned when we can't confirm deposit.
 */
export async function getProjectState(contractId) {
    try {
        const contract = new Contract(contractId);
        const s = getServer();
        const tx = new TransactionBuilder(dummyAccount, {
            fee: "10000",
            networkPassphrase,
        })
            .addOperation(contract.call("get_project"))
            .setTimeout(180)
            .build();
        const result = await s.simulateTransaction(tx);
        if (Api.isSimulationError(result))
            return 0;
        const retval = result.result?.retval;
        if (retval == null)
            return 0;
        // Parse ScVal to native JS (ProjectData struct)
        const data = scValToNative(retval);
        if (!data || typeof data !== "object")
            return 0;
        const stateVal = data.state;
        if (stateVal == null)
            return 0;
        // state can be: number, string tag, [string] (vec), or { tag/v/name }
        if (typeof stateVal === "number")
            return stateVal;
        if (typeof stateVal === "string" && STATE_TAG_MAP[stateVal] != null)
            return STATE_TAG_MAP[stateVal];
        if (Array.isArray(stateVal) && stateVal[0] && STATE_TAG_MAP[String(stateVal[0])] != null)
            return STATE_TAG_MAP[String(stateVal[0])];
        const obj = stateVal;
        const v = obj?.v ?? obj?.value ?? stateVal;
        if (typeof v === "number")
            return v;
        const tag = (obj?.tag ?? obj?.name ?? v);
        if (typeof tag === "string" && STATE_TAG_MAP[tag] != null)
            return STATE_TAG_MAP[tag];
        return 0;
    }
    catch {
        return 0;
    }
}
export { rpcUrl, networkPassphrase };
