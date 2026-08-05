import { Button } from "@/components/ui/button";
import { useTranslations } from "next-intl";

export function ProviderButtons() {
  const t = useTranslations("auth.signIn");
  return (
    <div className="flex flex-col gap-3">
      {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- full page navigation to an API redirect route, not a Next page */}
      <Button size="lg" render={<a href="/api/auth/google/start" />}>
        {t("google")}
      </Button>
      <Button
        size="lg"
        variant="secondary"
        // eslint-disable-next-line @next/next/no-html-link-for-pages -- full page navigation to an API redirect route, not a Next page
        render={<a href="/api/auth/github/start" />}
      >
        {t("github")}
      </Button>
    </div>
  );
}
