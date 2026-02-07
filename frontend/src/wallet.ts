/**
 * Freighter wallet via @stellar/freighter-api (bundled - avoids tracking prevention).
 */
import { isConnected, requestAccess, getAddress } from "@stellar/freighter-api";

export async function isFreighterAvailable(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  try {
    const result = await isConnected();
    return !!(result && "isConnected" in result && result.isConnected);
  } catch {
    return false;
  }
}

/** Connect (request access) and return public key. */
export async function connectFreighter(): Promise<string> {
  const result = await requestAccess();
  if ("error" in result && result.error) {
    throw new Error(result.error);
  }
  return (result as { address: string }).address;
}

/** Get public key if already authorized. */
export async function getPublicKey(): Promise<string | null> {
  try {
    const result = await getAddress();
    if ("error" in result && result.error) return null;
    return (result as { address?: string }).address ?? null;
  } catch {
    return null;
  }
}
