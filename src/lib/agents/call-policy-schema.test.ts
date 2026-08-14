import { describe, expect, it } from "vitest";
import { parseCallPolicyInput } from "./call-policy-schema";

const VALID_INPUT = {
  enabled: null,
  direction: "off",
  windowTimezoneMode: "same_as_chat",
  windowStart: "10:00",
  windowEnd: "19:00",
  offWindowBehavior: "reject",
  requireExistingThread: "on",
  respectDnc: "on",
  maxAttempts: "3",
  attemptsPeriodDays: "7",
  recordingMode: "record_announce",
  disclosureScript: "",
  maxDurationMinutes: "20",
  maxParallelLines: "2",
  sipIntegrationRef: "",
  outboundDid: "",
  lineInstruction: "",
  callModel: "gpt-realtime",
  callVoice: "alloy",
  defaultMode: "supervised",
  maxActionsPerReply: "5",
  confirmationMode: "always",
  saveSummaryToThread: "on",
  syncCrm: null,
  escalationTarget: "",
  escalationTriggerWords: ["operator", "human"],
};

describe("parseCallPolicyInput", () => {
  it("accepts valid input", () => {
    const result = parseCallPolicyInput(VALID_INPUT);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.enabled).toBe(false);
      expect(result.data.escalationTriggerWords).toEqual(["operator", "human"]);
    }
  });

  it("rejects an unknown direction", () => {
    const result = parseCallPolicyInput({ ...VALID_INPUT, direction: "bogus" });
    expect(result.success).toBe(false);
  });

  it("rejects maxDurationMinutes above the cap", () => {
    const result = parseCallPolicyInput({ ...VALID_INPUT, maxDurationMinutes: "999" });
    expect(result.success).toBe(false);
  });
});
