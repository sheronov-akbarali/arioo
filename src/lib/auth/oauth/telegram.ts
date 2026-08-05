import "server-only";
import { createHash, createHmac, timingSafeEqual } from "node:crypto";

export type TelegramAuthData = {
  id: string;
  first_name?: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date: string;
  hash: string;
};

export function verifyTelegramAuth(data: TelegramAuthData, botToken: string): boolean {
  const { hash, ...rest } = data;
  const checkString = Object.keys(rest)
    .sort()
    .map((key) => `${key}=${(rest as Record<string, string>)[key]}`)
    .join("\n");

  const secretKey = createHash("sha256").update(botToken).digest();
  const expectedHash = createHmac("sha256", secretKey).update(checkString).digest("hex");

  const expected = Buffer.from(expectedHash, "hex");
  const actual = Buffer.from(hash, "hex");
  if (expected.length !== actual.length) return false;
  return timingSafeEqual(expected, actual);
}

export function isTelegramAuthFresh(
  data: Pick<TelegramAuthData, "auth_date">,
  maxAgeSeconds: number,
): boolean {
  const nowSeconds = Math.floor(Date.now() / 1000);
  const authDateSeconds = Number(data.auth_date);
  return nowSeconds - authDateSeconds <= maxAgeSeconds;
}
