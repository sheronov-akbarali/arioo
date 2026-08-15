import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

export function OAuthConnectButton({
  provider,
  configured,
  locale,
}: {
  provider: string;
  configured: boolean;
  locale: string;
}) {
  const t = useTranslations("integrations");

  if (!configured) {
    return (
      <Button size="sm" variant="outline" disabled>
        {t("setupNeeded")}
      </Button>
    );
  }

  return (
    <Button
      size="sm"
      variant="outline"
      render={<a href={`/api/integrations/${provider}/oauth/start?locale=${locale}`} />}
    >
      {t("connect")}
    </Button>
  );
}
