import { Megaphone } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { eq } from "drizzle-orm";
import { requireOrganization } from "@/lib/auth/dal";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatisticsTabs } from "@/components/dashboard/statistics/statistics-tabs";
import { STATISTICS_RANGES as RANGES, parseStatisticsRange, statisticsWindow } from "@/lib/statistics/date-range";
import { getRegisteredSite, getSiteAnalyticsData } from "@/lib/site-analytics/get-analytics";
import { registerSiteAnalyticsDomainAction } from "@/lib/site-analytics/site-actions";
import { SiteAnalyticsSnippet } from "@/components/dashboard/statistics/site-analytics-snippet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { db } from "@/db/client";
import { telegramChannelConnections } from "@/db/schema/telegram-channel-connection";
import { getTelegramChannelStats } from "@/lib/telegram/channel-stats";
import { disconnectTelegramChannel } from "@/lib/telegram/mtproto-actions";
import { OAuthResultToast } from "@/components/dashboard/integrations/oauth-result-toast";
import { syncYoutubeStats } from "@/lib/youtube/sync-stats";
import { YoutubeAnalyticsCard } from "@/components/dashboard/statistics/youtube-analytics-card";
import { syncInstagramStats } from "@/lib/instagram/sync-stats";
import { InstagramAnalyticsCard } from "@/components/dashboard/statistics/instagram-analytics-card";
import { syncFacebookStats } from "@/lib/facebook/sync-stats";
import { FacebookAnalyticsCard } from "@/components/dashboard/statistics/facebook-analytics-card";

export default async function MarketingStatisticsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{
    range?: string;
    oauthSuccess?: string;
    oauthError?: string;
    provider?: string;
    siteAnalyticsError?: string;
  }>;
}) {
  const { locale } = await params;
  const { range: rawRange, oauthSuccess, oauthError, provider, siteAnalyticsError } = await searchParams;
  const { organization } = await requireOrganization(locale);
  const t = await getTranslations("statistics");

  const range = parseStatisticsRange(rawRange);
  const { currentStart, currentEnd, previousStart } = statisticsWindow(range, new Date());
  const registeredSite = await getRegisteredSite(organization.id);
  const siteData = registeredSite
    ? await getSiteAnalyticsData(registeredSite.id, currentStart, currentEnd, previousStart)
    : null;

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

  const youtubeCard = await syncYoutubeStats(organization.id);
  const instagramCard = await syncInstagramStats(organization.id);
  const facebookCard = await syncFacebookStats(organization.id);

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

      <OAuthResultToast success={oauthSuccess} error={oauthError} provider={provider} />

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
          {!registeredSite ? (
            <div className="flex flex-col gap-3">
              <p className="text-sm text-muted-foreground">{t("marketing.site.notConnected")}</p>
              {siteAnalyticsError === "invalid_domain" && (
                <p role="alert" className="text-sm text-red-600 dark:text-red-400">
                  {t("marketing.site.invalidDomain")}
                </p>
              )}
              <form
                action={registerSiteAnalyticsDomainAction.bind(null, locale)}
                className="flex flex-col gap-2 sm:flex-row sm:items-end"
              >
                <div className="flex-1">
                  <Label htmlFor="domain">{t("marketing.site.domainLabel")}</Label>
                  <Input
                    id="domain"
                    name="domain"
                    placeholder={t("marketing.site.domainPlaceholder")}
                    required
                  />
                </div>
                <Button type="submit" className="w-fit">
                  {t("marketing.site.domainSubmit")}
                </Button>
              </form>
            </div>
          ) : (
            <div className="flex flex-col gap-6">
              <SiteAnalyticsSnippet trackingKey={registeredSite.trackingKey} />

              {!siteData?.hasAnyEventEver ? (
                <p className="text-sm text-muted-foreground">{t("marketing.site.waitingForFirstEvent")}</p>
              ) : (
                <>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Card>
                      <CardContent className="pt-6">
                        <p className="text-sm text-muted-foreground">{t("marketing.site.visitors")}</p>
                        <p className="mt-1 text-2xl font-bold">{formatNumber(siteData.totals.visitors)}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {changePct(siteData.totals.visitors, siteData.previousTotals.visitors) >= 0 ? "+" : ""}
                          {changePct(siteData.totals.visitors, siteData.previousTotals.visitors).toFixed(1)}%{" "}
                          {t("marketing.site.vsPreviousPeriod")}
                        </p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-6">
                        <p className="text-sm text-muted-foreground">{t("marketing.site.pageviews")}</p>
                        <p className="mt-1 text-2xl font-bold">{formatNumber(siteData.totals.pageviews)}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {changePct(siteData.totals.pageviews, siteData.previousTotals.pageviews) >= 0 ? "+" : ""}
                          {changePct(siteData.totals.pageviews, siteData.previousTotals.pageviews).toFixed(1)}%{" "}
                          {t("marketing.site.vsPreviousPeriod")}
                        </p>
                      </CardContent>
                    </Card>
                  </div>

                  <div className="grid gap-4 lg:grid-cols-2">
                    <div>
                      <h3 className="mb-2 text-sm font-medium">{t("marketing.site.topPages")}</h3>
                      {siteData.topPages.length === 0 ? (
                        <p className="text-sm text-muted-foreground">{t("marketing.empty")}</p>
                      ) : (
                        <ul className="divide-y divide-border rounded-lg border border-border">
                          {siteData.topPages.map((row) => (
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
                      {siteData.topReferrers.length === 0 ? (
                        <p className="text-sm text-muted-foreground">{t("marketing.empty")}</p>
                      ) : (
                        <ul className="divide-y divide-border rounded-lg border border-border">
                          {siteData.topReferrers.map((row) => (
                            <li key={row.key} className="flex items-center justify-between px-3 py-2 text-sm">
                              <span className="truncate text-muted-foreground">{row.key}</span>
                              <span className="font-medium">{formatNumber(row.visitors)}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                </>
              )}
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
            <div className="flex flex-col gap-2">
              <p className="text-sm text-muted-foreground">{t("marketing.telegram.connectElsewhere")}</p>
              <Button size="sm" variant="outline" className="w-fit" render={<Link href="/integrations" />}>
                {t("marketing.telegram.goToIntegrations")}
              </Button>
            </div>
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
            <YoutubeAnalyticsCard data={youtubeCard} locale={locale} />

            <InstagramAnalyticsCard data={instagramCard} locale={locale} />

            <FacebookAnalyticsCard data={facebookCard} locale={locale} />

            {/* OLX.uz: no confirmed public API for listing view/contact counts yet
                (see docs/superpowers/specs/2026-08-15-marketing-analytics-completion-design.md).
                Shown as unavailable rather than faking numbers until an API path is confirmed. */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">OLX.uz E'lonlari</CardTitle>
                <p className="text-xs text-muted-foreground">Ko'rishlar va Kontaktlar</p>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  OLX.uz hozircha e'lon statistikasi uchun ochiq API taqdim etmaydi, shuning uchun bu
                  bo'lim hali ulanmagan.
                </p>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
