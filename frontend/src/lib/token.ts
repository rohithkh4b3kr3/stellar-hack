import { Contract, TransactionBuilder, Account, Keypair, nativeToScVal, scValToNative, Address as StellarAddress, Networks } from "@stellar/stellar-sdk";
import { Server, Api } from "@stellar/stellar-sdk/rpc";

const rpcUrl = import.meta.env.VITE_SOROBAN_RPC_URL || "https://soroban-testnet.stellar.org";
const networkPassphrase = import.meta.env.VITE_NETWORK_PASSPHRASE || Networks.TESTNET;
const NATIVE_XLM_TOKEN_ID = (import.meta.env.VITE_XLM_TOKEN_ID ?? "").trim();

let server: Server | null = null;
function getServer(): Server {
  if (!server) server = new Server(rpcUrl);
  return server;
}

const dummyKp = Keypair.random();
const dummyAccount = new Account(dummyKp.publicKey(), "0");

export const XLM_RESERVE_STROOPS = 10_000_000;
export const XLM_MIN_ESCROW_STROOPS = 20_000_000;

export const CONTRACT_MIN_AMOUNT = 1_000;

export const XLM_DECIMALS = 7;

export const STROOPS_PER_XLM = 10_000_000;

export function stroopsToXlm(stroops: string | number, decimals = 2): string {
  const n = typeof stroops === "string" ? parseInt(stroops, 10) : stroops;
  if (isNaN(n) || n < 0) return "0";
  return (n / STROOPS_PER_XLM).toFixed(decimals);
}

export function xlmToStroops(xlm: string | number): string {
  const n = typeof xlm === "string" ? parseFloat(xlm) : xlm;
  if (isNaN(n) || n < 0) return "0";
  return Math.floor(n * STROOPS_PER_XLM).toString();
}

export function isNativeXlm(tokenId: string): boolean {
  if (!tokenId) return false;
  return tokenId.trim() === NATIVE_XLM_TOKEN_ID;
}

export function getTokenDecimals(tokenId: string): number {
  return isNativeXlm(tokenId) ? XLM_DECIMALS : 7;
}

export function getTokenName(tokenId: string): string {
  return isNativeXlm(tokenId) ? "native" : "custom";
}

export async function getTokenBalance(tokenId: string, address: string): Promise<string> {
  const s = getServer();
  const contract = new Contract(tokenId);
  const tx = new TransactionBuilder(dummyAccount, {
    fee: "10000",
    networkPassphrase,
  })
    .addOperation(contract.call("balance", nativeToScVal(StellarAddress.fromString(address))))
    .setTimeout(180)
    .build();
  const result = await s.simulateTransaction(tx);
  if (Api.isSimulationError(result)) return "0";
  const retval = (result as Api.SimulateTransactionSuccessResponse).result?.retval;
  if (retval == null) return "0";
  try {
    const n = scValToNative(retval);
    return String(typeof n === "bigint" ? n : n ?? 0);
  } catch {
    return "0";
  }
}

export async function getMaxSpendable(tokenId: string, address: string): Promise<string> {
  const balance = await getTokenBalance(tokenId, address);
  const bal = BigInt(balance);
  if (isNativeXlm(tokenId)) {
    const reserve = BigInt(XLM_RESERVE_STROOPS);
    if (bal <= reserve) return "0";
    return String(bal - reserve);
  }
  return balance;
}

export function canSubmitNativeXlmEscrow(spendable: string, amount: string): boolean {
  const spendBig = BigInt(spendable || "0");
  const amountBig = BigInt(amount || "0");
  return (
    amountBig >= BigInt(XLM_MIN_ESCROW_STROOPS) &&
    spendBig >= amountBig
  );
}

export const NATIVE_XLM_RESERVE_ERROR =
  "Not enough spendable XLM. Stellar reserves 1 XLM minimum. Escrow at least 2 XLM.";

export async function preflightCreateEscrow(
  wallet: string,
  tokenId: string,
  amount: string,
  deadlineTs: number
): Promise<{ ok: boolean; error?: string }> {
  if (!wallet) return { ok: false, error: "Wallet authorization required" };
  const amountNum = BigInt(amount);
  if (amountNum < BigInt(CONTRACT_MIN_AMOUNT)) {
    return { ok: false, error: "Amount below minimum escrow value" };
  }
  const now = Math.floor(Date.now() / 1000);
  if (deadlineTs <= now) {
    return { ok: false, error: "Deadline must be in the future" };
  }
  if (isNativeXlm(tokenId)) {
    if (amountNum < BigInt(XLM_MIN_ESCROW_STROOPS)) {
      return { ok: false, error: `Native XLM escrow requires at least ${XLM_MIN_ESCROW_STROOPS / 10_000_000} XLM` };
    }
    const maxSpend = await getMaxSpendable(tokenId, wallet);
    if (amountNum > BigInt(maxSpend)) {
      return { ok: false, error: "Not enough spendable XLM. Stellar requires a minimum reserve." };
    }
  }
  return { ok: true };
}
