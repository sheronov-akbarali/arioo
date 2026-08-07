import { desc, eq } from "drizzle-orm";
import { getTranslations } from "next-intl/server";
import { db } from "@/db/client";
import { knowledgeDocuments } from "@/db/schema/knowledge";
import { requireAgent } from "@/lib/auth/dal";
import { Button } from "@/components/ui/button";
import { uploadKnowledgeDocumentAction } from "./actions";

export default async function KnowledgeBasePage({
  params,
}: {
  params: Promise<{ locale: string; agentId: string }>;
}) {
  const { locale, agentId } = await params;
  const { agent } = await requireAgent(locale, agentId);
  const t = await getTranslations("assistants.knowledge");
  const action = uploadKnowledgeDocumentAction.bind(null, locale, agent.id);

  const documents = await db
    .select()
    .from(knowledgeDocuments)
    .where(eq(knowledgeDocuments.agentId, agent.id))
    .orderBy(desc(knowledgeDocuments.createdAt));

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold">{t("title")}</h1>
      <form action={action} className="flex items-center gap-2">
        <input type="file" name="file" accept=".txt,.md" required />
        <Button type="submit">{t("upload")}</Button>
      </form>
      {documents.length === 0 ? (
        <p className="text-muted-foreground">{t("empty")}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {documents.map((document) => (
            <li key={document.id} className="flex items-center justify-between rounded-lg border p-3">
              <span>{document.filename}</span>
              <span className="text-muted-foreground text-sm">{t(`status.${document.status}`)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
