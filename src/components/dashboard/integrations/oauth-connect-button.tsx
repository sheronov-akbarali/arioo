import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

export function OAuthConnectButton({
  provider,
  configured,
  locale,
  returnPath,
}: {
  provider: string;
  configured: boolean;
  locale: string;
  returnPath?: string;
}) {
  const t = useTranslations("integrations");

  if (!configured) {
    return (
      <Button size="sm" variant="outline" disabled>
        {t("setupNeeded")}
      </Button>
    );
  }

  const href = `/api/integrations/${provider}/oauth/start?locale=${locale}${
    returnPath ? `&returnPath=${encodeURIComponent(returnPath)}` : ""
  }`;

  return (
    <Button size="sm" variant="outline" render={<a href={href} />}>
      {t("connect")}
    </Button>
  );
}
