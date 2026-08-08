import { getTranslations } from "next-intl/server";
import { getOrganizationCredits } from "@/lib/billing/queries";
import { PRICING_TIERS } from "@/lib/pricing-data";
import { Link } from "@/i18n/navigation";

export async function BillingWidget({ organizationId, plan }: { organizationId: string; plan: string }) {
  const t = await getTranslations("billing");
  const tPricing = await getTranslations("pricing");
  const credits = await getOrganizationCredits(organizationId);
  const tier = PRICING_TIERS.find((tier) => tier.id === plan) ?? PRICING_TIERS[0];

  return (
    <Link
      href="/billing"
      className="block rounded-lg border border-border bg-card p-3 text-sm transition-colors hover:border-brand/40"
    >
      <p className="text-xs font-medium text-muted-foreground">{tPricing(`tiers.${tier.id}.name`)}</p>
      <p className="mt-1 text-lg font-bold">{credits.balance.toFixed(2)}W</p>
      <span className="mt-2 inline-flex text-xs font-medium text-brand">{t("planCard.changePlan")}</span>
    </Link>
  );
}
