import { describe, it, expect } from "vitest";
import { synthesizeSpeech } from "./tts-stt";

describe("TTS & Speech Synthesizer", () => {
  it("returns audio payload for text input gracefully", async () => {
    const result = await synthesizeSpeech({
      text: "Assalomu alaykum! Arioo AI xizmatiga xush kelibsiz.",
      language: "uz",
    });

    expect(result).toBeDefined();
    expect(result.audioBase64).toContain("data:audio/mp3;base64,");
    expect(result.mimeType).toBe("audio/mp3");
  });

  it("handles empty text without error", async () => {
    const result = await synthesizeSpeech({ text: "" });
    expect(result.audioBase64).toBe("");
  });
});
