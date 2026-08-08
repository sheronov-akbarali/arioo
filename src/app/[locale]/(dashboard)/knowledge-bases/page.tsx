import { desc, eq } from "drizzle-orm";
import { getTranslations } from "next-intl/server";
import { BookOpen } from "lucide-react";
import { db } from "@/db/client";
import { knowledgeDocuments } from "@/db/schema/knowledge";
import { aiAgents } from "@/db/schema/agents";
import { requireOrganization } from "@/lib/auth/dal";
import { Link } from "@/i18n/navigation";
import { Card, CardContent } from "@/components/ui/card";

export default async function KnowledgeBasesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const { organization } = await requireOrganization(locale);
  const t = await getTranslations("knowledgeBases");
  const tStatus = await getTranslations("assistants.knowledge.status");

  const rows = await db
    .select({ document: knowledgeDocuments, agentId: aiAgents.id, agentName: aiAgents.name })
    .from(knowledgeDocuments)
    .innerJoin(aiAgents, eq(knowledgeDocuments.agentId, aiAgents.id))
    .where(eq(aiAgents.organizationId, organization.id))
    .orderBy(desc(knowledgeDocuments.createdAt));

  // Our knowledge base is per-agent (unlike worken's standalone reusable
  // vector stores) — group documents by their owning agent for display.
  const byAgent = new Map<string, { agentName: string; documents: typeof rows }>();
  for (const row of rows) {
    const bucket = byAgent.get(row.agentId) ?? { agentName: row.agentName, documents: [] };
    bucket.documents.push(row);
    byAgent.set(row.agentId, bucket);
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold">{t("title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("subtitle")}</p>
      </div>

      {byAgent.size === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border py-16 text-center">
          <span className="flex size-12 items-center justify-center rounded-full bg-brand/10 text-brand">
            <BookOpen className="size-6" />
          </span>
          <div>
            <p className="font-medium">{t("empty")}</p>
            <p className="text-sm text-muted-foreground">{t("emptyHint")}</p>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {[...byAgent.entries()].map(([agentId, bucket]) => (
            <Card key={agentId}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <p className="font-medium">{bucket.agentName}</p>
                  <Link
                    href={`/assistants/${agentId}/knowledge`}
                    className="text-xs font-medium text-brand hover:underline"
                  >
                    {t("manage")}
                  </Link>
                </div>
                <ul className="mt-3 flex flex-col gap-2">
                  {bucket.documents.map(({ document }) => (
                    <li key={document.id} className="flex items-center justify-between text-sm">
                      <span className="truncate">{document.filename}</span>
                      <span className="text-xs text-muted-foreground">{tStatus(document.status)}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
