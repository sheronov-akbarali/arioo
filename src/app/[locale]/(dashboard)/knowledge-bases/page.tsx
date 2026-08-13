import { desc, eq } from "drizzle-orm";
import { getTranslations } from "next-intl/server";
import { BookOpen } from "lucide-react";
import { db } from "@/db/client";
import { knowledgeDocuments } from "@/db/schema/knowledge";
import { aiAgents } from "@/db/schema/agents";
import { requireOrganization } from "@/lib/auth/dal";
import { KnowledgeBasesGrid } from "@/components/dashboard/knowledge-bases/knowledge-bases-grid";

export default async function KnowledgeBasesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const { organization } = await requireOrganization(locale);
  const t = await getTranslations("knowledgeBases");

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

  const groups = [...byAgent.entries()].map(([agentId, bucket]) => ({
    agentId,
    agentName: bucket.agentName,
    documents: bucket.documents.map(({ document }) => ({
      id: document.id,
      filename: document.filename,
      status: document.status,
    })),
  }));

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
        <KnowledgeBasesGrid groups={groups} />
      )}
    </div>
  );
}
