import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export function Hero() {
  const t = useTranslations("hero");

  return (
    <section className="mx-auto max-w-6xl px-6 py-20 text-center">
      <Badge variant="outline" className="mb-6">
        {t("badge")}
      </Badge>
      <h1 className="mx-auto max-w-3xl text-4xl font-bold tracking-tight sm:text-6xl">
        {t("title")}
      </h1>
      <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
        {t("subtitle")}
      </p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
        <Button
          size="lg"
          className="bg-brand text-brand-foreground hover:opacity-90"
          nativeButton={false}
          render={<Link href="/#lead-form">{t("ctaPrimary")}</Link>}
        />
        <Button
          size="lg"
          variant="outline"
          nativeButton={false}
          render={<Link href="/pricing">{t("ctaSecondary")}</Link>}
        />
      </div>
    </section>
  );
}
