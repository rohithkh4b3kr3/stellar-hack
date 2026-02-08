import crypto from "node:crypto";
import { Keypair } from "@stellar/stellar-sdk";

export function hashDeliverable(data: Buffer): Buffer {
  return crypto.createHash("sha256").update(data).digest();
}

export function hashToHex(data: Buffer): string {
  return data.toString("hex");
}

export function hexToBuffer(hex: string): Buffer {
  return Buffer.from(hex, "hex");
}

export function verifySignature(message: string, signatureBase64: string, publicKey: string): boolean {
  try {
    const keypair = Keypair.fromPublicKey(publicKey);
    const payload = Buffer.from(message, "utf8");
    const signature = Buffer.from(signatureBase64, "base64");
    return keypair.verify(payload, signature);
  } catch {
    return false;
  }
}

export function randomId(): string {
  return crypto.randomBytes(16).toString("hex");
}
