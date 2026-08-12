import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { MarketingShell } from "@/components/marketing/marketing-shell";

// `not-found.tsx` receives no props (Next.js file convention), but it renders
// inside `[locale]/layout.tsx`, which has already called `setRequestLocale()`
// for this request — so the next-intl request scope is available here and
// `getTranslations()` resolves the correct locale without a params prop.
export default async function LocaleNotFound() {
  const t = await getTranslations("notFound");

  return (
    <MarketingShell>
      <section className="mx-auto max-w-lg px-6 py-24 text-center">
        <p className="text-sm font-medium tracking-widest text-muted-foreground">404</p>
        <h1 className="mt-4 text-3xl font-bold tracking-tight">{t("title")}</h1>
        <p className="mt-4 text-muted-foreground">{t("description")}</p>
        <Button
          className="mt-8 bg-brand text-brand-foreground hover:opacity-90"
          nativeButton={false}
          render={<Link href="/">{t("cta")}</Link>}
        />
      </section>
    </MarketingShell>
  );
}
