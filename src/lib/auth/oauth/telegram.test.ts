import { createHash, createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { isTelegramAuthFresh, verifyTelegramAuth } from "./telegram";

const BOT_TOKEN = "test-bot-token";

function signPayload(data: Record<string, string>) {
  const checkString = Object.keys(data)
    .filter((key) => key !== "hash")
    .sort()
    .map((key) => `${key}=${data[key]}`)
    .join("\n");
  const secretKey = createHash("sha256").update(BOT_TOKEN).digest();
  const hash = createHmac("sha256", secretKey).update(checkString).digest("hex");
  return { ...data, hash };
}

describe("verifyTelegramAuth", () => {
  it("accepts a correctly signed payload", () => {
    const data = signPayload({
      id: "123456",
      first_name: "Akbarali",
      auth_date: String(Math.floor(Date.now() / 1000)),
    });
    expect(verifyTelegramAuth(data, BOT_TOKEN)).toBe(true);
  });

  it("rejects a payload with a tampered field", () => {
    const data = signPayload({
      id: "123456",
      first_name: "Akbarali",
      auth_date: String(Math.floor(Date.now() / 1000)),
    });
    const tampered = { ...data, first_name: "Someone Else" };
    expect(verifyTelegramAuth(tampered, BOT_TOKEN)).toBe(false);
  });

  it("rejects a payload signed with a different bot token", () => {
    const data = signPayload({ id: "1", auth_date: "1700000000" });
    expect(verifyTelegramAuth(data, "different-token")).toBe(false);
  });
});

describe("isTelegramAuthFresh", () => {
  it("accepts an auth_date within the max age window", () => {
    const nowSeconds = Math.floor(Date.now() / 1000);
    expect(isTelegramAuthFresh({ auth_date: String(nowSeconds - 10) } as never, 86400)).toBe(true);
  });

  it("rejects an auth_date older than the max age window", () => {
    const nowSeconds = Math.floor(Date.now() / 1000);
    expect(isTelegramAuthFresh({ auth_date: String(nowSeconds - 90000) } as never, 86400)).toBe(
      false,
    );
  });
});
