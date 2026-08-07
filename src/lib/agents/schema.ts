import "server-only";
import { z } from "zod";

export const AGENT_ROLES = ["sales", "support", "hr", "marketing"] as const;

const agentSchema = z.object({
  name: z.string().trim().min(2).max(100),
  role: z.enum(AGENT_ROLES),
  systemPrompt: z.string().trim().min(10).max(4000),
  model: z.string().trim().min(1),
});

export type AgentInput = z.infer<typeof agentSchema>;

export function parseAgentInput(
  input: unknown,
): { success: true; data: AgentInput } | { success: false; error: string } {
  const result = agentSchema.safeParse(input);
  if (!result.success) {
    return { success: false, error: result.error.issues[0]?.message ?? "Invalid input" };
  }
  return { success: true, data: result.data };
}
