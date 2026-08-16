import { getTranslations } from "next-intl/server";
import { PricingTable } from "@/components/marketing/pricing-table";
import { TokenPricingTable } from "@/components/marketing/token-pricing-table";
import { getOptionalOrganization } from "@/lib/auth/dal";
import { requestPlanChangeAction } from "./actions";

export default async function PricingPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations("pricing");
  const context = await getOptionalOrganization();

  return (
    <section className="mx-auto max-w-6xl px-6 py-20">
      <div className="mx-auto max-w-2xl text-center">
        <h1 className="text-4xl font-bold tracking-tight">{t("title")}</h1>
        <p className="mt-4 text-muted-foreground">{t("subtitle")}</p>
      </div>
      <div className="mt-12">
        <PricingTable
          currentTierId={context?.organization.plan}
          requestPlanChangeAction={context ? requestPlanChangeAction.bind(null, locale) : undefined}
        />
      </div>
      <TokenPricingTable />
    </section>
  );
}
