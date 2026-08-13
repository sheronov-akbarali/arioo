import { desc, eq, and, isNull, isNotNull, ilike, sql } from "drizzle-orm";
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
// Routines have no conversation (they fire from CRM/integration events);
// chat/voice approvals always carry the conversation they came from — so
// this distinction is already representable without a new column.
const SOURCE_FILTERS = ["routines", "chats"] as const;

export default async function ApprovalsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ status?: string; source?: string; search?: string }>;
}) {
  const { locale } = await params;
  const { status, source, search } = await searchParams;
  const { organization } = await requireOrganization(locale);
  const t = await getTranslations("approvals");

  const activeStatus = STATUS_FILTERS.find((s) => s === status);
  const activeSource = SOURCE_FILTERS.find((s) => s === source);
  const activeSearch = search?.trim() ?? "";

  const rows = await db
    .select({ approval: approvals, agentName: aiAgents.name })
    .from(approvals)
    .innerJoin(aiAgents, eq(approvals.agentId, aiAgents.id))
    .where(
      and(
        eq(aiAgents.organizationId, organization.id),
        activeStatus ? eq(approvals.status, activeStatus) : undefined,
        activeSource === "routines" ? isNull(approvals.conversationId) : undefined,
        activeSource === "chats" ? isNotNull(approvals.conversationId) : undefined,
        activeSearch ? ilike(approvals.type, `%${activeSearch}%`) : undefined,
      ),
    )
    .orderBy(desc(approvals.createdAt));

  const statusCounts = await db
    .select({ status: approvals.status, count: sql<number>`count(*)::int` })
    .from(approvals)
    .innerJoin(aiAgents, eq(approvals.agentId, aiAgents.id))
    .where(eq(aiAgents.organizationId, organization.id))
    .groupBy(approvals.status);
  const countByStatus = new Map(statusCounts.map((row) => [row.status, row.count]));

  // Each filter dimension links independently while preserving the other's
  // current value, so switching source doesn't reset the status filter (and
  // vice versa).
  function href(next: { status?: string; source?: string }) {
    const query = new URLSearchParams();
    const nextStatus = next.status ?? activeStatus;
    const nextSource = next.source ?? activeSource;
    if (nextStatus) query.set("status", nextStatus);
    if (nextSource) query.set("source", nextSource);
    const qs = query.toString();
    return qs ? `/approvals?${qs}` : "/approvals";
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand">
          <CheckCircle2 className="size-5" />
        </span>
        <div>
          <h1 className="text-xl font-semibold">{t("title")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant={!activeSource ? "default" : "outline"}
          nativeButton={false}
          render={<Link href={href({ source: "" })}>{t("sourceFilters.all")}</Link>}
        />
        {SOURCE_FILTERS.map((s) => (
          <Button
            key={s}
            size="sm"
            variant={activeSource === s ? "default" : "outline"}
            nativeButton={false}
            render={<Link href={href({ source: s })}>{t(`sourceFilters.${s}`)}</Link>}
          />
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant={!activeStatus ? "default" : "outline"}
          nativeButton={false}
          render={<Link href={href({ status: "" })}>{t("statusFilters.all")}</Link>}
        />
        {STATUS_FILTERS.map((s) => (
          <Button
            key={s}
            size="sm"
            variant={activeStatus === s ? "default" : "outline"}
            nativeButton={false}
            render={
              <Link href={href({ status: s })}>
                {t(`status.${s}`)} ({countByStatus.get(s) ?? 0})
              </Link>
            }
          />
        ))}
      </div>

      <form action={`/${locale}/approvals`} method="get" className="flex gap-2">
        {activeStatus && <input type="hidden" name="status" value={activeStatus} />}
        {activeSource && <input type="hidden" name="source" value={activeSource} />}
        <input
          type="text"
          name="search"
          defaultValue={activeSearch}
          placeholder={t("search.placeholder")}
          className="h-8 w-full max-w-xs rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        />
        <Button type="submit" size="sm" variant="outline">
          {t("search.apply")}
        </Button>
      </form>

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
