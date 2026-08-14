import { Megaphone } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { eq } from "drizzle-orm";
import { requireOrganization } from "@/lib/auth/dal";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatisticsTabs } from "@/components/dashboard/statistics/statistics-tabs";
import { STATISTICS_RANGES as RANGES, parseStatisticsRange, statisticsWindow } from "@/lib/statistics/date-range";
import { getSiteAnalytics } from "@/lib/analytics/web-analytics";
import { db } from "@/db/client";
import { telegramChannelConnections } from "@/db/schema/telegram-channel-connection";
import { getTelegramChannelStats } from "@/lib/telegram/channel-stats";
import { TelegramConnectForm } from "@/components/dashboard/statistics/telegram-connect-form";
import {
  startTelegramConnection,
  submitTelegramCode,
  submitTelegramPassword,
  disconnectTelegramChannel,
} from "@/lib/telegram/mtproto-actions";
import { MockConnectButton } from "@/components/dashboard/statistics/mock-connect-button";

export default async function MarketingStatisticsPage({
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
  const { currentStart, currentEnd, previousStart } = statisticsWindow(range, new Date());
  const site = await getSiteAnalytics(currentStart, currentEnd, previousStart);

  const [telegramConnection] = await db
    .select()
    .from(telegramChannelConnections)
    .where(eq(telegramChannelConnections.organizationId, organization.id));

  const telegramStats =
    telegramConnection?.status === "connected" && telegramConnection.sessionSecretEncrypted
      ? await getTelegramChannelStats({
          channelUsername: telegramConnection.channelUsername,
          sessionSecretEncrypted: telegramConnection.sessionSecretEncrypted,
        })
      : null;

  const formatNumber = (value: number) => new Intl.NumberFormat(locale).format(value);
  const changePct = (current: number, previous: number) =>
    previous > 0 ? ((current - previous) / previous) * 100 : current > 0 ? 100 : 0;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand">
            <Megaphone className="size-5" />
          </span>
          <div>
            <h1 className="text-xl font-semibold">{t("title")}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{t("marketing.subtitle")}</p>
          </div>
        </div>
      </div>

      <StatisticsTabs />

      <div className="flex flex-wrap gap-2">
        {RANGES.map((r) => (
          <Button
            key={r}
            size="sm"
            variant={range === r ? "default" : "outline"}
            nativeButton={false}
            render={<Link href={`/statistics/marketing?range=${r}`}>{t(`range.${r}`)}</Link>}
          />
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("marketing.site.title")}</CardTitle>
          <p className="text-sm text-muted-foreground">{t("marketing.site.subtitle")}</p>
        </CardHeader>
        <CardContent>
          {site === null ? (
            <p className="text-sm text-muted-foreground">{t("marketing.site.notConnected")}</p>
          ) : (
            <div className="flex flex-col gap-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-sm text-muted-foreground">{t("marketing.site.visitors")}</p>
                    <p className="mt-1 text-2xl font-bold">{formatNumber(site.totals.visitors)}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {changePct(site.totals.visitors, site.previousTotals.visitors) >= 0 ? "+" : ""}
                      {changePct(site.totals.visitors, site.previousTotals.visitors).toFixed(1)}%{" "}
                      {t("marketing.site.vsPreviousPeriod")}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-sm text-muted-foreground">{t("marketing.site.pageviews")}</p>
                    <p className="mt-1 text-2xl font-bold">{formatNumber(site.totals.pageviews)}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {changePct(site.totals.pageviews, site.previousTotals.pageviews) >= 0 ? "+" : ""}
                      {changePct(site.totals.pageviews, site.previousTotals.pageviews).toFixed(1)}%{" "}
                      {t("marketing.site.vsPreviousPeriod")}
                    </p>
                  </CardContent>
                </Card>
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                <div>
                  <h3 className="mb-2 text-sm font-medium">{t("marketing.site.topPages")}</h3>
                  {site.topPages.length === 0 ? (
                    <p className="text-sm text-muted-foreground">{t("marketing.empty")}</p>
                  ) : (
                    <ul className="divide-y divide-border rounded-lg border border-border">
                      {site.topPages.map((row) => (
                        <li key={row.key} className="flex items-center justify-between px-3 py-2 text-sm">
                          <span className="truncate text-muted-foreground">{row.key}</span>
                          <span className="font-medium">{formatNumber(row.visitors)}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div>
                  <h3 className="mb-2 text-sm font-medium">{t("marketing.site.topReferrers")}</h3>
                  {site.topReferrers.length === 0 ? (
                    <p className="text-sm text-muted-foreground">{t("marketing.empty")}</p>
                  ) : (
                    <ul className="divide-y divide-border rounded-lg border border-border">
                      {site.topReferrers.map((row) => (
                        <li key={row.key} className="flex items-center justify-between px-3 py-2 text-sm">
                          <span className="truncate text-muted-foreground">{row.key}</span>
                          <span className="font-medium">{formatNumber(row.visitors)}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("marketing.telegram.title")}</CardTitle>
          <p className="text-sm text-muted-foreground">{t("marketing.telegram.subtitle")}</p>
        </CardHeader>
        <CardContent>
          {telegramConnection?.status === "connected" ? (
            telegramStats?.available ? (
              <div className="flex flex-col gap-3">
                <p className="text-sm">
                  {t("marketing.telegram.members")}:{" "}
                  <span className="font-medium">{formatNumber(telegramStats.memberCount)}</span>
                </p>
                <ul className="divide-y divide-border rounded-lg border border-border">
                  {telegramStats.recentPosts.map((post) => (
                    <li key={post.id} className="flex items-center justify-between px-3 py-2 text-sm">
                      <span className="text-muted-foreground">#{post.id}</span>
                      <span className="font-medium">
                        {formatNumber(post.views)} {t("marketing.telegram.views")}
                      </span>
                    </li>
                  ))}
                </ul>
                <form action={disconnectTelegramChannel.bind(null, locale)}>
                  <Button type="submit" size="sm" variant="outline" className="w-fit">
                    {t("marketing.telegram.disconnect")}
                  </Button>
                </form>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <p className="text-sm text-muted-foreground">
                  {telegramStats?.reason === "unknown"
                    ? t("marketing.telegram.genericError")
                    : t("marketing.telegram.notEnoughSubscribers")}
                </p>
                <form action={disconnectTelegramChannel.bind(null, locale)}>
                  <Button type="submit" size="sm" variant="outline" className="w-fit">
                    {t("marketing.telegram.disconnect")}
                  </Button>
                </form>
              </div>
            )
          ) : (
            <TelegramConnectForm
              startAction={startTelegramConnection.bind(null, locale)}
              submitCodeAction={submitTelegramCode.bind(null, locale)}
              submitPasswordAction={submitTelegramPassword.bind(null, locale)}
            />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("marketing.channels.title")}</CardTitle>
          <p className="text-sm text-muted-foreground">{t("marketing.channels.subtitle")}</p>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {/* YouTube Analytics Mock */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">YouTube Analytics</CardTitle>
                <p className="text-xs text-muted-foreground">Obunachilar va ko'rishlar</p>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col gap-4">
                  <div>
                    <p className="text-2xl font-bold">12,450</p>
                    <p className="text-xs text-green-600">+450 bu oy</p>
                  </div>
                  <ul className="text-sm divide-y divide-border">
                    <li className="flex justify-between py-2"><span className="text-muted-foreground">Ko'rishlar</span> <span className="font-medium">1.2M</span></li>
                    <li className="flex justify-between py-2"><span className="text-muted-foreground">Watch time</span> <span className="font-medium">45K soat</span></li>
                  </ul>
                  <MockConnectButton />
                </div>
              </CardContent>
            </Card>

            {/* Instagram Insights Mock */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Instagram Insights</CardTitle>
                <p className="text-xs text-muted-foreground">Followers va Reach</p>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col gap-4">
                  <div>
                    <p className="text-2xl font-bold">45,200</p>
                    <p className="text-xs text-green-600">+1.2K bu oy</p>
                  </div>
                  <ul className="text-sm divide-y divide-border">
                    <li className="flex justify-between py-2"><span className="text-muted-foreground">Profile ziyarati</span> <span className="font-medium">8.5K</span></li>
                    <li className="flex justify-between py-2"><span className="text-muted-foreground">Reach</span> <span className="font-medium">120K</span></li>
                  </ul>
                  <MockConnectButton />
                </div>
              </CardContent>
            </Card>

            {/* OLX Mock */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">OLX.uz E'lonlari</CardTitle>
                <p className="text-xs text-muted-foreground">Ko'rishlar va Kontaktlar</p>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col gap-4">
                  <div>
                    <p className="text-2xl font-bold">4,120</p>
                    <p className="text-xs text-green-600">Umumiy ko'rishlar</p>
                  </div>
                  <ul className="text-sm divide-y divide-border">
                    <li className="flex justify-between py-2"><span className="text-muted-foreground">Raqamni ko'rganlar</span> <span className="font-medium">320</span></li>
                    <li className="flex justify-between py-2"><span className="text-muted-foreground">Xabarlar</span> <span className="font-medium">85</span></li>
                  </ul>
                  <MockConnectButton />
                </div>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
