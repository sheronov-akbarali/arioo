import { desc, eq } from "drizzle-orm";
import { getTranslations } from "next-intl/server";
import { db } from "@/db/client";
import { approvals } from "@/db/schema/approvals";
import { aiAgents } from "@/db/schema/agents";
import { requireOrganization } from "@/lib/auth/dal";
import { Button } from "@/components/ui/button";
import { approveAction, rejectAction } from "./actions";

export default async function ApprovalsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const { organization } = await requireOrganization(locale);
  const t = await getTranslations("approvals");

  const rows = await db
    .select({ approval: approvals, agentName: aiAgents.name })
    .from(approvals)
    .innerJoin(aiAgents, eq(approvals.agentId, aiAgents.id))
    .where(eq(aiAgents.organizationId, organization.id))
    .orderBy(desc(approvals.createdAt));

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold">{t("title")}</h1>
      {rows.length === 0 ? (
        <p className="text-muted-foreground">{t("empty")}</p>
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
