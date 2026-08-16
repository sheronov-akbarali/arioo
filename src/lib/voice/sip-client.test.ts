import { describe, it, expect, vi } from "vitest";

const dbSelectLimit = vi.fn().mockResolvedValue([]);
const dbSelectWhere = vi.fn().mockResolvedValue([{ id: "agent_1", name: "Sotuv Maslahatchi" }]);
const dbSelectFrom = vi.fn(() => ({ where: dbSelectWhere }));

vi.mock("@/db/client", () => ({
  db: {
    select: vi.fn(() => ({ from: dbSelectFrom })),
  },
}));

import { initiateOutboundCall } from "./sip-client";

describe("SIP / Voice Telephony Client", () => {
  it("initiates call session and generates greeting audio", async () => {
    const result = await initiateOutboundCall({
      organizationId: "org_1",
      agentId: "agent_1",
      recipientPhone: "+998901234567",
      customerName: "Sardor",
    });

    expect(result).toBeDefined();
    expect(result.callId).toContain("call_");
    expect(result.status).toBe("initiated");
    expect(result.greetingText).toContain("Assalomu alaykum");
    expect(result.greetingAudio?.audioBase64).toBeDefined();
  });
});
