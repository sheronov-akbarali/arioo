"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { aiAgents } from "@/db/schema/agents";
import { requireAgent } from "@/lib/auth/dal";
import { parseAgentInput } from "@/lib/agents/schema";

export async function updateAgentAction(
  locale: string,
  agentId: string,
  formData: FormData,
): Promise<void> {
  const { agent } = await requireAgent(locale, agentId);
  const parsed = parseAgentInput({
    name: formData.get("name"),
    role: formData.get("role"),
    systemPrompt: formData.get("systemPrompt"),
    model: formData.get("model"),
  });
  if (!parsed.success) return;

  await db.update(aiAgents).set(parsed.data).where(eq(aiAgents.id, agent.id));
  revalidatePath(`/${locale}/assistants/${agent.id}`);
}
