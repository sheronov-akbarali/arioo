"use client";

import { useTranslations } from "next-intl";

export function OAuthResultToast({
  success,
  error,
  provider,
}: {
  success?: string;
  error?: string;
  provider?: string;
}) {
  const t = useTranslations("integrations.oauthResult");

  if (success) {
    return (
      <p className="rounded-md bg-green-500/10 px-3 py-2 text-sm text-green-700 dark:text-green-400">
        {t("success", { provider: success })}
      </p>
    );
  }
  if (error) {
    return (
      <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
        {error === "not_configured"
          ? t("notConfigured", { provider: provider ?? "" })
          : t("failed", { provider: provider ?? "" })}
      </p>
    );
  }
  return null;
}
