import { getTranslations } from "next-intl/server";
import { requireAgent } from "@/lib/auth/dal";
import { getOrCreateChatSettings } from "@/lib/agents/settings";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { updateChatSettingsAction } from "./actions";

type StopWordRule = { word: string; action: "block" | "flag" };

export default async function AssistantChatsTabPage({
  params,
}: {
  params: Promise<{ locale: string; agentId: string }>;
}) {
  const { locale, agentId } = await params;
  const { agent } = await requireAgent(locale, agentId);
  const settings = await getOrCreateChatSettings(agent.id);
  const t = await getTranslations("assistants.detail.chats");
  const action = updateChatSettingsAction.bind(null, locale, agent.id);
  const stopWordsText = (settings.stopWordRules as StopWordRule[]).map((rule) => rule.word).join("\n");

  return (
    <form action={action} className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 rounded-2xl border border-border p-5">
        <div>
          <h2 className="font-medium">{t("profileTitle")}</h2>
          <p className="text-sm text-muted-foreground">{t("profileSubtitle")}</p>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="description">{t("descriptionLabel")}</Label>
          <textarea id="description" name="description" rows={2} maxLength={2000} defaultValue={settings.description ?? ""} className="border-input rounded-md border px-3 py-2" />
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-border p-5">
        <h2 className="font-medium">{t("basicSettingsTitle")}</h2>
        <div className="flex flex-col gap-2">
          <Label htmlFor="greetingMessage">{t("greetingMessageLabel")}</Label>
          <textarea id="greetingMessage" name="greetingMessage" rows={2} maxLength={2000} defaultValue={settings.greetingMessage ?? ""} className="border-input rounded-md border px-3 py-2" />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor="replyDelaySeconds">{t("replyDelaySecondsLabel")}</Label>
            <Input id="replyDelaySeconds" name="replyDelaySeconds" type="number" min={0} max={300} defaultValue={settings.replyDelaySeconds} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="timezone">{t("timezoneLabel")}</Label>
            <Input id="timezone" name="timezone" placeholder="Asia/Tashkent" defaultValue={settings.timezone ?? ""} />
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-border p-5">
        <h2 className="font-medium">{t("voiceListeningTitle")}</h2>
        <div className="flex flex-col gap-2">
          <Label htmlFor="voiceReaction">{t("voiceReactionLabel")}</Label>
          <select id="voiceReaction" name="voiceReaction" defaultValue={settings.voiceReaction} className="border-input rounded-md border px-3 py-2">
            <option value="none">{t("voiceReactionOptions.none")}</option>
            <option value="reply_text">{t("voiceReactionOptions.reply_text")}</option>
            <option value="reply_voice">{t("voiceReactionOptions.reply_voice")}</option>
          </select>
        </div>
        <input type="hidden" name="textReaction" value="reply_text" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor="ttsVoice">{t("ttsVoiceLabel")}</Label>
            <Input id="ttsVoice" name="ttsVoice" defaultValue={settings.ttsVoice} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="ttsModel">{t("ttsModelLabel")}</Label>
            <Input id="ttsModel" name="ttsModel" defaultValue={settings.ttsModel} />
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="voiceReactionText">{t("voiceReactionTextLabel")}</Label>
          <Input id="voiceReactionText" name="voiceReactionText" maxLength={100} defaultValue={settings.voiceReactionText ?? ""} />
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-border p-5">
        <h2 className="font-medium">{t("limitsTitle")}</h2>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="limitsEnabled" defaultChecked={settings.limitsEnabled} className="size-4 rounded border-input" />
          {t("limitsEnabledLabel")}
        </label>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor="limitType">{t("limitTypeLabel")}</Label>
            <select id="limitType" name="limitType" defaultValue={settings.limitType ?? ""} className="border-input rounded-md border px-3 py-2">
              <option value="">{t("limitTypeOptions.none")}</option>
              <option value="messages">{t("limitTypeOptions.messages")}</option>
              <option value="tokens">{t("limitTypeOptions.tokens")}</option>
              <option value="workens">{t("limitTypeOptions.workens")}</option>
            </select>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="limitValue">{t("limitValueLabel")}</Label>
            <Input id="limitValue" name="limitValue" type="number" min={0} defaultValue={settings.limitValue ?? ""} />
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="limitMessage">{t("limitMessageLabel")}</Label>
          <Input id="limitMessage" name="limitMessage" maxLength={500} defaultValue={settings.limitMessage ?? ""} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="stopWords">{t("stopWordsLabel")}</Label>
          <textarea id="stopWords" name="stopWords" rows={4} defaultValue={stopWordsText} className="border-input rounded-md border px-3 py-2" />
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-border p-5">
        <h2 className="font-medium">{t("triggersTitle")}</h2>
        <div className="flex flex-col gap-2">
          <Label htmlFor="operatorTrigger">{t("operatorTriggerLabel")}</Label>
          <select id="operatorTrigger" name="operatorTrigger" defaultValue={settings.operatorTrigger} className="border-input rounded-md border px-3 py-2">
            <option value="keep_going">{t("operatorTriggerOptions.keep_going")}</option>
            <option value="pause">{t("operatorTriggerOptions.pause")}</option>
          </select>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="pauseDurationMinutes">{t("pauseDurationMinutesLabel")}</Label>
          <Input id="pauseDurationMinutes" name="pauseDurationMinutes" type="number" min={1} max={1440} defaultValue={settings.pauseDurationMinutes} />
        </div>
      </div>

      <Button type="submit">{t("save")}</Button>
    </form>
  );
}
