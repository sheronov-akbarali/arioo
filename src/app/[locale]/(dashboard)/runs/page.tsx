import { desc, eq, inArray, and } from "drizzle-orm";
import { getTranslations } from "next-intl/server";
import { Activity } from "lucide-react";
import { db } from "@/db/client";
import { conversations, messages } from "@/db/schema/conversations";
import { aiAgents } from "@/db/schema/agents";
import { requireOrganization } from "@/lib/auth/dal";
import { Link } from "@/i18n/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default async function RunsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ agentId?: string }>;
}) {
  const { locale } = await params;
  const { agentId } = await searchParams;
  const { organization } = await requireOrganization(locale);
  const t = await getTranslations("runs");

  const orgAgents = await db
    .select({ id: aiAgents.id, name: aiAgents.name })
    .from(aiAgents)
    .where(eq(aiAgents.organizationId, organization.id));

  const threads = await db
    .select({ conversation: conversations, agentId: aiAgents.id, agentName: aiAgents.name })
    .from(conversations)
    .innerJoin(aiAgents, eq(conversations.agentId, aiAgents.id))
    .where(
      and(
        eq(aiAgents.organizationId, organization.id),
        agentId ? eq(aiAgents.id, agentId) : undefined,
      ),
    )
    .orderBy(desc(conversations.startedAt));

  const threadIds = threads.map((row) => row.conversation.id);
  const stats = new Map<string, { count: number; costUsd: number; lastActivity: Date }>();
  if (threadIds.length > 0) {
    const allMessages = await db
      .select({
        conversationId: messages.conversationId,
        estimatedCostUsd: messages.estimatedCostUsd,
        createdAt: messages.createdAt,
      })
      .from(messages)
      .where(inArray(messages.conversationId, threadIds));
    for (const msg of allMessages) {
      const existing = stats.get(msg.conversationId) ?? { count: 0, costUsd: 0, lastActivity: msg.createdAt };
      existing.count += 1;
      existing.costUsd += msg.estimatedCostUsd ?? 0;
      if (msg.createdAt > existing.lastActivity) existing.lastActivity = msg.createdAt;
      stats.set(msg.conversationId, existing);
    }
  }

  const dtf = new Intl.DateTimeFormat(locale === "en" ? "en-US" : locale === "ru" ? "ru-RU" : "uz-UZ", {
    dateStyle: "short",
    timeStyle: "short",
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand">
          <Activity className="size-5" />
        </span>
        <div>
          <h1 className="text-xl font-semibold">{t("title")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>
      </div>

      {orgAgents.length > 1 && (
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant={!agentId ? "default" : "outline"}
            nativeButton={false}
            render={<Link href="/runs">{t("agentFilters.all")}</Link>}
          />
          {orgAgents.map((agent) => (
            <Button
              key={agent.id}
              size="sm"
              variant={agentId === agent.id ? "default" : "outline"}
              nativeButton={false}
              render={<Link href={`/runs?agentId=${agent.id}`}>{agent.name}</Link>}
            />
          ))}
        </div>
      )}

      {threads.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border py-16 text-center">
          <span className="flex size-12 items-center justify-center rounded-full bg-brand/10 text-brand">
            <Activity className="size-6" />
          </span>
          <div>
            <p className="font-medium">{t("empty")}</p>
            <p className="text-sm text-muted-foreground">{t("emptyHint")}</p>
          </div>
        </div>
      ) : (
        <Card className="p-0">
          <CardContent className="overflow-x-auto p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                  <th className="px-4 py-3 font-medium">{t("agent")}</th>
                  <th className="px-4 py-3 font-medium">{t("started")}</th>
                  <th className="px-4 py-3 font-medium">{t("lastActivity")}</th>
                  <th className="px-4 py-3 text-right font-medium">{t("messages")}</th>
                  <th className="px-4 py-3 text-right font-medium">{t("cost")}</th>
                </tr>
              </thead>
              <tbody>
                {threads.map((row) => {
                  const stat = stats.get(row.conversation.id);
                  return (
                    <tr key={row.conversation.id} className="border-b border-border last:border-0">
                      <td className="px-4 py-3">
                        <Link
                          href={`/chats?conversation=${row.conversation.id}`}
                          className="font-medium text-brand hover:underline"
                        >
                          {row.agentName}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{dtf.format(row.conversation.startedAt)}</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {stat ? dtf.format(stat.lastActivity) : "—"}
                      </td>
                      <td className="px-4 py-3 text-right">{stat?.count ?? 0}</td>
                      <td className="px-4 py-3 text-right">${(stat?.costUsd ?? 0).toFixed(4)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
