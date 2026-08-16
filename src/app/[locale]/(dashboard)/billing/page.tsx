import { desc, eq } from "drizzle-orm";
import { CreditCard } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { db } from "@/db/client";
import { creditTransactions } from "@/db/schema/billing";
import { requireOrganization } from "@/lib/auth/dal";
import { getOrganizationCredits } from "@/lib/billing/queries";
import { PRICING_TIERS } from "@/lib/pricing-data";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TopUpDialog } from "@/components/dashboard/billing/top-up-dialog";

export default async function BillingPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const { organization } = await requireOrganization(locale);
  const t = await getTranslations("billing");
  const tPricing = await getTranslations("pricing");

  const [credits, transactions] = await Promise.all([
    getOrganizationCredits(organization.id),
    db
      .select()
      .from(creditTransactions)
      .where(eq(creditTransactions.organizationId, organization.id))
      .orderBy(desc(creditTransactions.createdAt))
      .limit(50),
  ]);

  const tier = PRICING_TIERS.find((tier) => tier.id === organization.plan) ?? PRICING_TIERS[0];

  const dtf = new Intl.DateTimeFormat(locale === "en" ? "en-US" : locale === "ru" ? "ru-RU" : "uz-UZ", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  const paymentTransactions = transactions.filter((tx) => tx.amount >= 0);
  const expenseTransactions = transactions.filter((tx) => tx.amount < 0);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand">
          <CreditCard className="size-5" />
        </span>
        <div>
          <h1 className="text-xl font-semibold">{t("title")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>
      </div>

      <Card>
        <CardHeader className="flex-row items-start justify-between">
          <div>
            {tier.isPopular && <Badge className="mb-2 w-fit bg-brand text-brand-foreground">★</Badge>}
            <CardTitle className="text-2xl">{tPricing(`tiers.${tier.id}.name`)}</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">{t("planCard.hint")}</p>
          </div>
          <Button
            size="sm"
            variant="outline"
            nativeButton={false}
            render={<Link href="/pricing">{t("planCard.changePlan")}</Link>}
          />
        </CardHeader>
      </Card>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="flex flex-col gap-4 pt-6">
            <div>
              <p className="text-sm text-muted-foreground">{t("balanceCard.title")}</p>
              <p className="mt-1 text-2xl font-bold">{credits.balance.toFixed(2)} TAY</p>
              <p className="mt-1 text-xs text-muted-foreground">{t("balanceCard.hint")}</p>
            </div>
            <TopUpDialog allowTestTopUp={process.env.NODE_ENV !== "production"} />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">{t("bonusCard.title")}</p>
            <p className="mt-1 text-2xl font-bold">{credits.bonusBalance.toFixed(2)} TAYb</p>
            <p className="mt-1 text-xs text-muted-foreground">{t("bonusCard.hint")}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">{t("storageCard.title")}</p>
            <p className="mt-1 text-2xl font-bold text-muted-foreground">—</p>
            <p className="mt-1 text-xs text-muted-foreground">{t("storageCard.notTracked")}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("history.title")}</CardTitle>
        </CardHeader>
        <CardContent>
          {paymentTransactions.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">{t("history.empty")}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs text-muted-foreground">
                    <th className="py-2 pr-4 font-medium">{t("history.date")}</th>
                    <th className="py-2 pr-4 font-medium">{t("history.description")}</th>
                    <th className="py-2 pr-4 font-medium">{t("history.type")}</th>
                    <th className="py-2 text-right font-medium">{t("history.amount")}</th>
                  </tr>
                </thead>
                <tbody>
                  {paymentTransactions.map((tx) => (
                    <tr key={tx.id} className="border-b border-border last:border-0">
                      <td className="py-2 pr-4 text-muted-foreground">{dtf.format(tx.createdAt)}</td>
                      <td className="py-2 pr-4">{tx.description}</td>
                      <td className="py-2 pr-4 text-muted-foreground">{t(`history.types.${tx.type}`)}</td>
                      <td className="py-2 text-right font-medium text-brand">
                        +{tx.amount.toFixed(2)} TAY
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("history.expenseTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          {expenseTransactions.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">{t("history.expenseEmpty")}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs text-muted-foreground">
                    <th className="py-2 pr-4 font-medium">{t("history.date")}</th>
                    <th className="py-2 pr-4 font-medium">{t("history.description")}</th>
                    <th className="py-2 pr-4 font-medium">{t("history.type")}</th>
                    <th className="py-2 text-right font-medium">{t("history.amount")}</th>
                  </tr>
                </thead>
                <tbody>
                  {expenseTransactions.map((tx) => (
                    <tr key={tx.id} className="border-b border-border last:border-0">
                      <td className="py-2 pr-4 text-muted-foreground">{dtf.format(tx.createdAt)}</td>
                      <td className="py-2 pr-4">{tx.description}</td>
                      <td className="py-2 pr-4 text-muted-foreground">{t(`history.types.${tx.type}`)}</td>
                      <td className="py-2 text-right font-medium text-foreground">
                        {tx.amount.toFixed(2)} TAY
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
