import { describe, it, expect, vi, afterEach } from "vitest";
import { testIntegrationConnection } from "./test-connection";
import { encryptCredential } from "./credential-crypto";

process.env.INTEGRATION_CREDENTIALS_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString("base64");

describe("testIntegrationConnection", () => {
  it("returns ok:false with a clear error when credentials are missing", async () => {
    const result = await testIntegrationConnection("amocrm", {
      credentialsEncrypted: null,
      config: null,
      linkedChannelId: null,
    });
    expect(result.ok).toBe(false);
    expect(result.error).toBeTruthy();
  });

  it("returns ok:false for a provider with no test implemented", async () => {
    const result = await testIntegrationConnection("unknown_provider", {
      credentialsEncrypted: "fake",
      config: null,
      linkedChannelId: null,
    });
    expect(result.ok).toBe(false);
  });

  describe("github", () => {
    afterEach(() => vi.unstubAllGlobals());

    it("actually calls GitHub's API instead of trusting the stored credential blindly", async () => {
      const fetchMock = vi.fn().mockResolvedValue({ ok: true });
      vi.stubGlobal("fetch", fetchMock);

      const result = await testIntegrationConnection("github", {
        credentialsEncrypted: encryptCredential(JSON.stringify({ accessToken: "gho_valid" })),
        config: null,
        linkedChannelId: null,
      });

      expect(result.ok).toBe(true);
      expect(fetchMock).toHaveBeenCalledWith(
        "https://api.github.com/user",
        expect.objectContaining({ headers: { Authorization: "Bearer gho_valid" } })
      );
    });

    it("reports a real failure when the stored token is rejected by GitHub", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 401 }));

      const result = await testIntegrationConnection("github", {
        credentialsEncrypted: encryptCredential(JSON.stringify({ accessToken: "gho_revoked" })),
        config: null,
        linkedChannelId: null,
      });

      expect(result.ok).toBe(false);
      expect(result.error).toBeTruthy();
    });
  });
});
