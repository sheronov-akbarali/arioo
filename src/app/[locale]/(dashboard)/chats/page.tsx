import { asc, desc, eq, inArray } from "drizzle-orm";
import { getTranslations } from "next-intl/server";
import { MessageSquare } from "lucide-react";
import { db } from "@/db/client";
import { conversations, messages } from "@/db/schema/conversations";
import { aiAgents } from "@/db/schema/agents";
import { requireOrganization } from "@/lib/auth/dal";
import { Link } from "@/i18n/navigation";
import { Card } from "@/components/ui/card";
import { MessageBubble } from "@/components/dashboard/chat/message-bubble";
import { ChatsList, type ChatThread } from "@/components/dashboard/chats/chats-list";

export default async function ChatsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ conversation?: string }>;
}) {
  const { locale } = await params;
  const { conversation: selectedId } = await searchParams;
  const { organization } = await requireOrganization(locale);
  const t = await getTranslations("chats");
  const tAssistants = await getTranslations("assistants.chat");

  const threads = await db
    .select({ conversation: conversations, agentId: aiAgents.id, agentName: aiAgents.name })
    .from(conversations)
    .innerJoin(aiAgents, eq(conversations.agentId, aiAgents.id))
    .where(eq(aiAgents.organizationId, organization.id))
    .orderBy(desc(conversations.startedAt));

  const threadIds = threads.map((row) => row.conversation.id);
  const lastMessageByThread = new Map<string, { content: string; createdAt: Date }>();
  if (threadIds.length > 0) {
    const allMessages = await db
      .select({ conversationId: messages.conversationId, content: messages.content, createdAt: messages.createdAt })
      .from(messages)
      .where(inArray(messages.conversationId, threadIds))
      .orderBy(desc(messages.createdAt));
    for (const msg of allMessages) {
      if (!lastMessageByThread.has(msg.conversationId)) {
        lastMessageByThread.set(msg.conversationId, { content: msg.content, createdAt: msg.createdAt });
      }
    }
  }

  const sortedThreads = [...threads].sort((a, b) => {
    const aTime = lastMessageByThread.get(a.conversation.id)?.createdAt ?? a.conversation.startedAt;
    const bTime = lastMessageByThread.get(b.conversation.id)?.createdAt ?? b.conversation.startedAt;
    return bTime.getTime() - aTime.getTime();
  });

  const active = sortedThreads.find((row) => row.conversation.id === selectedId) ?? sortedThreads[0];

  const activeMessages = active
    ? await db
        .select()
        .from(messages)
        .where(eq(messages.conversationId, active.conversation.id))
        .orderBy(asc(messages.createdAt))
    : [];

  const dtf = new Intl.DateTimeFormat(locale === "en" ? "en-US" : locale === "ru" ? "ru-RU" : "uz-UZ", {
    dateStyle: "short",
    timeStyle: "short",
  });

  const threadItems: ChatThread[] = sortedThreads.map((row) => {
    const last = lastMessageByThread.get(row.conversation.id);
    return {
      id: row.conversation.id,
      agentName: row.agentName,
      lastMessagePreview: last?.content ?? t("noMessages"),
      timestampLabel: dtf.format(last?.createdAt ?? row.conversation.startedAt),
      isActive: active?.conversation.id === row.conversation.id,
    };
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold">{t("title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("subtitle")}</p>
      </div>

      {sortedThreads.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border py-16 text-center">
          <span className="flex size-12 items-center justify-center rounded-full bg-brand/10 text-brand">
            <MessageSquare className="size-6" />
          </span>
          <div>
            <p className="font-medium">{t("empty")}</p>
            <p className="text-sm text-muted-foreground">{t("emptyHint")}</p>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
          <ChatsList threads={threadItems} />

          <Card className="flex max-h-[70vh] flex-col gap-4 overflow-y-auto p-4">
            {active ? (
              <>
                <div className="flex items-center justify-between">
                  <p className="font-medium">{active.agentName}</p>
                  <Link
                    href={`/assistants/${active.agentId}/chat`}
                    className="text-xs font-medium text-brand hover:underline"
                  >
                    {t("continueInPlayground")}
                  </Link>
                </div>
                {activeMessages.map((message) => (
                  <MessageBubble
                    key={message.id}
                    role={message.role}
                    label={
                      message.role === "user"
                        ? tAssistants("you")
                        : message.role === "assistant"
                          ? tAssistants("assistant")
                          : t("system")
                    }
                    content={message.content}
                  />
                ))}
              </>
            ) : null}
          </Card>
        </div>
      )}
    </div>
  );
}
