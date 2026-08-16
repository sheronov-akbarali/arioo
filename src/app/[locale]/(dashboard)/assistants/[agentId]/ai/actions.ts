"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { aiAgents } from "@/db/schema/agents";
import { requireAgent } from "@/lib/auth/dal";
import { parseAgentInput } from "@/lib/agents/schema";
import { parseAiCoreSettingsInput } from "@/lib/agents/ai-core-schema";
import { AVAILABLE_TOOL_IDS, type ToolId } from "@/lib/ai/tools";

export async function updateAiTabAction(
  locale: string,
  agentId: string,
  formData: FormData,
): Promise<void> {
  const { agent } = await requireAgent(locale, agentId);

  const parsedBasic = parseAgentInput({
    name: formData.get("name"),
    role: formData.get("role"),
    systemPrompt: formData.get("systemPrompt"),
    model: formData.get("model"),
  });
  const parsedCore = parseAiCoreSettingsInput({
    topP: formData.get("topP"),
    temperature: formData.get("temperature"),
    maxTokens: formData.get("maxTokens"),
    readOnlyMode: formData.get("readOnlyMode"),
    recentMessagesCount: formData.get("recentMessagesCount"),
    autoTitleGeneration: formData.get("autoTitleGeneration"),
    semanticSearchEnabled: formData.get("semanticSearchEnabled"),
    memoryIsolation: formData.get("memoryIsolation"),
    memoryTemplateMode: formData.get("memoryTemplateMode"),
    memoryTemplate: formData.get("memoryTemplate"),
    removeEmojis: formData.get("removeEmojis"),
    removeMarkdown: formData.get("removeMarkdown"),
    interruptionMode: formData.get("interruptionMode"),
    maxStepsWithoutTools: formData.get("maxStepsWithoutTools"),
    maxStepsWithTools: formData.get("maxStepsWithTools"),
  });
  if (!parsedBasic.success || !parsedCore.success) return;

  await db
    .update(aiAgents)
    .set({ ...parsedBasic.data, ...parsedCore.data })
    .where(eq(aiAgents.id, agent.id));
  revalidatePath(`/${locale}/assistants/${agent.id}/ai`);
}

export async function updateEnabledToolsAction(
  locale: string,
  agentId: string,
  toolId: ToolId,
  enabled: boolean
): Promise<{ success: boolean }> {
  const { agent } = await requireAgent(locale, agentId);
  if (!AVAILABLE_TOOL_IDS.includes(toolId)) return { success: false };

  const current = new Set(agent.enabledToolIds ?? []);
  if (enabled) current.add(toolId);
  else current.delete(toolId);

  await db.update(aiAgents).set({ enabledToolIds: Array.from(current) }).where(eq(aiAgents.id, agent.id));
  revalidatePath(`/${locale}/assistants/${agent.id}/ai`);
  return { success: true };
}
