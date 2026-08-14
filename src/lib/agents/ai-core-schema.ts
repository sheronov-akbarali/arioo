import "server-only";
import { z } from "zod";
import { optionalNumber, optionalText } from "./zod-helpers";

const aiCoreSettingsSchema = z.object({
  topP: optionalNumber(0, 1),
  temperature: optionalNumber(0, 2),
  maxTokens: optionalNumber(1, 100000),
  readOnlyMode: z.coerce.boolean(),
  recentMessagesCount: z.coerce.number().int().min(0).max(200),
  autoTitleGeneration: z.coerce.boolean(),
  semanticSearchEnabled: z.coerce.boolean(),
  memoryIsolation: z.enum(["user", "thread"]),
  memoryTemplateMode: z.enum(["freeform", "schema"]),
  memoryTemplate: optionalText(4000),
  removeEmojis: z.coerce.boolean(),
  removeMarkdown: z.coerce.boolean(),
  interruptionMode: z.enum(["queue", "abort_restart", "drop_restart"]),
  maxStepsWithoutTools: z.coerce.number().int().min(1).max(20),
  maxStepsWithTools: z.coerce.number().int().min(1).max(50),
});

export type AiCoreSettingsInput = z.infer<typeof aiCoreSettingsSchema>;

export function parseAiCoreSettingsInput(
  input: unknown,
): { success: true; data: AiCoreSettingsInput } | { success: false; error: string } {
  const result = aiCoreSettingsSchema.safeParse(input);
  if (!result.success) {
    return { success: false, error: result.error.issues[0]?.message ?? "Invalid input" };
  }
  return { success: true, data: result.data };
}
