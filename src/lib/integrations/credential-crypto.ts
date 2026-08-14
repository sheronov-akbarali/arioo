import "server-only";
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

function getKey(): Buffer {
  const raw = process.env.INTEGRATION_CREDENTIALS_ENCRYPTION_KEY;
  if (!raw) throw new Error("INTEGRATION_CREDENTIALS_ENCRYPTION_KEY is not set");
  const key = Buffer.from(raw, "base64");
  if (key.length !== 32) {
    throw new Error("INTEGRATION_CREDENTIALS_ENCRYPTION_KEY must decode to exactly 32 bytes");
  }
  return key;
}

export function encryptCredential(plaintext: string): string {
  const key = getKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return Buffer.concat([iv, authTag, encrypted]).toString("base64");
}

export function decryptCredential(ciphertext: string): string {
  const key = getKey();
  const raw = Buffer.from(ciphertext, "base64");
  const iv = raw.subarray(0, 12);
  const authTag = raw.subarray(12, 28);
  const encrypted = raw.subarray(28);
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
}
