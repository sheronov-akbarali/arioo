"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PRICING_TIERS, formatUZS, formatUSDApprox } from "@/lib/pricing-data";
import { Sparkles, Gem, Zap, Crown, type LucideIcon } from "lucide-react";

const PRICING_TIER_ICONS: Record<(typeof PRICING_TIERS)[number]["id"], LucideIcon> = {
  freemium: Sparkles,
  businessS: Sparkles,
  businessM: Gem,
  businessL: Zap,
  enterprise: Crown,
};

export function PricingTable() {
  const t = useTranslations("pricing");
  const [period, setPeriod] = useState<"monthly" | "annual">("annual");

  return (
    <div>
      <Tabs value={period} onValueChange={(v) => setPeriod(v as "monthly" | "annual")}>
        <TabsList className="mx-auto">
          <TabsTrigger value="monthly">{t("monthly")}</TabsTrigger>
          <TabsTrigger value="annual">
            {t("annual")} <Badge className="ml-2">{t("annualBadge")}</Badge>
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="mt-10 grid gap-6 lg:grid-cols-5">
        {PRICING_TIERS.map((tier) => {
          const price = period === "monthly" ? tier.priceUZSMonthly : tier.priceUZSAnnual;
          const Icon = PRICING_TIER_ICONS[tier.id];
          return (
            <Card
              key={tier.id}
              className={tier.isPopular ? "border-brand shadow-lg shadow-brand/10" : ""}
            >
              <CardHeader>
                <span
                  className={
                    tier.isPopular
                      ? "mb-2 flex size-8 items-center justify-center rounded-lg bg-brand text-brand-foreground"
                      : "mb-2 flex size-8 items-center justify-center rounded-lg bg-muted text-muted-foreground"
                  }
                >
                  <Icon className="size-4" />
                </span>
                {tier.isPopular && (
                  <Badge className="mb-2 w-fit bg-brand text-brand-foreground">
                    {t(`tiers.${tier.id}.popular`)}
                  </Badge>
                )}
                <CardTitle>{t(`tiers.${tier.id}.name`)}</CardTitle>
                <CardDescription>{t(`tiers.${tier.id}.description`)}</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="mb-6 space-y-2 text-sm text-muted-foreground">
                  <li>{t(`tiers.${tier.id}.employees`)}</li>
                  <li>{t(`tiers.${tier.id}.feature2`)}</li>
                </ul>
                {tier.isCustom ? (
                  <p className="text-2xl font-bold">{t(`tiers.${tier.id}.price`)}</p>
                ) : price === 0 ? (
                  <p className="text-2xl font-bold">{t(`tiers.${tier.id}.price`)}</p>
                ) : (
                  <div>
                    <p className="text-2xl font-bold">
                      {formatUZS(price ?? 0, t("currency"))}
                      <span className="text-sm font-normal text-muted-foreground">
                        {period === "monthly" ? t("perMonth") : t("perYear")}
                      </span>
                    </p>
                    {price ? (
                      <p className="text-xs text-muted-foreground">{formatUSDApprox(price)}</p>
                    ) : null}
                  </div>
                )}
                <Button
                  className="mt-6 w-full bg-brand text-brand-foreground hover:opacity-90"
                  nativeButton={false}
                  render={<Link href="/#lead-form">{t("cta")}</Link>}
                />
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
