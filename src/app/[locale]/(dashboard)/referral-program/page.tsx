import { and, desc, eq, gte } from "drizzle-orm";
import { Link2 } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { db } from "@/db/client";
import { referralOperations } from "@/db/schema/referrals";
import { requireOrganization } from "@/lib/auth/dal";
import { getOrCreateReferralAccount } from "@/lib/referrals/queries";
import { Link } from "@/i18n/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CopyLinkButton } from "@/components/dashboard/copy-link-button";

const DAILY_LIMIT = 100;
const MONTHLY_LIMIT = 1000;

export default async function ReferralProgramPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ period?: string }>;
}) {
  const { locale } = await params;
  const { period } = await searchParams;
  const { organization } = await requireOrganization(locale);
  const t = await getTranslations("referralProgram");

  const account = await getOrCreateReferralAccount(organization.id);

  const now = new Date();
  const startOfDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const startOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));

  const PERIODS = ["all", "today", "week", "month"] as const;
  const activePeriod = PERIODS.find((p) => p === period) ?? "all";

  const dayOfWeek = now.getUTCDay();
  const daysSinceMonday = (dayOfWeek + 6) % 7;
  const startOfWeek = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - daysSinceMonday));

  const periodStart =
    activePeriod === "today"
      ? startOfDay
      : activePeriod === "week"
        ? startOfWeek
        : activePeriod === "month"
          ? startOfMonth
          : null;

  const [operations, todayOps, monthOps] = await Promise.all([
    db
      .select()
      .from(referralOperations)
      .where(
        and(
          eq(referralOperations.organizationId, organization.id),
          periodStart ? gte(referralOperations.createdAt, periodStart) : undefined,
        ),
      )
      .orderBy(desc(referralOperations.createdAt))
      .limit(50),
    db
      .select()
      .from(referralOperations)
      .where(and(eq(referralOperations.organizationId, organization.id), gte(referralOperations.createdAt, startOfDay))),
    db
      .select()
      .from(referralOperations)
      .where(
        and(eq(referralOperations.organizationId, organization.id), gte(referralOperations.createdAt, startOfMonth)),
      ),
  ]);

  const totalEarned = operations.reduce((sum, op) => sum + op.amount, 0);
  const dtf = new Intl.DateTimeFormat(locale === "en" ? "en-US" : locale === "ru" ? "ru-RU" : "uz-UZ", {
    dateStyle: "medium",
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand">
          <Link2 className="size-5" />
        </span>
        <div>
          <h1 className="text-xl font-semibold">{t("title")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">{t("balance")}</p>
            <p className="mt-1 text-2xl font-bold">{account.balance.toFixed(2)}W</p>
            <Button size="sm" disabled className="mt-3">
              {t("withdraw")}
              <span className="ml-1 text-xs opacity-70">{t("comingSoon")}</span>
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">{t("rate")}</p>
            <p className="mt-1 text-2xl font-bold text-brand">{account.ratePercent}%</p>
            <p className="mt-1 text-xs text-muted-foreground">{t("rateHint")}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">{t("totalInvited")}</p>
            <p className="mt-1 text-2xl font-bold">0</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">{t("totalEarned")}</p>
            <p className="mt-1 text-2xl font-bold">{totalEarned.toFixed(2)}W</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("linksTitle")}</CardTitle>
          <p className="text-sm text-muted-foreground">{t("linksSubtitle")}</p>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <p className="text-xs font-medium text-muted-foreground">{t("linkLabels.home")}</p>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-md border border-border px-3 py-1.5 text-sm text-muted-foreground">
                {`/${locale}?ref=${account.code}`}
              </span>
              <CopyLinkButton path={`/${locale}?ref=${account.code}`} label={t("copy")} copiedLabel={t("copied")} />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <p className="text-xs font-medium text-muted-foreground">{t("linkLabels.signUp")}</p>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-md border border-border px-3 py-1.5 text-sm text-muted-foreground">
                {`/${locale}/sign-up?ref=${account.code}`}
              </span>
              <CopyLinkButton
                path={`/${locale}/sign-up?ref=${account.code}`}
                label={t("copy")}
                copiedLabel={t("copied")}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("limitsTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div>
            <div className="flex items-baseline justify-between text-sm">
              <span>{t("dailyLimit")}</span>
              <span className="text-muted-foreground">
                {todayOps.length} / {DAILY_LIMIT}
              </span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-brand"
                style={{ width: `${Math.min(100, (todayOps.length / DAILY_LIMIT) * 100)}%` }}
              />
            </div>
          </div>
          <div>
            <div className="flex items-baseline justify-between text-sm">
              <span>{t("monthlyLimit")}</span>
              <span className="text-muted-foreground">
                {monthOps.length} / {MONTHLY_LIMIT}
              </span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-brand"
                style={{ width: `${Math.min(100, (monthOps.length / MONTHLY_LIMIT) * 100)}%` }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2">
        {PERIODS.map((p) => (
          <Button
            key={p}
            size="sm"
            variant={activePeriod === p ? "default" : "outline"}
            nativeButton={false}
            render={<Link href={p === "all" ? "/referral-program" : `/referral-program?period=${p}`}>{t(`periodFilters.${p}`)}</Link>}
          />
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("operationsTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          {operations.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">{t("operationsEmpty")}</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {operations.map((op) => (
                <li key={op.id} className="flex items-center justify-between text-sm">
                  <span>{op.description}</span>
                  <span className="flex items-center gap-3">
                    <span className="text-muted-foreground">{dtf.format(op.createdAt)}</span>
                    <span className="font-medium text-brand">+{op.amount.toFixed(2)}W</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
