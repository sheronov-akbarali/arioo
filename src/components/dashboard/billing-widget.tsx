import { getTranslations } from "next-intl/server";
import { CreditCard } from "lucide-react";
import { getOrganizationCredits } from "@/lib/billing/queries";
import { PRICING_TIERS } from "@/lib/pricing-data";
import { Link } from "@/i18n/navigation";
import { SidebarMenuButton } from "@/components/ui/sidebar";

export async function BillingWidget({ organizationId, plan }: { organizationId: string; plan: string }) {
  const tPricing = await getTranslations("pricing");
  const credits = await getOrganizationCredits(organizationId);
  const tier = PRICING_TIERS.find((tier) => tier.id === plan) ?? PRICING_TIERS[0];
  const tierName = tPricing(`tiers.${tier.id}.name`);

  // The dashboard sidebar is permanently locked to icon-rail mode (see
  // (dashboard)/layout.tsx), so this renders as a single icon button —
  // matching SidebarMenuButton's built-in collapsed-state tooltip, the same
  // pattern SidebarNav uses for every other rail item.
  return (
    <SidebarMenuButton
      render={<Link href="/billing" />}
      tooltip={`${tierName} — ${credits.balance.toFixed(2)} TAY`}
    >
      <CreditCard />
      <span>
        {tierName} — {credits.balance.toFixed(2)} TAY
      </span>
    </SidebarMenuButton>
  );
}
