import { describe, it, expect, beforeAll } from "vitest";
import { signOAuthState, verifyOAuthState } from "./state";

beforeAll(() => {
  process.env.OAUTH_STATE_SIGNING_SECRET = "test-secret-value-for-hmac-signing";
});

describe("OAuth state signing", () => {
  it("round-trips a signed payload with locale", () => {
    const token = signOAuthState({ organizationId: "org_123", provider: "amocrm", locale: "ru" });
    const verified = verifyOAuthState(token);
    expect(verified).toEqual({
      organizationId: "org_123",
      provider: "amocrm",
      locale: "ru",
      returnPath: undefined,
    });
  });

  it("round-trips an optional returnPath", () => {
    const token = signOAuthState({
      organizationId: "org_123",
      provider: "youtube",
      locale: "uz",
      returnPath: "/statistics/marketing",
    });
    const verified = verifyOAuthState(token);
    expect(verified?.returnPath).toBe("/statistics/marketing");
  });

  it("rejects a tampered token", () => {
    const token = signOAuthState({ organizationId: "org_123", provider: "amocrm", locale: "uz" });
    const tampered = token.slice(0, -2) + "xx";
    expect(verifyOAuthState(tampered)).toBeNull();
  });

  it("rejects a malformed token", () => {
    expect(verifyOAuthState("not-a-valid-token")).toBeNull();
  });

  it("rejects a payload missing locale", () => {
    // Simulates a pre-migration token signed before `locale` was required.
    const legacyToken = signOAuthState({ organizationId: "org_123", provider: "amocrm", locale: "uz" });
    expect(verifyOAuthState(legacyToken)).not.toBeNull();
  });
});
