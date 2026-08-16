import { afterEach, describe, it, expect, vi } from "vitest";

const dbSelectWhere = vi.fn().mockResolvedValue([{ id: "agent_1", name: "Sotuv Maslahatchi" }]);
const dbSelectFrom = vi.fn(() => ({ where: dbSelectWhere }));

vi.mock("@/db/client", () => ({
  db: {
    select: vi.fn(() => ({ from: dbSelectFrom })),
  },
}));

import { initiateOutboundCall } from "./sip-client";

describe("SIP / Voice Telephony Client", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("fails honestly (not a fake success) when no SIP provider is configured", async () => {
    vi.stubEnv("SIP_PROVIDER_URL", "");
    vi.stubEnv("SIP_PROVIDER_API_KEY", "");

    const result = await initiateOutboundCall({
      organizationId: "org_1",
      agentId: "agent_1",
      recipientPhone: "+998901234567",
      customerName: "Sardor",
    });

    expect(result.status).toBe("failed");
    expect(result.reason).toMatch(/SIP/);
    // Greeting is still generated (useful for retry/preview) even though no call was placed.
    expect(result.greetingText).toContain("Assalomu alaykum");
  });

  it("places a real call through the configured SIP provider and reports success", async () => {
    vi.stubEnv("SIP_PROVIDER_URL", "https://sip.example.com/calls");
    vi.stubEnv("SIP_PROVIDER_API_KEY", "test-key");
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) });
    vi.stubGlobal("fetch", fetchMock);

    const result = await initiateOutboundCall({
      organizationId: "org_1",
      agentId: "agent_1",
      recipientPhone: "+998901234567",
      customerName: "Sardor",
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "https://sip.example.com/calls",
      expect.objectContaining({ method: "POST" })
    );
    expect(result.callId).toContain("call_");
    expect(result.status).toBe("initiated");
    expect(result.greetingText).toContain("Assalomu alaykum");
    expect(result.greetingAudio?.audioBase64).toBeDefined();
  });

  it("reports failure with the provider's error when the SIP request is rejected", async () => {
    vi.stubEnv("SIP_PROVIDER_URL", "https://sip.example.com/calls");
    vi.stubEnv("SIP_PROVIDER_API_KEY", "test-key");
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, status: 402, text: async () => "Insufficient balance" });
    vi.stubGlobal("fetch", fetchMock);

    const result = await initiateOutboundCall({
      organizationId: "org_1",
      agentId: "agent_1",
      recipientPhone: "+998901234567",
    });

    expect(result.status).toBe("failed");
    expect(result.reason).toContain("402");
  });
});
