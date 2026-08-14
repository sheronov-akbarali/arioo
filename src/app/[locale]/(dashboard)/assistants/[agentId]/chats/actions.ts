"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { agentChatSettings } from "@/db/schema/agent-chat-settings";
import { requireAgent } from "@/lib/auth/dal";
import { getOrCreateChatSettings } from "@/lib/agents/settings";
import { parseChatSettingsInput } from "@/lib/agents/chat-settings-schema";

export async function updateChatSettingsAction(
  locale: string,
  agentId: string,
  formData: FormData,
): Promise<void> {
  const { agent } = await requireAgent(locale, agentId);
  const existing = await getOrCreateChatSettings(agent.id);

  const stopWordRules = String(formData.get("stopWords") ?? "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 50)
    .map((word) => ({ word, action: "block" as const }));

  const parsed = parseChatSettingsInput({
    description: formData.get("description"),
    greetingMessage: formData.get("greetingMessage"),
    replyDelaySeconds: formData.get("replyDelaySeconds"),
    timezone: formData.get("timezone"),
    voiceReaction: formData.get("voiceReaction"),
    textReaction: formData.get("textReaction"),
    ttsVoice: formData.get("ttsVoice"),
    ttsModel: formData.get("ttsModel"),
    voiceReactionText: formData.get("voiceReactionText"),
    limitsEnabled: formData.get("limitsEnabled"),
    limitType: formData.get("limitType"),
    limitValue: formData.get("limitValue"),
    limitMessage: formData.get("limitMessage"),
    stopWordRules,
    operatorTrigger: formData.get("operatorTrigger"),
    pauseDurationMinutes: formData.get("pauseDurationMinutes"),
  });
  if (!parsed.success) return;

  await db
    .update(agentChatSettings)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(eq(agentChatSettings.id, existing.id));
  revalidatePath(`/${locale}/assistants/${agent.id}/chats`);
}
