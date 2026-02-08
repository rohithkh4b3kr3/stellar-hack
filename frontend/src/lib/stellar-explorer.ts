/** Stellar Expert explorer URLs (testnet). */
const TESTNET_BASE = "https://stellar.expert/explorer/testnet";

export function txUrl(hash: string): string {
  return `${TESTNET_BASE}/tx/${hash}`;
}
