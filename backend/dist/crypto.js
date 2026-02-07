import crypto from "node:crypto";
import { Keypair } from "@stellar/stellar-sdk";
/**
 * SHA-256 hash of deliverable bytes. Used for milestone and final delivery.
 */
export function hashDeliverable(data) {
    return crypto.createHash("sha256").update(data).digest();
}
export function hashToHex(data) {
    return data.toString("hex");
}
export function hexToBuffer(hex) {
    return Buffer.from(hex, "hex");
}
/**
 * Verify that message was signed by the given Stellar public key (G...).
 * Message is typically a payload (e.g. projectId + timestamp) that the client signed with Freighter.
 */
export function verifySignature(message, signatureBase64, publicKey) {
    try {
        const keypair = Keypair.fromPublicKey(publicKey);
        const payload = Buffer.from(message, "utf8");
        const signature = Buffer.from(signatureBase64, "base64");
        return keypair.verify(payload, signature);
    }
    catch {
        return false;
    }
}
export function randomId() {
    return crypto.randomBytes(16).toString("hex");
}
