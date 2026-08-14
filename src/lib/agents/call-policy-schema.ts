import "server-only";
import { z } from "zod";
import { optionalNumber, optionalText } from "./zod-helpers";

const callPolicySchema = z.object({
  enabled: z.coerce.boolean(),
  direction: z.enum(["inbound", "outbound", "both", "off"]),
  windowTimezoneMode: z.enum(["same_as_chat", "custom"]),
  windowStart: optionalText(5),
  windowEnd: optionalText(5),
  offWindowBehavior: z.enum(["reject", "voicemail_task"]),
  requireExistingThread: z.coerce.boolean(),
  respectDnc: z.coerce.boolean(),
  maxAttempts: optionalNumber(1, 100),
  attemptsPeriodDays: optionalNumber(1, 365),
  recordingMode: z.enum(["off", "record", "record_announce"]),
  disclosureScript: optionalText(1000),
  maxDurationMinutes: z.coerce.number().int().min(1).max(180),
  maxParallelLines: z.coerce.number().int().min(1).max(20),
  sipIntegrationRef: optionalText(200),
  outboundDid: optionalText(30),
  lineInstruction: optionalText(2000),
  callModel: z.string().trim().min(1).max(100),
  callVoice: z.string().trim().min(1).max(50),
  defaultMode: z.enum(["supervised", "autonomous"]),
  maxActionsPerReply: z.coerce.number().int().min(1).max(50),
  confirmationMode: z.enum(["always", "per_tool", "read_only"]),
  saveSummaryToThread: z.coerce.boolean(),
  syncCrm: z.coerce.boolean(),
  escalationTarget: optionalText(200),
  escalationTriggerWords: z.array(z.string().trim().min(1).max(50)).max(50),
});

export type CallPolicyInput = z.infer<typeof callPolicySchema>;

export function parseCallPolicyInput(
  input: unknown,
): { success: true; data: CallPolicyInput } | { success: false; error: string } {
  const result = callPolicySchema.safeParse(input);
  if (!result.success) {
    return { success: false, error: result.error.issues[0]?.message ?? "Invalid input" };
  }
  return { success: true, data: result.data };
}
