import { describe, expect, it } from "vitest";
import { parseAiCoreSettingsInput } from "./ai-core-schema";

const VALID_INPUT = {
  topP: "",
  temperature: "0.7",
  maxTokens: "2000",
  readOnlyMode: null,
  recentMessagesCount: "20",
  autoTitleGeneration: "on",
  semanticSearchEnabled: null,
  memoryIsolation: "user",
  memoryTemplateMode: "freeform",
  memoryTemplate: "",
  removeEmojis: null,
  removeMarkdown: null,
  interruptionMode: "queue",
  maxStepsWithoutTools: "1",
  maxStepsWithTools: "8",
};

describe("parseAiCoreSettingsInput", () => {
  it("accepts valid input and treats empty optional numbers as null", () => {
    const result = parseAiCoreSettingsInput(VALID_INPUT);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.topP).toBeNull();
      expect(result.data.temperature).toBe(0.7);
      expect(result.data.readOnlyMode).toBe(false);
      expect(result.data.autoTitleGeneration).toBe(true);
    }
  });

  it("rejects an unknown interruptionMode", () => {
    const result = parseAiCoreSettingsInput({ ...VALID_INPUT, interruptionMode: "bogus" });
    expect(result.success).toBe(false);
  });

  it("rejects temperature out of range", () => {
    const result = parseAiCoreSettingsInput({ ...VALID_INPUT, temperature: "5" });
    expect(result.success).toBe(false);
  });
});
