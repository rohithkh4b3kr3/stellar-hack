/**
 * Freighter wallet: connect and get public key.
 * Contract invocations (deposit, approve, submit_milestone, etc.) are built
 * and signed via Freighter in the UI (see App and contract helpers).
 */
declare global {
  interface Window {
    freighter?: {
      isConnected: () => Promise<boolean>;
      getPublicKey: () => Promise<string>;
      connect: () => Promise<{ publicKey: string }>;
    };
  }
}

export async function isFreighterAvailable(): Promise<boolean> {
  if (typeof window === "undefined" || !window.freighter) return false;
  try {
    return await window.freighter.isConnected();
  } catch {
    return !!window.freighter;
  }
}

export async function connectFreighter(): Promise<string> {
  if (!window.freighter) throw new Error("Freighter not installed");
  const { publicKey } = await window.freighter.connect();
  return publicKey;
}

export async function getPublicKey(): Promise<string | null> {
  if (!window.freighter) return null;
  try {
    return await window.freighter.getPublicKey();
  } catch {
    return null;
  }
}
