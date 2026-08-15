import { describe, it, expect } from "vitest";
import { testIntegrationConnection } from "./test-connection";

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
});
