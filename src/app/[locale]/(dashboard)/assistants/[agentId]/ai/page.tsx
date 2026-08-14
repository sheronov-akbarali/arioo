import { getTranslations } from "next-intl/server";
import { requireAgent } from "@/lib/auth/dal";
import { AGENT_ROLES } from "@/lib/agents/schema";
import { listAvailableModels } from "@/lib/ai/gateway";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ToolsPanel } from "@/components/dashboard/tools-panel";
import { updateAiTabAction } from "./actions";

export default async function AssistantAiTabPage({
  params,
}: {
  params: Promise<{ locale: string; agentId: string }>;
}) {
  const { locale, agentId } = await params;
  const { agent } = await requireAgent(locale, agentId);
  const t = await getTranslations("assistants.detail.ai");
  const models = await listAvailableModels();
  const action = updateAiTabAction.bind(null, locale, agent.id);

  return (
    <div className="flex flex-col gap-8">
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

        <div className="flex flex-col gap-3 rounded-2xl border border-border p-5">
          <div>
            <h2 className="font-medium">{t("coreSettingsTitle")}</h2>
            <p className="text-sm text-muted-foreground">{t("coreSettingsSubtitle")}</p>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="topP">{t("topPLabel")}</Label>
              <Input id="topP" name="topP" type="number" step="0.01" min={0} max={1} defaultValue={agent.topP ?? ""} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="temperature">{t("temperatureLabel")}</Label>
              <Input id="temperature" name="temperature" type="number" step="0.01" min={0} max={2} defaultValue={agent.temperature ?? ""} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="maxTokens">{t("maxTokensLabel")}</Label>
              <Input id="maxTokens" name="maxTokens" type="number" min={1} max={100000} defaultValue={agent.maxTokens ?? ""} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="recentMessagesCount">{t("recentMessagesCountLabel")}</Label>
              <Input id="recentMessagesCount" name="recentMessagesCount" type="number" min={0} max={200} defaultValue={agent.recentMessagesCount} />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="readOnlyMode" defaultChecked={agent.readOnlyMode} className="size-4 rounded border-input" />
            {t("readOnlyModeLabel")}
          </label>
          <p className="text-xs text-muted-foreground">{t("readOnlyModeHint")}</p>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="autoTitleGeneration" defaultChecked={agent.autoTitleGeneration} className="size-4 rounded border-input" />
            {t("autoTitleGenerationLabel")}
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="semanticSearchEnabled" defaultChecked={agent.semanticSearchEnabled} className="size-4 rounded border-input" />
            {t("semanticSearchEnabledLabel")}
          </label>
          <div className="flex flex-col gap-2">
            <Label htmlFor="memoryIsolation">{t("memoryIsolationLabel")}</Label>
            <select id="memoryIsolation" name="memoryIsolation" defaultValue={agent.memoryIsolation} className="border-input rounded-md border px-3 py-2">
              <option value="user">{t("memoryIsolationOptions.user")}</option>
              <option value="thread">{t("memoryIsolationOptions.thread")}</option>
            </select>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="memoryTemplateMode">{t("memoryTemplateModeLabel")}</Label>
            <select id="memoryTemplateMode" name="memoryTemplateMode" defaultValue={agent.memoryTemplateMode} className="border-input rounded-md border px-3 py-2">
              <option value="freeform">{t("memoryTemplateModeOptions.freeform")}</option>
              <option value="schema">{t("memoryTemplateModeOptions.schema")}</option>
            </select>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="memoryTemplate">{t("memoryTemplateLabel")}</Label>
            <textarea id="memoryTemplate" name="memoryTemplate" rows={3} maxLength={4000} defaultValue={agent.memoryTemplate ?? ""} className="border-input rounded-md border px-3 py-2" />
          </div>
        </div>

        <div className="flex flex-col gap-3 rounded-2xl border border-border p-5">
          <h2 className="font-medium">{t("responseFormattingTitle")}</h2>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="removeEmojis" defaultChecked={agent.removeEmojis} className="size-4 rounded border-input" />
            {t("removeEmojisLabel")}
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="removeMarkdown" defaultChecked={agent.removeMarkdown} className="size-4 rounded border-input" />
            {t("removeMarkdownLabel")}
          </label>
        </div>

        <div className="flex flex-col gap-3 rounded-2xl border border-border p-5">
          <h2 className="font-medium">{t("interruptionTitle")}</h2>
          <div className="flex flex-col gap-2">
            <Label htmlFor="interruptionMode">{t("interruptionModeLabel")}</Label>
            <select id="interruptionMode" name="interruptionMode" defaultValue={agent.interruptionMode} className="border-input rounded-md border px-3 py-2">
              <option value="queue">{t("interruptionModeOptions.queue")}</option>
              <option value="abort_restart">{t("interruptionModeOptions.abort_restart")}</option>
              <option value="drop_restart">{t("interruptionModeOptions.drop_restart")}</option>
            </select>
          </div>
        </div>

        <div className="flex flex-col gap-3 rounded-2xl border border-border p-5">
          <h2 className="font-medium">{t("agentStepsTitle")}</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="maxStepsWithoutTools">{t("maxStepsWithoutToolsLabel")}</Label>
              <Input id="maxStepsWithoutTools" name="maxStepsWithoutTools" type="number" min={1} max={20} defaultValue={agent.maxStepsWithoutTools} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="maxStepsWithTools">{t("maxStepsWithToolsLabel")}</Label>
              <Input id="maxStepsWithTools" name="maxStepsWithTools" type="number" min={1} max={50} defaultValue={agent.maxStepsWithTools} />
            </div>
          </div>
        </div>

        <Button type="submit">{t("save")}</Button>
      </form>
      <ToolsPanel />
    </div>
  );
}
