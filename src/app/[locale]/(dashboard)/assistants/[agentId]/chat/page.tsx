import { desc, eq, sum } from "drizzle-orm";
import { getTranslations } from "next-intl/server";
import { db } from "@/db/client";
import { conversations, messages as messagesTable } from "@/db/schema/conversations";
import { requireAgent } from "@/lib/auth/dal";
import { PlaygroundChat } from "@/components/dashboard/playground-chat";

export default async function AssistantChatPage({
  params,
}: {
  params: Promise<{ locale: string; agentId: string }>;
}) {
  const { locale, agentId } = await params;
  const { agent } = await requireAgent(locale, agentId);
  const t = await getTranslations("assistants.chat");

  let [conversation] = await db
    .select()
    .from(conversations)
    .where(eq(conversations.agentId, agent.id))
    .orderBy(desc(conversations.startedAt))
    .limit(1);

  if (!conversation) {
    [conversation] = await db.insert(conversations).values({ agentId: agent.id }).returning();
  }

  const [costRow] = await db
    .select({
      totalTokens: sum(messagesTable.tokenCount),
      totalCost: sum(messagesTable.estimatedCostUsd),
    })
    .from(messagesTable)
    .where(eq(messagesTable.conversationId, conversation!.id));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">{t("title", { name: agent.name })}</h1>
        <p className="text-muted-foreground text-sm">
          {t("cost", {
            tokens: costRow?.totalTokens ?? "0",
            cost: costRow?.totalCost ? Number(costRow.totalCost).toFixed(4) : "0",
          })}
        </p>
      </div>
      <PlaygroundChat agentId={agent.id} conversationId={conversation!.id} />
    </div>
  );
}
