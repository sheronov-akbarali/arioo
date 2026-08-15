import "server-only";
import { createHash } from "node:crypto";

function getSalt(): string {
  const salt = process.env.SITE_ANALYTICS_SALT;
  if (!salt) throw new Error("SITE_ANALYTICS_SALT is not set");
  return salt;
}

/**
 * A privacy-safe "unique visitor" identifier: never stores the raw IP, and
 * rotates daily (via the date in the hash input) so the same visitor can't
 * be tracked across days from this hash alone.
 */
export function hashVisitor(ip: string, userAgent: string, date: Date = new Date()): string {
  const day = date.toISOString().slice(0, 10);
  return createHash("sha256").update(`${getSalt()}:${day}:${ip}:${userAgent}`).digest("hex");
}
