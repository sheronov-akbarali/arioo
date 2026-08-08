import { useTranslations } from "next-intl";
import { Hero } from "@/components/marketing/hero";
import { WorkZonesSection } from "@/components/marketing/work-zones-section";
import { PricingTable } from "@/components/marketing/pricing-table";
import { LeadForm } from "@/components/marketing/lead-form";

export default function HomePage() {
  const t = useTranslations("pricing");

  return (
    <>
      <Hero />
      <WorkZonesSection />
      <section className="mx-auto max-w-6xl px-6 py-20">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight">{t("title")}</h2>
          <p className="mt-4 text-muted-foreground">{t("subtitle")}</p>
        </div>
        <div className="mt-12">
          <PricingTable />
        </div>
      </section>
      <LeadForm />
    </>
  );
}
