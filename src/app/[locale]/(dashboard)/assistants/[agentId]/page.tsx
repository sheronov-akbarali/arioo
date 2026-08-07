import { getTranslations } from "next-intl/server";
import { requireAgent } from "@/lib/auth/dal";
import { AGENT_ROLES } from "@/lib/agents/schema";
import { listAvailableModels } from "@/lib/ai/gateway";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ToolsPanel } from "@/components/dashboard/tools-panel";
import { updateAgentAction } from "./actions";

export default async function AssistantDetailPage({
  params,
}: {
  params: Promise<{ locale: string; agentId: string }>;
}) {
  const { locale, agentId } = await params;
  const { agent } = await requireAgent(locale, agentId);
  const t = await getTranslations("assistants.detail");
  const models = await listAvailableModels();
  const action = updateAgentAction.bind(null, locale, agent.id);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">{agent.name}</h1>
        <div className="flex gap-2">
          <Button
            variant="outline"
            nativeButton={false}
            render={<Link href={`/assistants/${agent.id}/knowledge`}>{t("knowledgeLink")}</Link>}
          />
          <Button
            nativeButton={false}
            render={<Link href={`/assistants/${agent.id}/chat`}>{t("chatLink")}</Link>}
          />
        </div>
      </div>
      <form action={action} className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="name">{t("nameLabel")}</Label>
          <Input id="name" name="name" required defaultValue={agent.name} minLength={2} maxLength={100} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="role">{t("roleLabel")}</Label>
          <select
            id="role"
            name="role"
            required
            defaultValue={agent.role}
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
            defaultValue={agent.systemPrompt}
            className="border-input rounded-md border px-3 py-2"
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="model">{t("modelLabel")}</Label>
          <select
            id="model"
            name="model"
            required
            defaultValue={agent.model}
            className="border-input rounded-md border px-3 py-2"
          >
            {models.map((model) => (
              <option key={model.id} value={model.id}>
                {model.name}
              </option>
            ))}
          </select>
        </div>
        <Button type="submit">{t("save")}</Button>
      </form>
      <ToolsPanel />
    </div>
  );
}
