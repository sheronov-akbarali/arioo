import "server-only";
import { and, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { conversations, messages } from "@/db/schema/conversations";
import { aiAgents } from "@/db/schema/agents";
import { createNotification } from "@/lib/notifications/actions";

export type HandoffResult =
  | { ok: true; fromAgentName: string; toAgentName: string }
  | { ok: false; error: string };

/**
 * Reassigns a conversation to a different agent, preserving message history.
 * Shared by the operator-triggered dashboard action and the AI's own
 * `handoffToAgent` tool (see src/lib/ai/tools.ts).
 */
export async function performHandoff(params: {
  organizationId: string;
  conversationId: string;
  targetAgentId: string;
  reason: string;
  notifyLocale?: string;
}): Promise<HandoffResult> {
  const { organizationId, conversationId, targetAgentId, reason } = params;

  const [currentConv] = await db
    .select({ conv: conversations, currentAgent: aiAgents })
    .from(conversations)
    .innerJoin(aiAgents, eq(conversations.agentId, aiAgents.id))
    .where(and(eq(conversations.id, conversationId), eq(aiAgents.organizationId, organizationId)));

  if (!currentConv) return { ok: false, error: "Suhbat topilmadi" };

  const [targetAgent] = await db
    .select()
    .from(aiAgents)
    .where(and(eq(aiAgents.id, targetAgentId), eq(aiAgents.organizationId, organizationId)));

  if (!targetAgent) return { ok: false, error: "Maqsadli agent topilmadi" };

  if (targetAgent.id === currentConv.currentAgent.id) {
    return { ok: false, error: "Suhbat allaqachon shu agentga tegishli" };
  }

  await db
    .update(conversations)
    .set({
      agentId: targetAgentId,
      handoffFromAgentId: currentConv.currentAgent.id,
      handoffReason: reason,
    })
    .where(eq(conversations.id, conversationId));

  await db.insert(messages).values({
    conversationId,
    role: "system",
    content: `[Xodim almashdi]: Suhbat "${currentConv.currentAgent.name}" dan "${targetAgent.name}" xodimiga uzatildi. Sabab: ${reason}`,
  });

  await createNotification(organizationId, {
    type: "chat",
    title: "Suhbat uzatildi",
    body: `Suhbat "${targetAgent.name}" assistentiga muvaffaqiyatli uzatildi. Sabab: ${reason}`,
    link: `/${params.notifyLocale || "uz"}/chats?conversation=${conversationId}`,
  });

  return { ok: true, fromAgentName: currentConv.currentAgent.name, toAgentName: targetAgent.name };
}
