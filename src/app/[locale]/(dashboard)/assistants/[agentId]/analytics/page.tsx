import { notFound } from "next/navigation";
import { eq, sql, desc, and } from "drizzle-orm";
import {
  MessageSquare,
  Zap,
  DollarSign,
  Smile,
  Meh,
  Frown,
  HelpCircle,
  Clock,
  TrendingUp,
} from "lucide-react";
import { db } from "@/db/client";
import { aiAgents } from "@/db/schema/agents";
import { conversations, messages } from "@/db/schema/conversations";
import { requireOrganization } from "@/lib/auth/dal";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AgentTrendChart } from "@/components/dashboard/assistants/agent-trend-chart";
import {
  getAvgResponseSeconds,
  getConversionRate,
  getDailyCostTrend,
  getDailyRevenueTrend,
  getTopCustomerTopics,
} from "@/lib/analytics/agent-analytics";

export default async function AssistantAnalyticsPage({
  params,
}: {
  params: Promise<{ locale: string; agentId: string }>;
}) {
  const { locale, agentId } = await params;
  const { organization } = await requireOrganization(locale);

  const [agent] = await db
    .select()
    .from(aiAgents)
    .where(and(eq(aiAgents.id, agentId), eq(aiAgents.organizationId, organization.id)));

  if (!agent) notFound();

  // Fetch real conversation metrics for this agent
  const agentConversations = await db
    .select()
    .from(conversations)
    .where(eq(conversations.agentId, agentId))
    .orderBy(desc(conversations.startedAt));

  const totalConversations = agentConversations.length;

  // Sentiment counts
  const positiveCount = agentConversations.filter((c) => c.sentiment === "positive").length;
  const neutralCount = agentConversations.filter((c) => c.sentiment === "neutral" || !c.sentiment).length;
  const negativeCount = agentConversations.filter((c) => c.sentiment === "negative").length;

  // Total messages & token spend for this agent
  const messagesResult = await db
    .select({
      count: sql<number>`count(*)`,
      tokens: sql<number>`coalesce(sum(${messages.tokenCount}), 0)`,
      cost: sql<number>`coalesce(sum(${messages.estimatedCostUsd}), 0)`,
    })
    .from(messages)
    .innerJoin(conversations, eq(messages.conversationId, conversations.id))
    .where(eq(conversations.agentId, agentId));

  const totalMessages = Number(messagesResult[0]?.count || 0);
  const totalTokens = Number(messagesResult[0]?.tokens || 0);
  const totalCostUsd = Number(messagesResult[0]?.cost || 0);

  // Channels distribution
  const channelDistribution = agentConversations.reduce((acc, curr) => {
    acc[curr.channel] = (acc[curr.channel] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const [avgResponseSeconds, conversion, costTrend, revenueTrend, topTopics] = await Promise.all([
    getAvgResponseSeconds(agentId),
    getConversionRate(agentId, totalConversations),
    getDailyCostTrend(agentId),
    getDailyRevenueTrend(agentId),
    getTopCustomerTopics(agentId, agent.model),
  ]);

  return (
    <div className="flex flex-col gap-6">
      {/* Top Stat Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Jami Suhbatlar
            </CardTitle>
            <MessageSquare className="size-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalConversations}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Barcha kanallar bo'ylab ({totalMessages} ta xabar)
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              O'rtacha Javob Tezligi
            </CardTitle>
            <Zap className="size-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {avgResponseSeconds !== null ? `${avgResponseSeconds.toFixed(1)}s` : "—"}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {avgResponseSeconds !== null ? "Haqiqiy xabarlar asosida hisoblangan" : "Hali yetarli ma'lumot yo'q"}
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Konversiya (Yutilgan Bitimlar)
            </CardTitle>
            <Smile className="size-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{conversion.rate !== null ? `${conversion.rate}%` : "—"}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {conversion.wonDeals} ta CRM bitim yutildi
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Token Xarajati
            </CardTitle>
            <DollarSign className="size-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalCostUsd.toFixed(4)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {totalTokens.toLocaleString("uz-UZ")} token sarflandi
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Sentiment Analysis Card */}
        <Card className="shadow-xs">
          <CardHeader>
            <CardTitle className="text-base">Mijozlar Kayfiyati (Sentiment Tahlili)</CardTitle>
            <CardDescription>
              AI tomonidan har bir muloqot avtomatik ravishda tahlil qilinadi
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 text-emerald-600 font-medium">
                  <Smile className="size-4" /> Ijobiy (Positive)
                </span>
                <span className="font-bold">{positiveCount} ta</span>
              </div>
              <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full"
                  style={{ width: `${totalConversations > 0 ? (positiveCount / totalConversations) * 100 : 0}%` }}
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 text-blue-600 font-medium">
                  <Meh className="size-4" /> Neytral (Neutral)
                </span>
                <span className="font-bold">{neutralCount} ta</span>
              </div>
              <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 rounded-full"
                  style={{ width: `${totalConversations > 0 ? (neutralCount / totalConversations) * 100 : 0}%` }}
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 text-red-600 font-medium">
                  <Frown className="size-4" /> Salbiy (Negative)
                </span>
                <span className="font-bold">{negativeCount} ta</span>
              </div>
              <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-red-500 rounded-full"
                  style={{ width: `${totalConversations > 0 ? (negativeCount / totalConversations) * 100 : 0}%` }}
                />
              </div>
            </div>

            <div className="pt-2 border-t text-xs text-muted-foreground flex items-center gap-1.5">
              <Clock className="size-3.5 shrink-0" />
              Salbiy xabarlar avtomatik ravishda operatorga bildirishnoma sifatida yuboriladi
            </div>
          </CardContent>
        </Card>

        {/* Channels Distribution */}
        <Card className="shadow-xs">
          <CardHeader>
            <CardTitle className="text-base">Muloqot Kanallari Taqsimoti</CardTitle>
            <CardDescription>
              Ushbu AI xodim qaysi platformalarda eng ko'p ishlatilmoqda
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { key: "telegram", label: "Telegram Bot", count: channelDistribution["telegram"] || 0, badge: "Telegram" },
              { key: "whatsapp", label: "WhatsApp Business", count: channelDistribution["whatsapp"] || 0, badge: "WhatsApp" },
              { key: "widget", label: "Sayt Vidjeti", count: channelDistribution["widget"] || 0, badge: "Web Widget" },
              { key: "playground", label: "Test Playground", count: channelDistribution["playground"] || 0, badge: "Arioo" },
            ].map((ch) => (
              <div key={ch.key} className="flex items-center justify-between p-2.5 rounded-lg border bg-muted/30">
                <div className="flex items-center gap-2.5">
                  <Badge variant="outline">{ch.badge}</Badge>
                  <span className="text-sm font-medium">{ch.label}</span>
                </div>
                <span className="text-sm font-bold">{ch.count} ta suhbat</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Cost vs Revenue trend */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="shadow-xs">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <DollarSign className="size-4 text-purple-500" /> Kunlik Xarajat (14 kun)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <AgentTrendChart data={costTrend} unit="usd" color="var(--color-brand)" />
          </CardContent>
        </Card>
        <Card className="shadow-xs">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="size-4 text-emerald-500" /> Kunlik Daromad (14 kun, yutilgan bitimlar)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <AgentTrendChart data={revenueTrend} unit="uzs" color="#10b981" />
          </CardContent>
        </Card>
      </div>

      {/* Top Topics */}
      <Card className="shadow-xs">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <HelpCircle className="size-4 text-brand" /> Eng Ko'p Beriladigan Savollar (AI Klasterlash)
          </CardTitle>
          <CardDescription>
            So'nggi 150 ta mijoz xabari AI tomonidan mavzularga guruhlangan
          </CardDescription>
        </CardHeader>
        <CardContent>
          {topTopics.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">
              Klasterlash uchun hali yetarli suhbat tarixi yo'q
            </p>
          ) : (
            <div className="space-y-3">
              {topTopics.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 rounded-lg border bg-background hover:bg-muted/40 transition-colors">
                  <div className="flex items-center gap-3">
                    <span className="flex size-6 items-center justify-center rounded-full bg-brand/10 text-brand text-xs font-bold">
                      {idx + 1}
                    </span>
                    <span className="text-sm font-medium">{item.topic}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{item.percent}%</Badge>
                    <span className="text-xs text-muted-foreground">{item.count} marta</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
