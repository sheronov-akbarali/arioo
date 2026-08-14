import "server-only";
import { z } from "zod";
import { optionalEnum, optionalNumber, optionalText } from "./zod-helpers";

const stopWordRuleSchema = z.object({
  word: z.string().trim().min(1).max(100),
  action: z.enum(["block", "flag"]),
});

const chatSettingsSchema = z.object({
  description: optionalText(2000),
  greetingMessage: optionalText(2000),
  replyDelaySeconds: z.coerce.number().int().min(0).max(300),
  timezone: optionalText(100),
  voiceReaction: z.enum(["none", "reply_text", "reply_voice"]),
  textReaction: z.literal("reply_text"),
  ttsVoice: z.string().trim().min(1).max(50),
  ttsModel: z.string().trim().min(1).max(50),
  voiceReactionText: optionalText(100),
  limitsEnabled: z.coerce.boolean(),
  limitType: optionalEnum(["messages", "tokens", "workens"]),
  limitValue: optionalNumber(0, 1000000),
  limitMessage: optionalText(500),
  stopWordRules: z.array(stopWordRuleSchema).max(50),
  operatorTrigger: z.enum(["keep_going", "pause"]),
  pauseDurationMinutes: z.coerce.number().int().min(1).max(1440),
});

export type ChatSettingsInput = z.infer<typeof chatSettingsSchema>;

export function parseChatSettingsInput(
  input: unknown,
): { success: true; data: ChatSettingsInput } | { success: false; error: string } {
  const result = chatSettingsSchema.safeParse(input);
  if (!result.success) {
    return { success: false, error: result.error.issues[0]?.message ?? "Invalid input" };
  }
  return { success: true, data: result.data };
}
