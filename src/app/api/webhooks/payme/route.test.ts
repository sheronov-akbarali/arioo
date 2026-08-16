import { afterEach, describe, expect, it, vi } from "vitest";
import { isAuthorizedPaymeRequest } from "./route";

describe("isAuthorizedPaymeRequest", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("rejects requests when PAYME_MERCHANT_KEY is not configured", () => {
    vi.stubEnv("PAYME_MERCHANT_KEY", "");
    const req = new Request("https://example.com", {
      headers: { authorization: `Basic ${Buffer.from("Paycom:anything").toString("base64")}` },
    });
    expect(isAuthorizedPaymeRequest(req)).toBe(false);
  });

  it("rejects requests with a missing or wrong Authorization header", () => {
    vi.stubEnv("PAYME_MERCHANT_KEY", "secret-key");
    expect(isAuthorizedPaymeRequest(new Request("https://example.com"))).toBe(false);

    const wrongReq = new Request("https://example.com", {
      headers: { authorization: `Basic ${Buffer.from("Paycom:wrong-key").toString("base64")}` },
    });
    expect(isAuthorizedPaymeRequest(wrongReq)).toBe(false);
  });

  it("accepts a request with the correct Basic auth credentials", () => {
    vi.stubEnv("PAYME_MERCHANT_KEY", "secret-key");
    const req = new Request("https://example.com", {
      headers: { authorization: `Basic ${Buffer.from("Paycom:secret-key").toString("base64")}` },
    });
    expect(isAuthorizedPaymeRequest(req)).toBe(true);
  });
});
