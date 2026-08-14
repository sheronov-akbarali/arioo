"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { conversations, messages } from "@/db/schema/conversations";
import { aiAgents } from "@/db/schema/agents";
import { requireOrganization } from "@/lib/auth/dal";
import { createNotification } from "@/lib/notifications/actions";

export async function handoffConversationAction(
  locale: string,
  conversationId: string,
  formData: FormData
) {
  const { organization } = await requireOrganization(locale);
  const targetAgentId = formData.get("targetAgentId") as string;
  const reason = (formData.get("reason") as string) || "Operator tomonidan uzatildi";

  if (!targetAgentId) return;

  const [currentConv] = await db
    .select({
      conv: conversations,
      currentAgent: aiAgents,
    })
    .from(conversations)
    .innerJoin(aiAgents, eq(conversations.agentId, aiAgents.id))
    .where(
      and(
        eq(conversations.id, conversationId),
        eq(aiAgents.organizationId, organization.id)
      )
    );

  if (!currentConv) return;

  const [targetAgent] = await db
    .select()
    .from(aiAgents)
    .where(
      and(
        eq(aiAgents.id, targetAgentId),
        eq(aiAgents.organizationId, organization.id)
      )
    );

  if (!targetAgent) return;

  // 1. Update conversation agent
  await db
    .update(conversations)
    .set({
      agentId: targetAgentId,
      handoffFromAgentId: currentConv.currentAgent.id,
      handoffReason: reason,
    })
    .where(eq(conversations.id, conversationId));

  // 2. Insert system audit message
  await db.insert(messages).values({
    conversationId,
    role: "system",
    content: `[Xodim almashdi]: Suhbat "${currentConv.currentAgent.name}" dan "${targetAgent.name}" xodimiga uzatildi. Sabab: ${reason}`,
  });

  // 3. Trigger notification
  await createNotification(organization.id, {
    type: "chat",
    title: "Suhbat uzatildi",
    body: `Suhbat "${targetAgent.name}" assistentiga muvaffaqiyatli uzatildi.`,
    link: `/${locale}/chats?conversation=${conversationId}`,
  });

  revalidatePath(`/${locale}/chats`);
}
