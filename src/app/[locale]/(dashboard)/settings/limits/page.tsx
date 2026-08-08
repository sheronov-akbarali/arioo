import { count, eq } from "drizzle-orm";
import { getTranslations } from "next-intl/server";
import { db } from "@/db/client";
import { aiAgents } from "@/db/schema/agents";
import { memberships } from "@/db/schema/org";
import { requireOrganization } from "@/lib/auth/dal";
import { PRICING_TIERS } from "@/lib/pricing-data";
import { Card, CardContent } from "@/components/ui/card";

export default async function LimitsSettingsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const { organization } = await requireOrganization(locale);
  const t = await getTranslations("settings.limits");
  const tPricing = await getTranslations("pricing");

  const tier = PRICING_TIERS.find((tier) => tier.id === organization.plan) ?? PRICING_TIERS[0];

  const [[agentRow], [memberRow]] = await Promise.all([
    db.select({ value: count() }).from(aiAgents).where(eq(aiAgents.organizationId, organization.id)),
    db.select({ value: count() }).from(memberships).where(eq(memberships.organizationId, organization.id)),
  ]);

  const agentCount = agentRow?.value ?? 0;
  const agentPct = Math.min(100, Math.round((agentCount / tier.employeeLimit) * 100));

  return (
    <div className="flex max-w-md flex-col gap-4">
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-baseline justify-between">
            <p className="text-sm font-medium">{t("agents")}</p>
            <p className="text-sm text-muted-foreground">
              {agentCount} / {tier.employeeLimit}
            </p>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-brand" style={{ width: `${agentPct}%` }} />
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            {t("planHint", { plan: tPricing(`tiers.${tier.id}.name`) })}
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="flex items-baseline justify-between pt-6">
          <p className="text-sm font-medium">{t("teamMembers")}</p>
          <p className="text-sm text-muted-foreground">{memberRow?.value ?? 0}</p>
        </CardContent>
      </Card>
    </div>
  );
}
