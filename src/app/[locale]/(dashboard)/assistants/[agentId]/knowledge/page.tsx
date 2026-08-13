import { desc, eq } from "drizzle-orm";
import { getTranslations } from "next-intl/server";
import { db } from "@/db/client";
import { knowledgeDocuments } from "@/db/schema/knowledge";
import { requireAgent } from "@/lib/auth/dal";
import { getOrCreateKnowledgeSettings } from "@/lib/agents/settings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { uploadKnowledgeDocumentAction, updateKnowledgeSettingsAction } from "./actions";

export default async function KnowledgeBasePage({
  params,
}: {
  params: Promise<{ locale: string; agentId: string }>;
}) {
  const { locale, agentId } = await params;
  const { agent } = await requireAgent(locale, agentId);
  const t = await getTranslations("assistants.knowledge");
  const uploadAction = uploadKnowledgeDocumentAction.bind(null, locale, agent.id);
  const settingsAction = updateKnowledgeSettingsAction.bind(null, locale, agent.id);

  const [documents, settings] = await Promise.all([
    db
      .select()
      .from(knowledgeDocuments)
      .where(eq(knowledgeDocuments.agentId, agent.id))
      .orderBy(desc(knowledgeDocuments.createdAt)),
    getOrCreateKnowledgeSettings(agent.id),
  ]);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-6">
        <h1 className="text-xl font-semibold">{t("title")}</h1>
        <form action={uploadAction} className="flex items-center gap-2">
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

      <form action={settingsAction} className="flex flex-col gap-6">
        <div className="flex flex-col gap-3 rounded-2xl border border-border p-5">
          <div>
            <h2 className="font-medium">{t("settingsTitle")}</h2>
            <p className="text-sm text-muted-foreground">{t("settingsSubtitle")}</p>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="embeddingModel">{t("embeddingModelLabel")}</Label>
            <Input id="embeddingModel" name="embeddingModel" defaultValue={settings.embeddingModel} />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="relevanceThreshold">{t("relevanceThresholdLabel")}</Label>
              <Input id="relevanceThreshold" name="relevanceThreshold" type="number" step="0.01" min={0} max={1} defaultValue={settings.relevanceThreshold} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="maxResults">{t("maxResultsLabel")}</Label>
              <Input id="maxResults" name="maxResults" type="number" min={1} max={50} defaultValue={settings.maxResults} />
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3 rounded-2xl border border-border p-5">
          <h2 className="font-medium">{t("searchContextTitle")}</h2>
          <div className="flex flex-col gap-2">
            <Label htmlFor="maxContextTokens">{t("maxContextTokensLabel")}</Label>
            <Input id="maxContextTokens" name="maxContextTokens" type="number" min={100} max={8000} defaultValue={settings.maxContextTokens} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="aggregationStrategy">{t("aggregationStrategyLabel")}</Label>
            <select id="aggregationStrategy" name="aggregationStrategy" defaultValue={settings.aggregationStrategy} className="border-input rounded-md border px-3 py-2">
              <option value="merge">{t("aggregationStrategyOptions.merge")}</option>
              <option value="priority">{t("aggregationStrategyOptions.priority")}</option>
            </select>
          </div>
        </div>

        <Button type="submit">{t("saveSettings")}</Button>
      </form>
    </div>
  );
}
