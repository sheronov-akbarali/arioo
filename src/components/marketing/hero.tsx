import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AgentFlowPanel } from "./agent-flow-panel";

export function Hero() {
  const t = useTranslations("hero");

  return (
    <section className="mx-auto grid max-w-6xl gap-12 px-6 py-20 lg:grid-cols-2 lg:items-center lg:py-28">
      <div>
        <Badge variant="outline" className="mb-6">
          {t("badge")}
        </Badge>
        <h1 className="max-w-xl bg-gradient-to-br from-foreground to-brand bg-clip-text text-4xl leading-[1.05] font-bold tracking-tight text-transparent sm:text-6xl">
          {t("title")}
        </h1>
        <p className="mt-6 max-w-lg text-lg text-muted-foreground">{t("subtitle")}</p>
        <div className="mt-8 flex flex-wrap items-center gap-4">
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
      </div>
      <AgentFlowPanel />
    </section>
  );
}
