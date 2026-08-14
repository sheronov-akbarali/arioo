import { and, eq, gte, isNotNull } from "drizzle-orm";
import { BarChart3 } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { db } from "@/db/client";
import { conversations, messages } from "@/db/schema/conversations";
import { aiAgents } from "@/db/schema/agents";
import { requireOrganization } from "@/lib/auth/dal";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SpendChart } from "@/components/dashboard/statistics/spend-chart";
import { ThreadsChart } from "@/components/dashboard/statistics/threads-chart";
import { ExportCsvButton } from "@/components/dashboard/statistics/export-csv-button";
import { ModelSpendBreakdown } from "@/components/dashboard/statistics/model-spend-breakdown";
import { StatisticsTabs } from "@/components/dashboard/statistics/statistics-tabs";
import { STATISTICS_RANGES as RANGES, parseStatisticsRange, statisticsWindow } from "@/lib/statistics/date-range";

function dayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export default async function StatisticsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ range?: string }>;
}) {
  const { locale } = await params;
  const { range: rawRange } = await searchParams;
  const { organization } = await requireOrganization(locale);
  const t = await getTranslations("statistics");

  const range = parseStatisticsRange(rawRange);
  const now = new Date();
  const { currentStart, currentEnd, previousStart } = statisticsWindow(range, now);
  const periodDays = Math.round((currentEnd.getTime() - currentStart.getTime()) / 86_400_000);

  const costRows = await db
    .select({
      costUsd: messages.estimatedCostUsd,
      createdAt: messages.createdAt,
      conversationId: messages.conversationId,
      model: aiAgents.model,
    })
    .from(messages)
    .innerJoin(conversations, eq(messages.conversationId, conversations.id))
    .innerJoin(aiAgents, eq(conversations.agentId, aiAgents.id))
    .where(
      and(
        eq(aiAgents.organizationId, organization.id),
        eq(messages.role, "assistant"),
        isNotNull(messages.estimatedCostUsd),
        gte(messages.createdAt, previousStart),
      ),
    );

  const threadRows = await db
    .select({ id: conversations.id, startedAt: conversations.startedAt })
    .from(conversations)
    .innerJoin(aiAgents, eq(conversations.agentId, aiAgents.id))
    .where(and(eq(aiAgents.organizationId, organization.id), gte(conversations.startedAt, previousStart)));

  const dailyCost = new Map<string, number>();
  const costByModel = new Map<string, number>();
  let currentTotal = 0;
  let previousTotal = 0;
  for (const row of costRows) {
    const cost = row.costUsd ?? 0;
    if (row.createdAt >= currentStart) {
      currentTotal += cost;
      const key = dayKey(row.createdAt);
      dailyCost.set(key, (dailyCost.get(key) ?? 0) + cost);
      costByModel.set(row.model, (costByModel.get(row.model) ?? 0) + cost);
    } else {
      previousTotal += cost;
    }
  }

  const dailyThreads = new Map<string, number>();
  for (const row of threadRows) {
    if (row.startedAt >= currentStart) {
      const key = dayKey(row.startedAt);
      dailyThreads.set(key, (dailyThreads.get(key) ?? 0) + 1);
    }
  }

  const dtf = new Intl.DateTimeFormat(locale === "en" ? "en-US" : locale === "ru" ? "ru-RU" : "uz-UZ", {
    day: "2-digit",
    month: "short",
  });

  const days: string[] = [];
  for (let d = new Date(currentStart); d < currentEnd; d = new Date(d.getTime() + 86_400_000)) {
    days.push(dayKey(d));
  }

  const spendSeries = days.map((date) => ({
    date,
    label: dtf.format(new Date(`${date}T00:00:00Z`)),
    costUsd: dailyCost.get(date) ?? 0,
  }));
  const threadsSeries = days.map((date) => ({
    date,
    label: dtf.format(new Date(`${date}T00:00:00Z`)),
    count: dailyThreads.get(date) ?? 0,
  }));
  const csvRows = days.map((date) => ({
    date,
    costUsd: dailyCost.get(date) ?? 0,
    threads: dailyThreads.get(date) ?? 0,
  }));

  const formatUsd = (value: number) => `$${value.toFixed(2)}`;

  const changeAbs = currentTotal - previousTotal;
  const changePct = previousTotal > 0 ? (changeAbs / previousTotal) * 100 : currentTotal > 0 ? 100 : 0;

  const daysInMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0)).getUTCDate();
  const daysLeftInMonth = daysInMonth - now.getUTCDate() + 1;
  const avgDailySpend = currentTotal / periodDays;
  const forecastTotal = avgDailySpend * daysLeftInMonth;

  const modelSpendRows = [...costByModel.entries()]
    .map(([model, costUsd]) => ({
      model,
      costUsd,
      percent: currentTotal > 0 ? (costUsd / currentTotal) * 100 : 0,
    }))
    .sort((a, b) => b.costUsd - a.costUsd);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand">
            <BarChart3 className="size-5" />
          </span>
          <div>
            <h1 className="text-xl font-semibold">{t("title")}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{t("subtitle")}</p>
          </div>
        </div>
        <ExportCsvButton rows={csvRows} label={t("export")} />
      </div>

      <StatisticsTabs />

      <div className="flex flex-wrap gap-2">
        {RANGES.map((r) => (
          <Button
            key={r}
            size="sm"
            variant={range === r ? "default" : "outline"}
            nativeButton={false}
            render={<Link href={`/statistics?range=${r}`}>{t(`range.${r}`)}</Link>}
          />
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">{t("cards.totalSpend")}</p>
            <p className="mt-1 text-2xl font-bold">{formatUsd(currentTotal)}</p>
            <p className="mt-1 text-xs text-muted-foreground">{t("cards.totalSpendHint")}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">{t("cards.assistantsSpend")}</p>
            <p className="mt-1 text-2xl font-bold">{formatUsd(currentTotal)}</p>
            <p className="mt-1 text-xs text-muted-foreground">{t("cards.assistantsSpendHint")}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">{t("cards.storageSpend")}</p>
            <p className="mt-1 text-2xl font-bold text-muted-foreground">—</p>
            <p className="mt-1 text-xs text-muted-foreground">{t("cards.notTracked")}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("dailySpendChart.title")}</CardTitle>
          <p className="text-sm text-muted-foreground">{t("dailySpendChart.subtitle")}</p>
        </CardHeader>
        <CardContent>
          <SpendChart data={spendSeries} />
        </CardContent>
      </Card>

      {modelSpendRows.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{t("modelSpend.title")}</CardTitle>
            <p className="text-sm text-muted-foreground">{t("modelSpend.subtitle")}</p>
          </CardHeader>
          <CardContent>
            <ModelSpendBreakdown rows={modelSpendRows} />
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t("comparison.title")}</CardTitle>
            <p className="text-sm text-muted-foreground">{t("comparison.subtitle")}</p>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{t("comparison.currentPeriod")}</span>
              <span className="font-medium">{formatUsd(currentTotal)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{t("comparison.previousPeriod")}</span>
              <span className="font-medium">{formatUsd(previousTotal)}</span>
            </div>
            <div className="flex items-center justify-between border-t border-border pt-3 text-sm">
              <span className="text-muted-foreground">{t("comparison.change")}</span>
              <span
                className={
                  changeAbs > 0 ? "font-medium text-red-600 dark:text-red-400" : "font-medium text-brand"
                }
              >
                {changeAbs >= 0 ? "+" : ""}
                {formatUsd(changeAbs)} ({changePct >= 0 ? "+" : ""}
                {changePct.toFixed(1)}%)
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("forecast.title")}</CardTitle>
            <p className="text-sm text-muted-foreground">{t("forecast.subtitle")}</p>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{t("forecast.avgDailySpend")}</span>
              <span className="font-medium">{formatUsd(avgDailySpend)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{t("forecast.daysLeft")}</span>
              <span className="font-medium">{daysLeftInMonth}</span>
            </div>
            <div className="flex items-center justify-between border-t border-border pt-3 text-sm">
              <span className="text-muted-foreground">{t("forecast.forecastTotal")}</span>
              <span className="font-medium text-brand">{formatUsd(forecastTotal)}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("threadsChart.title")}</CardTitle>
          <p className="text-sm text-muted-foreground">{t("threadsChart.subtitle")}</p>
        </CardHeader>
        <CardContent>
          <ThreadsChart data={threadsSeries} />
        </CardContent>
      </Card>
    </div>
  );
}
