"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { agentCallPolicy } from "@/db/schema/agent-call-policy";
import { requireAgent } from "@/lib/auth/dal";
import { getOrCreateCallPolicy } from "@/lib/agents/settings";
import { parseCallPolicyInput } from "@/lib/agents/call-policy-schema";

export async function updateCallPolicyAction(
  locale: string,
  agentId: string,
  formData: FormData,
): Promise<void> {
  const { agent } = await requireAgent(locale, agentId);
  const existing = await getOrCreateCallPolicy(agent.id);

  const escalationTriggerWords = String(formData.get("escalationTriggerWords") ?? "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 50);

  const parsed = parseCallPolicyInput({
    enabled: formData.get("enabled"),
    direction: formData.get("direction"),
    windowTimezoneMode: formData.get("windowTimezoneMode"),
    windowStart: formData.get("windowStart"),
    windowEnd: formData.get("windowEnd"),
    offWindowBehavior: formData.get("offWindowBehavior"),
    requireExistingThread: formData.get("requireExistingThread"),
    respectDnc: formData.get("respectDnc"),
    maxAttempts: formData.get("maxAttempts"),
    attemptsPeriodDays: formData.get("attemptsPeriodDays"),
    recordingMode: formData.get("recordingMode"),
    disclosureScript: formData.get("disclosureScript"),
    maxDurationMinutes: formData.get("maxDurationMinutes"),
    maxParallelLines: formData.get("maxParallelLines"),
    sipIntegrationRef: formData.get("sipIntegrationRef"),
    outboundDid: formData.get("outboundDid"),
    lineInstruction: formData.get("lineInstruction"),
    callModel: formData.get("callModel"),
    callVoice: formData.get("callVoice"),
    defaultMode: formData.get("defaultMode"),
    maxActionsPerReply: formData.get("maxActionsPerReply"),
    confirmationMode: formData.get("confirmationMode"),
    saveSummaryToThread: formData.get("saveSummaryToThread"),
    syncCrm: formData.get("syncCrm"),
    escalationTarget: formData.get("escalationTarget"),
    escalationTriggerWords,
  });
  if (!parsed.success) return;

  await db
    .update(agentCallPolicy)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(eq(agentCallPolicy.id, existing.id));
  revalidatePath(`/${locale}/assistants/${agent.id}/calls`);
}
