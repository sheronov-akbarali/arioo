import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;

function getKey(): Buffer {
  const envKey =
    process.env.INTEGRATION_TOKEN_ENCRYPTION_KEY ||
    process.env.OAUTH_STATE_SIGNING_SECRET ||
    "arioo-default-secret-key-32bytes!";

  // Agar base64 formatda berilgan bo'lsa
  try {
    const buf = Buffer.from(envKey, "base64");
    if (buf.length === 32) return buf;
  } catch {
    // fallback to utf8
  }

  // Agar to'g'ridan-to'g'ri string berilgan bo'lsa, 32 baytga keltiramiz
  const buf = Buffer.from(envKey, "utf8");
  if (buf.length === 32) return buf;
  if (buf.length > 32) return buf.subarray(0, 32);
  return Buffer.concat([buf, Buffer.alloc(32 - buf.length, 0)]);
}

export function encryptToken(plaintext: string): string {
  const key = getKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);

  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return `${iv.toString("base64")}:${authTag.toString("base64")}:${encrypted.toString("base64")}`;
}

export function decryptToken(ciphertext: string): string {
  const parts = ciphertext.split(":");
  if (parts.length !== 3) {
    throw new Error("Invalid encrypted token format");
  }

  const [ivBase64, authTagBase64, encryptedBase64] = parts;
  const key = getKey();
  const iv = Buffer.from(ivBase64, "base64");
  const authTag = Buffer.from(authTagBase64, "base64");
  const encrypted = Buffer.from(encryptedBase64, "base64");

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ]);

  return decrypted.toString("utf8");
}
