import "server-only";
import { z } from "zod";

const knowledgeSettingsSchema = z.object({
  embeddingModel: z.string().trim().min(1).max(100),
  relevanceThreshold: z.coerce.number().min(0).max(1),
  maxResults: z.coerce.number().int().min(1).max(50),
  maxContextTokens: z.coerce.number().int().min(100).max(8000),
  aggregationStrategy: z.enum(["merge", "priority"]),
});

export type KnowledgeSettingsInput = z.infer<typeof knowledgeSettingsSchema>;

export function parseKnowledgeSettingsInput(
  input: unknown,
): { success: true; data: KnowledgeSettingsInput } | { success: false; error: string } {
  const result = knowledgeSettingsSchema.safeParse(input);
  if (!result.success) {
    return { success: false, error: result.error.issues[0]?.message ?? "Invalid input" };
  }
  return { success: true, data: result.data };
}
