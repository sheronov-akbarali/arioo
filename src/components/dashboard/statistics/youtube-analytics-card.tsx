import { getTranslations } from "next-intl/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { disconnectYoutubeChannel } from "@/lib/youtube/actions";
import type { YoutubeStatsResult } from "@/lib/youtube/channel-stats";
import type { YoutubeChannelConnection } from "@/db/schema/youtube-channel-connection";

function YoutubeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
    </svg>
  );
}

export async function YoutubeAnalyticsCard({
  connection,
  stats,
  locale,
  isOAuthConfigured,
}: {
  connection: YoutubeChannelConnection | null;
  stats: YoutubeStatsResult | null;
  locale: string;
  isOAuthConfigured: boolean;
}) {
  const t = await getTranslations("statistics.marketing.youtube");
  const formatNumber = (val: number) => new Intl.NumberFormat(locale).format(val);

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex size-7 items-center justify-center rounded bg-red-600/10 text-red-600">
              <YoutubeIcon className="size-4" />
            </span>
            <div>
              <CardTitle className="text-base">{t("title")}</CardTitle>
              <p className="text-xs text-muted-foreground">
                {connection?.channelTitle ? connection.channelTitle : t("subtitle")}
              </p>
            </div>
          </div>
          {connection?.status === "connected" && (
            <span className="rounded-full bg-green-500/15 px-2 py-0.5 text-xs font-medium text-green-700 dark:text-green-400">
              {t("connected")}
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {connection?.status === "connected" ? (
          stats?.available ? (
            <div className="flex flex-col gap-4">
              <div>
                <p className="text-2xl font-bold">{formatNumber(stats.subscriberCount)}</p>
                <p className="text-xs text-muted-foreground">{t("subscribers")}</p>
              </div>
              <ul className="text-sm divide-y divide-border">
                <li className="flex justify-between py-2">
                  <span className="text-muted-foreground">{t("views")}</span>
                  <span className="font-medium">{formatNumber(stats.viewCount)}</span>
                </li>
                <li className="flex justify-between py-2">
                  <span className="text-muted-foreground">{t("videos")}</span>
                  <span className="font-medium">{formatNumber(stats.videoCount)}</span>
                </li>
              </ul>

              {stats.recentVideos.length > 0 && (
                <div>
                  <p className="mb-2 text-xs font-medium text-muted-foreground uppercase">{t("recentVideos")}</p>
                  <ul className="divide-y divide-border rounded border border-border text-xs">
                    {stats.recentVideos.map((video) => (
                      <li key={video.id} className="flex items-center justify-between p-2">
                        <span className="truncate pr-2">{video.title}</span>
                        <span className="shrink-0 font-medium text-muted-foreground">
                          {formatNumber(video.views)} {t("viewsShort")}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <form action={disconnectYoutubeChannel.bind(null, locale)}>
                <Button type="submit" size="sm" variant="outline" className="w-fit text-destructive hover:bg-destructive/10">
                  {t("disconnect")}
                </Button>
              </form>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <p className="text-sm text-destructive">
                {stats?.reason === "quota_exceeded" ? t("quotaExceeded") : t("genericError")}
              </p>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" render={<a href={`/api/oauth/youtube/start?locale=${locale}`} />}>
                  {t("reconnect")}
                </Button>
                <form action={disconnectYoutubeChannel.bind(null, locale)}>
                  <Button type="submit" size="sm" variant="ghost" className="text-destructive">
                    {t("disconnect")}
                  </Button>
                </form>
              </div>
            </div>
          )
        ) : (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-muted-foreground">{t("notConnected")}</p>
            {isOAuthConfigured ? (
              <Button size="sm" variant="outline" className="w-fit gap-2" render={<a href={`/api/oauth/youtube/start?locale=${locale}`} />}>
                <YoutubeIcon className="size-4 text-red-600" /> {t("connect")}
              </Button>
            ) : (
              <Button size="sm" variant="outline" disabled className="w-fit">
                {t("setupNeeded")}
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
