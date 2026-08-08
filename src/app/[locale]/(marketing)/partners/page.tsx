import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PartnerStats } from "@/components/marketing/partner-stats";
import { PartnerSteps } from "@/components/marketing/partner-steps";
import { PartnerWhy } from "@/components/marketing/partner-why";
import { PartnerLevels } from "@/components/marketing/partner-levels";
import { LeadForm } from "@/components/marketing/lead-form";

export default function PartnersPage() {
  const t = useTranslations("partners");

  return (
    <>
      <section className="mx-auto max-w-6xl px-6 py-20">
        <Badge variant="outline" className="mb-6">
          {t("badge")}
        </Badge>
        <h1 className="max-w-2xl text-4xl font-bold tracking-tight">{t("title")}</h1>
        <p className="mt-4 max-w-xl text-muted-foreground">{t("subtitle")}</p>
        <Button
          size="lg"
          className="mt-8 bg-brand text-brand-foreground hover:opacity-90"
          nativeButton={false}
          render={<Link href="/sign-up">{t("cta")}</Link>}
        />
        <div className="mt-16">
          <PartnerStats />
        </div>
      </section>
      <PartnerSteps />
      <PartnerWhy />
      <PartnerLevels />
      <LeadForm
        title={t("leadForm.title")}
        subtitle={t("leadForm.subtitle")}
        submitLabel={t("leadForm.submit")}
      />
    </>
  );
}
