import { getTranslations } from "next-intl/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { OAuthConnectButton } from "@/components/dashboard/integrations/oauth-connect-button";
import { isOAuthConfigured } from "@/lib/integrations/oauth/config";
import { archiveIntegrationAction } from "@/lib/integrations/detail-actions";
import type { FacebookCardData } from "@/lib/facebook/sync-stats";

export async function FacebookAnalyticsCard({ data, locale }: { data: FacebookCardData; locale: string }) {
  const t = await getTranslations("statistics.marketing.facebook");
  const formatNumber = (value: number) => new Intl.NumberFormat(locale).format(value);
  const configured = isOAuthConfigured("facebook");

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
              provider="facebook"
              configured={configured}
              locale={locale}
              returnPath="/statistics/marketing"
            />
          </div>
        ) : data.result.available ? (
          <div className="flex flex-col gap-4">
            <div>
              <p className="text-2xl font-bold">{formatNumber(data.result.fanCount)}</p>
              <p className="text-xs text-muted-foreground">{data.result.pageName || t("fans")}</p>
            </div>
            <ul className="text-sm divide-y divide-border">
              <li className="flex justify-between py-2">
                <span className="text-muted-foreground">{t("impressions")}</span>
                <span className="font-medium">{formatNumber(data.result.impressions)}</span>
              </li>
              <li className="flex justify-between py-2">
                <span className="text-muted-foreground">{t("engagedUsers")}</span>
                <span className="font-medium">{formatNumber(data.result.engagedUsers)}</span>
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
              {data.result.reason === "no_page" ? t("noPage") : t("genericError")}
            </p>
            <OAuthConnectButton
              provider="facebook"
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
