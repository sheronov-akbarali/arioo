import { useTranslations } from "next-intl";
import { PricingTable } from "@/components/marketing/pricing-table";

export default function PricingPage() {
  const t = useTranslations("pricing");

  return (
    <section className="mx-auto max-w-6xl px-6 py-20">
      <div className="mx-auto max-w-2xl text-center">
        <h1 className="text-4xl font-bold tracking-tight">{t("title")}</h1>
        <p className="mt-4 text-muted-foreground">{t("subtitle")}</p>
      </div>
      <div className="mt-12">
        <PricingTable />
      </div>
    </section>
  );
}
