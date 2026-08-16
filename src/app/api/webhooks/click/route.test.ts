import { createHash } from "crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
import { isValidClickSignature } from "./route";

function sign(parts: string[]) {
  return createHash("md5").update(parts.join("")).digest("hex");
}

describe("isValidClickSignature", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("rejects when CLICK_SECRET_KEY is not configured", () => {
    vi.stubEnv("CLICK_SECRET_KEY", "");
    expect(
      isValidClickSignature({
        clickTransId: "1",
        merchantTransId: "org_1",
        amount: "1000",
        action: "0",
        signTime: "2026-01-01",
        signString: "anything",
      })
    ).toBe(false);
  });

  it("accepts a correctly computed prepare (action=0) signature", () => {
    vi.stubEnv("CLICK_SECRET_KEY", "shared-secret");
    vi.stubEnv("CLICK_SERVICE_ID", "12345");

    const signString = sign(["1", "12345", "shared-secret", "org_1", "1000", "0", "2026-01-01"]);

    expect(
      isValidClickSignature({
        clickTransId: "1",
        merchantTransId: "org_1",
        amount: "1000",
        action: "0",
        signTime: "2026-01-01",
        signString,
      })
    ).toBe(true);
  });

  it("accepts a correctly computed complete (action=1) signature including merchant_prepare_id", () => {
    vi.stubEnv("CLICK_SECRET_KEY", "shared-secret");
    vi.stubEnv("CLICK_SERVICE_ID", "12345");

    const signString = sign(["1", "12345", "shared-secret", "org_1", "1", "1000", "1", "2026-01-01"]);

    expect(
      isValidClickSignature({
        clickTransId: "1",
        merchantTransId: "org_1",
        amount: "1000",
        action: "1",
        signTime: "2026-01-01",
        signString,
        merchantPrepareId: "1",
      })
    ).toBe(true);
  });

  it("rejects a tampered amount", () => {
    vi.stubEnv("CLICK_SECRET_KEY", "shared-secret");
    vi.stubEnv("CLICK_SERVICE_ID", "12345");

    const signString = sign(["1", "12345", "shared-secret", "org_1", "1000", "0", "2026-01-01"]);

    expect(
      isValidClickSignature({
        clickTransId: "1",
        merchantTransId: "org_1",
        amount: "999999",
        action: "0",
        signTime: "2026-01-01",
        signString,
      })
    ).toBe(false);
  });
});
