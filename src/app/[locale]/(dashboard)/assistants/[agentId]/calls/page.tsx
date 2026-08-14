import { getTranslations } from "next-intl/server";
import { requireAgent } from "@/lib/auth/dal";
import { getOrCreateCallPolicy } from "@/lib/agents/settings";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { updateCallPolicyAction } from "./actions";

export default async function AssistantCallsTabPage({
  params,
}: {
  params: Promise<{ locale: string; agentId: string }>;
}) {
  const { locale, agentId } = await params;
  const { agent } = await requireAgent(locale, agentId);
  const policy = await getOrCreateCallPolicy(agent.id);
  const t = await getTranslations("assistants.detail.calls");
  const action = updateCallPolicyAction.bind(null, locale, agent.id);
  const escalationWordsText = (policy.escalationTriggerWords as string[]).join("\n");

  return (
    <form action={action} className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 rounded-2xl border border-border p-5">
        <div>
          <h2 className="font-medium">{t("policyTitle")}</h2>
          <p className="text-sm text-muted-foreground">{t("policySubtitle")}</p>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="enabled" defaultChecked={policy.enabled} className="size-4 rounded border-input" />
          {t("enabledLabel")}
        </label>
        <div className="flex flex-col gap-2">
          <Label htmlFor="direction">{t("directionLabel")}</Label>
          <select id="direction" name="direction" defaultValue={policy.direction} className="border-input rounded-md border px-3 py-2">
            <option value="off">{t("directionOptions.off")}</option>
            <option value="inbound">{t("directionOptions.inbound")}</option>
            <option value="outbound">{t("directionOptions.outbound")}</option>
            <option value="both">{t("directionOptions.both")}</option>
          </select>
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-border p-5">
        <h2 className="font-medium">{t("windowTitle")}</h2>
        <div className="flex flex-col gap-2">
          <Label htmlFor="windowTimezoneMode">{t("windowTimezoneModeLabel")}</Label>
          <select id="windowTimezoneMode" name="windowTimezoneMode" defaultValue={policy.windowTimezoneMode} className="border-input rounded-md border px-3 py-2">
            <option value="same_as_chat">{t("windowTimezoneModeOptions.same_as_chat")}</option>
            <option value="custom">{t("windowTimezoneModeOptions.custom")}</option>
          </select>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor="windowStart">{t("windowStartLabel")}</Label>
            <Input id="windowStart" name="windowStart" placeholder="10:00" maxLength={5} defaultValue={policy.windowStart ?? ""} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="windowEnd">{t("windowEndLabel")}</Label>
            <Input id="windowEnd" name="windowEnd" placeholder="19:00" maxLength={5} defaultValue={policy.windowEnd ?? ""} />
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="offWindowBehavior">{t("offWindowBehaviorLabel")}</Label>
          <select id="offWindowBehavior" name="offWindowBehavior" defaultValue={policy.offWindowBehavior} className="border-input rounded-md border px-3 py-2">
            <option value="reject">{t("offWindowBehaviorOptions.reject")}</option>
            <option value="voicemail_task">{t("offWindowBehaviorOptions.voicemail_task")}</option>
          </select>
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-border p-5">
        <h2 className="font-medium">{t("audienceTitle")}</h2>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="requireExistingThread" defaultChecked={policy.requireExistingThread} className="size-4 rounded border-input" />
          {t("requireExistingThreadLabel")}
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="respectDnc" defaultChecked={policy.respectDnc} className="size-4 rounded border-input" />
          {t("respectDncLabel")}
        </label>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor="maxAttempts">{t("maxAttemptsLabel")}</Label>
            <Input id="maxAttempts" name="maxAttempts" type="number" min={1} max={100} defaultValue={policy.maxAttempts ?? ""} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="attemptsPeriodDays">{t("attemptsPeriodDaysLabel")}</Label>
            <Input id="attemptsPeriodDays" name="attemptsPeriodDays" type="number" min={1} max={365} defaultValue={policy.attemptsPeriodDays ?? ""} />
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-border p-5">
        <h2 className="font-medium">{t("recordingTitle")}</h2>
        <div className="flex flex-col gap-2">
          <Label htmlFor="recordingMode">{t("recordingModeLabel")}</Label>
          <select id="recordingMode" name="recordingMode" defaultValue={policy.recordingMode} className="border-input rounded-md border px-3 py-2">
            <option value="off">{t("recordingModeOptions.off")}</option>
            <option value="record">{t("recordingModeOptions.record")}</option>
            <option value="record_announce">{t("recordingModeOptions.record_announce")}</option>
          </select>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="disclosureScript">{t("disclosureScriptLabel")}</Label>
          <textarea id="disclosureScript" name="disclosureScript" rows={2} maxLength={1000} defaultValue={policy.disclosureScript ?? ""} className="border-input rounded-md border px-3 py-2" />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor="maxDurationMinutes">{t("maxDurationMinutesLabel")}</Label>
            <Input id="maxDurationMinutes" name="maxDurationMinutes" type="number" min={1} max={180} defaultValue={policy.maxDurationMinutes} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="maxParallelLines">{t("maxParallelLinesLabel")}</Label>
            <Input id="maxParallelLines" name="maxParallelLines" type="number" min={1} max={20} defaultValue={policy.maxParallelLines} />
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-border p-5">
        <h2 className="font-medium">{t("channelTitle")}</h2>
        <p className="text-sm text-muted-foreground">{t("channelHint")}</p>
        <div className="flex flex-col gap-2">
          <Label htmlFor="sipIntegrationRef">{t("sipIntegrationRefLabel")}</Label>
          <Input id="sipIntegrationRef" name="sipIntegrationRef" placeholder={t("sipIntegrationRefPlaceholder")} disabled defaultValue={policy.sipIntegrationRef ?? ""} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="outboundDid">{t("outboundDidLabel")}</Label>
          <Input id="outboundDid" name="outboundDid" maxLength={30} defaultValue={policy.outboundDid ?? ""} />
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-border p-5">
        <h2 className="font-medium">{t("lineScriptTitle")}</h2>
        <p className="text-sm text-muted-foreground">{t("lineScriptHint")}</p>
        <div className="flex flex-col gap-2">
          <Label htmlFor="lineInstruction">{t("lineInstructionLabel")}</Label>
          <textarea id="lineInstruction" name="lineInstruction" rows={3} maxLength={2000} defaultValue={policy.lineInstruction ?? ""} className="border-input rounded-md border px-3 py-2" />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor="callModel">{t("callModelLabel")}</Label>
            <Input id="callModel" name="callModel" defaultValue={policy.callModel} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="callVoice">{t("callVoiceLabel")}</Label>
            <Input id="callVoice" name="callVoice" defaultValue={policy.callVoice} />
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="defaultMode">{t("defaultModeLabel")}</Label>
          <select id="defaultMode" name="defaultMode" defaultValue={policy.defaultMode} className="border-input rounded-md border px-3 py-2">
            <option value="supervised">{t("defaultModeOptions.supervised")}</option>
            <option value="autonomous">{t("defaultModeOptions.autonomous")}</option>
          </select>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="maxActionsPerReply">{t("maxActionsPerReplyLabel")}</Label>
          <Input id="maxActionsPerReply" name="maxActionsPerReply" type="number" min={1} max={50} defaultValue={policy.maxActionsPerReply} />
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-border p-5">
        <h2 className="font-medium">{t("toolsModeTitle")}</h2>
        <p className="text-sm text-muted-foreground">{t("toolsModeHint")}</p>
        <div className="flex flex-col gap-2">
          <Label htmlFor="confirmationMode">{t("confirmationModeLabel")}</Label>
          <select id="confirmationMode" name="confirmationMode" defaultValue={policy.confirmationMode} className="border-input rounded-md border px-3 py-2">
            <option value="always">{t("confirmationModeOptions.always")}</option>
            <option value="per_tool">{t("confirmationModeOptions.per_tool")}</option>
            <option value="read_only">{t("confirmationModeOptions.read_only")}</option>
          </select>
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-border p-5">
        <h2 className="font-medium">{t("afterCallTitle")}</h2>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="saveSummaryToThread" defaultChecked={policy.saveSummaryToThread} className="size-4 rounded border-input" />
          {t("saveSummaryToThreadLabel")}
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="syncCrm" defaultChecked={policy.syncCrm} className="size-4 rounded border-input" />
          {t("syncCrmLabel")}
        </label>
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-border p-5">
        <h2 className="font-medium">{t("escalationTitle")}</h2>
        <div className="flex flex-col gap-2">
          <Label htmlFor="escalationTarget">{t("escalationTargetLabel")}</Label>
          <Input id="escalationTarget" name="escalationTarget" maxLength={200} defaultValue={policy.escalationTarget ?? ""} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="escalationTriggerWords">{t("escalationTriggerWordsLabel")}</Label>
          <textarea id="escalationTriggerWords" name="escalationTriggerWords" rows={3} defaultValue={escalationWordsText} className="border-input rounded-md border px-3 py-2" />
        </div>
      </div>

      <Button type="submit">{t("save")}</Button>
    </form>
  );
}
