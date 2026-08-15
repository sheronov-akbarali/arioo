import { getTranslations } from "next-intl/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { OAuthConnectButton } from "@/components/dashboard/integrations/oauth-connect-button";
import { isOAuthConfigured } from "@/lib/integrations/oauth/config";
import { archiveIntegrationAction } from "@/lib/integrations/detail-actions";
import type { YoutubeCardData } from "@/lib/youtube/sync-stats";

export async function YoutubeAnalyticsCard({ data, locale }: { data: YoutubeCardData; locale: string }) {
  const t = await getTranslations("statistics.marketing.youtube");
  const formatNumber = (value: number) => new Intl.NumberFormat(locale).format(value);
  const configured = isOAuthConfigured("youtube");

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{t("title")}</CardTitle>
        <p className="text-xs text-muted-foreground">{t("subtitle")}</p>
      </CardHeader>
      <CardContent>
        {!data.connected ? (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-muted-foreground">{t("notConnected")}</p>
            <OAuthConnectButton
              provider="youtube"
              configured={configured}
              locale={locale}
              returnPath="/statistics/marketing"
            />
          </div>
        ) : data.result.available ? (
          <div className="flex flex-col gap-4">
            <div>
              <p className="text-2xl font-bold">{formatNumber(data.result.subscriberCount)}</p>
              <p className="text-xs text-muted-foreground">{t("subscribers")}</p>
            </div>
            <ul className="text-sm divide-y divide-border">
              <li className="flex justify-between py-2">
                <span className="text-muted-foreground">{t("views")}</span>
                <span className="font-medium">{formatNumber(data.result.viewCount)}</span>
              </li>
              <li className="flex justify-between py-2">
                <span className="text-muted-foreground">{t("videos")}</span>
                <span className="font-medium">{formatNumber(data.result.videoCount)}</span>
              </li>
            </ul>
            {data.result.recentVideos.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-medium text-muted-foreground">{t("recentVideos")}</p>
                <ul className="divide-y divide-border rounded-lg border border-border text-sm">
                  {data.result.recentVideos.map((video) => (
                    <li key={video.id} className="flex items-center justify-between gap-2 px-3 py-2">
                      <span className="truncate text-muted-foreground">{video.title}</span>
                      <span className="shrink-0 font-medium">
                        {formatNumber(video.viewCount)} {t("viewsShort")}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <form action={archiveIntegrationAction.bind(null, data.integrationId, locale)}>
              <Button type="submit" size="sm" variant="outline" className="w-full">
                {t("disconnect")}
              </Button>
            </form>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-muted-foreground">
              {data.result.reason === "quota_exceeded" ? t("quotaExceeded") : t("genericError")}
            </p>
            <OAuthConnectButton
              provider="youtube"
              configured={configured}
              locale={locale}
              returnPath="/statistics/marketing"
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
