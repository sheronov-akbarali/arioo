import { getTranslations } from "next-intl/server";
import { requireOrganization } from "@/lib/auth/dal";
import { AGENT_ROLES } from "@/lib/agents/schema";
import { getSystemPromptTemplate } from "@/lib/agents/templates";
import { listAvailableModels, DEFAULT_MODEL } from "@/lib/ai/gateway";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createAgentAction } from "../actions";

export default async function NewAssistantPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { locale } = await params;
  const { error } = await searchParams;
  const { organization } = await requireOrganization(locale);
  const t = await getTranslations("assistants.new");
  const models = await listAvailableModels();
  const action = createAgentAction.bind(null, locale);
  const defaultRole = AGENT_ROLES[0];

  return (
    <main className="mx-auto flex max-w-lg flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold">{t("title")}</h1>
        <p className="text-muted-foreground">{t("subtitle")}</p>
      </div>
      {error && <p className="text-destructive text-sm">{error}</p>}
      <form action={action} className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="name">{t("nameLabel")}</Label>
          <Input id="name" name="name" required minLength={2} maxLength={100} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="role">{t("roleLabel")}</Label>
          <select
            id="role"
            name="role"
            required
            defaultValue={defaultRole}
            className="border-input rounded-md border px-3 py-2"
          >
            {AGENT_ROLES.map((role) => (
              <option key={role} value={role}>
                {t(`roles.${role}`)}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="systemPrompt">{t("systemPromptLabel")}</Label>
          <textarea
            id="systemPrompt"
            name="systemPrompt"
            required
            minLength={10}
            maxLength={4000}
            rows={6}
            defaultValue={getSystemPromptTemplate(defaultRole, organization.name)}
            className="border-input rounded-md border px-3 py-2"
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="model">{t("modelLabel")}</Label>
          <select
            id="model"
            name="model"
            required
            defaultValue={DEFAULT_MODEL}
            className="border-input rounded-md border px-3 py-2"
          >
            {models.map((model) => (
              <option key={model.id} value={model.id}>
                {model.name}
              </option>
            ))}
          </select>
        </div>
        <Button type="submit">{t("submit")}</Button>
      </form>
    </main>
  );
}
