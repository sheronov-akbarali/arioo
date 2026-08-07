import { desc, eq, and } from "drizzle-orm";
import { getTranslations } from "next-intl/server";
import { CheckCircle2 } from "lucide-react";
import { db } from "@/db/client";
import { approvals, approvalStatus } from "@/db/schema/approvals";
import { aiAgents } from "@/db/schema/agents";
import { requireOrganization } from "@/lib/auth/dal";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { approveAction, rejectAction } from "./actions";

const STATUS_FILTERS = approvalStatus.enumValues;

export default async function ApprovalsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ status?: string }>;
}) {
  const { locale } = await params;
  const { status } = await searchParams;
  const { organization } = await requireOrganization(locale);
  const t = await getTranslations("approvals");

  const activeStatus = STATUS_FILTERS.find((s) => s === status);

  const rows = await db
    .select({ approval: approvals, agentName: aiAgents.name })
    .from(approvals)
    .innerJoin(aiAgents, eq(approvals.agentId, aiAgents.id))
    .where(
      activeStatus
        ? and(eq(aiAgents.organizationId, organization.id), eq(approvals.status, activeStatus))
        : eq(aiAgents.organizationId, organization.id),
    )
    .orderBy(desc(approvals.createdAt));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold">{t("title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("subtitle")}</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant={!activeStatus ? "default" : "outline"}
          nativeButton={false}
          render={<Link href="/approvals">{t("statusFilters.all")}</Link>}
        />
        {STATUS_FILTERS.map((s) => (
          <Button
            key={s}
            size="sm"
            variant={activeStatus === s ? "default" : "outline"}
            nativeButton={false}
            render={<Link href={`/approvals?status=${s}`}>{t(`status.${s}`)}</Link>}
          />
        ))}
      </div>

      {rows.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border py-16 text-center">
          <span className="flex size-12 items-center justify-center rounded-full bg-brand/10 text-brand">
            <CheckCircle2 className="size-6" />
          </span>
          <div>
            <p className="font-medium">{t("empty")}</p>
            <p className="text-sm text-muted-foreground">{t("emptyHint")}</p>
          </div>
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {rows.map(({ approval, agentName }) => (
            <li key={approval.id} className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="font-medium">
                  {agentName} — {approval.type}
                </p>
                <p className="text-muted-foreground text-sm">{t(`status.${approval.status}`)}</p>
              </div>
              {approval.status === "pending" && (
                <div className="flex gap-2">
                  <form action={async () => { "use server"; await approveAction(locale, approval.id); }}>
                    <Button type="submit" size="sm">
                      {t("approve")}
                    </Button>
                  </form>
                  <form action={async () => { "use server"; await rejectAction(locale, approval.id); }}>
                    <Button type="submit" size="sm" variant="ghost">
                      {t("reject")}
                    </Button>
                  </form>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
