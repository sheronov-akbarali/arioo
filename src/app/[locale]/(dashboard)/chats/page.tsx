import { asc, desc, eq, inArray } from "drizzle-orm";
import { getTranslations } from "next-intl/server";
import { MessageSquare, ArrowRightLeft } from "lucide-react";
import { db } from "@/db/client";
import { conversations, messages } from "@/db/schema/conversations";
import { aiAgents } from "@/db/schema/agents";
import { requireOrganization } from "@/lib/auth/dal";
import { Link } from "@/i18n/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MessageBubble } from "@/components/dashboard/chat/message-bubble";
import { ChatsList, type ChatThread } from "@/components/dashboard/chats/chats-list";
import { ScrollToMessage } from "@/components/dashboard/chats/scroll-to-message";
import { handoffConversationAction } from "./actions";

export default async function ChatsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ conversation?: string; message?: string }>;
}) {
  const { locale } = await params;
  const { conversation: selectedId, message: targetMessageId } = await searchParams;
  const { organization } = await requireOrganization(locale);
  const t = await getTranslations("chats");
  const tAssistants = await getTranslations("assistants.chat");

  const [threads, allOrgAgents] = await Promise.all([
    db
      .select({ conversation: conversations, agentId: aiAgents.id, agentName: aiAgents.name })
      .from(conversations)
      .innerJoin(aiAgents, eq(conversations.agentId, aiAgents.id))
      .where(eq(aiAgents.organizationId, organization.id))
      .orderBy(desc(conversations.startedAt)),
    db
      .select({ id: aiAgents.id, name: aiAgents.name, role: aiAgents.role })
      .from(aiAgents)
      .where(eq(aiAgents.organizationId, organization.id)),
  ]);

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
      channel: row.conversation.channel,
      sentiment: row.conversation.sentiment as "positive" | "neutral" | "negative",
      lastMessagePreview: last?.content ?? t("noMessages"),
      timestampLabel: dtf.format(last?.createdAt ?? row.conversation.startedAt),
      isActive: active?.conversation.id === row.conversation.id,
    };
  });

  const otherAgents = allOrgAgents.filter((a) => a.id !== active?.agentId);

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
        <div className="grid gap-4 lg:grid-cols-[340px_1fr]">
          <ChatsList threads={threadItems} />

          <Card className="flex max-h-[70vh] flex-col gap-4 overflow-y-auto p-4">
            {active ? (
              <>
                <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{active.agentName}</p>
                      <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-muted">
                        {active.conversation.channel}
                      </span>
                      {active.conversation.sentiment && (
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            active.conversation.sentiment === "positive"
                              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                              : active.conversation.sentiment === "negative"
                                ? "bg-red-500/10 text-red-600 dark:text-red-400"
                                : "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                          }`}
                        >
                          {active.conversation.sentiment === "positive"
                            ? "😊 Ijobiy mijoz"
                            : active.conversation.sentiment === "negative"
                              ? "😡 Norozi mijoz"
                              : "😐 Neytral muloqot"}
                        </span>
                      )}
                    </div>
                    {active.conversation.externalChatId && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Chat ID: {active.conversation.externalChatId}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    {otherAgents.length > 0 && (
                      <form
                        action={handoffConversationAction.bind(null, locale, active.conversation.id)}
                        className="flex items-center gap-1.5"
                      >
                        <select
                          name="targetAgentId"
                          className="h-8 rounded-md border border-input bg-background px-2 text-xs"
                          defaultValue=""
                          required
                        >
                          <option value="" disabled>
                            Boshqa xodimga uzatish...
                          </option>
                          {otherAgents.map((a) => (
                            <option key={a.id} value={a.id}>
                              {a.name} ({a.role})
                            </option>
                          ))}
                        </select>
                        <Button type="submit" size="sm" variant="outline" className="h-8 text-xs gap-1">
                          <ArrowRightLeft className="size-3" /> Uzatish
                        </Button>
                      </form>
                    )}

                    <Link
                      href={`/assistants/${active.agentId}/chat`}
                      className="text-xs font-medium text-brand hover:underline shrink-0"
                    >
                      {t("continueInPlayground")}
                    </Link>
                  </div>
                </div>
                {targetMessageId && <ScrollToMessage targetId={targetMessageId} />}
                {activeMessages.map((message) => (
                  <MessageBubble
                    key={message.id}
                    id={message.id}
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
