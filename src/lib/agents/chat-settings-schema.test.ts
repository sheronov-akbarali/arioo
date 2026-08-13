import { describe, expect, it } from "vitest";
import { parseChatSettingsInput } from "./chat-settings-schema";

const VALID_INPUT = {
  description: "",
  greetingMessage: "Salom!",
  replyDelaySeconds: "0",
  timezone: "Asia/Tashkent",
  voiceReaction: "none",
  textReaction: "reply_text",
  ttsVoice: "alloy",
  ttsModel: "tts-1",
  voiceReactionText: "",
  limitsEnabled: null,
  limitType: "",
  limitValue: "",
  limitMessage: "",
  stopWordRules: [{ word: "spam", action: "block" }],
  operatorTrigger: "keep_going",
  pauseDurationMinutes: "5",
};

describe("parseChatSettingsInput", () => {
  it("accepts valid input", () => {
    const result = parseChatSettingsInput(VALID_INPUT);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.limitType).toBeNull();
      expect(result.data.stopWordRules).toEqual([{ word: "spam", action: "block" }]);
    }
  });

  it("rejects an unknown voiceReaction", () => {
    const result = parseChatSettingsInput({ ...VALID_INPUT, voiceReaction: "bogus" });
    expect(result.success).toBe(false);
  });

  it("rejects a negative replyDelaySeconds", () => {
    const result = parseChatSettingsInput({ ...VALID_INPUT, replyDelaySeconds: "-1" });
    expect(result.success).toBe(false);
  });
});
