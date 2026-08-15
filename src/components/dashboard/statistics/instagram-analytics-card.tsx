import { getTranslations } from "next-intl/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { OAuthConnectButton } from "@/components/dashboard/integrations/oauth-connect-button";
import { isOAuthConfigured } from "@/lib/integrations/oauth/config";
import { archiveIntegrationAction } from "@/lib/integrations/detail-actions";
import type { InstagramCardData } from "@/lib/instagram/sync-stats";

export async function InstagramAnalyticsCard({ data, locale }: { data: InstagramCardData; locale: string }) {
  const t = await getTranslations("statistics.marketing.instagram");
  const formatNumber = (value: number) => new Intl.NumberFormat(locale).format(value);
  const configured = isOAuthConfigured("instagram");

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
              provider="instagram"
              configured={configured}
              locale={locale}
              returnPath="/statistics/marketing"
            />
          </div>
        ) : data.result.available ? (
          <div className="flex flex-col gap-4">
            <div>
              <p className="text-2xl font-bold">{formatNumber(data.result.followersCount)}</p>
              <p className="text-xs text-muted-foreground">
                {data.result.username ? `@${data.result.username}` : t("followers")}
              </p>
            </div>
            <ul className="text-sm divide-y divide-border">
              <li className="flex justify-between py-2">
                <span className="text-muted-foreground">{t("reach")}</span>
                <span className="font-medium">{formatNumber(data.result.reach)}</span>
              </li>
              <li className="flex justify-between py-2">
                <span className="text-muted-foreground">{t("profileViews")}</span>
                <span className="font-medium">{formatNumber(data.result.profileViews)}</span>
              </li>
              <li className="flex justify-between py-2">
                <span className="text-muted-foreground">{t("mediaCount")}</span>
                <span className="font-medium">{formatNumber(data.result.mediaCount)}</span>
              </li>
            </ul>
            <form action={archiveIntegrationAction.bind(null, data.integrationId, locale)}>
              <Button type="submit" size="sm" variant="outline" className="w-full">
                {t("disconnect")}
              </Button>
            </form>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-muted-foreground">
              {data.result.reason === "no_business_account" ? t("noBusinessAccount") : t("genericError")}
            </p>
            <OAuthConnectButton
              provider="instagram"
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
