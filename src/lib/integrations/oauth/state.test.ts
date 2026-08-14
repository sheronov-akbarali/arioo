import { describe, it, expect, beforeAll } from "vitest";
import { signOAuthState, verifyOAuthState } from "./state";

beforeAll(() => {
  process.env.OAUTH_STATE_SIGNING_SECRET = "test-secret-value-for-hmac-signing";
});

describe("OAuth state signing", () => {
  it("round-trips a signed payload", () => {
    const token = signOAuthState({ organizationId: "org_123", provider: "amocrm" });
    const verified = verifyOAuthState(token);
    expect(verified).toEqual({ organizationId: "org_123", provider: "amocrm" });
  });

  it("rejects a tampered token", () => {
    const token = signOAuthState({ organizationId: "org_123", provider: "amocrm" });
    const tampered = token.slice(0, -2) + "xx";
    expect(verifyOAuthState(tampered)).toBeNull();
  });

  it("rejects a malformed token", () => {
    expect(verifyOAuthState("not-a-valid-token")).toBeNull();
  });
});
