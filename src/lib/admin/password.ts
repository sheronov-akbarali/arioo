import "server-only";
import { scryptSync, timingSafeEqual, randomBytes } from "node:crypto";

const KEY_LENGTH = 64;

/** Format: "<hex salt>:<hex hash>" — used to generate ADMIN_PASSWORD_HASH once, offline. */
export function hashAdminPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, KEY_LENGTH).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyAdminPassword(password: string, storedHash: string): boolean {
  const [salt, hash] = storedHash.split(":");
  if (!salt || !hash) return false;

  const candidate = scryptSync(password, salt, KEY_LENGTH);
  const expected = Buffer.from(hash, "hex");
  if (candidate.length !== expected.length) return false;

  return timingSafeEqual(candidate, expected);
}
