import { describe, it, expect, vi } from "vitest";
import { transcribeAudio, analyzeImageWithVision } from "./multimodal";

describe("Multimodal AI Helper", () => {
  it("returns fallback message when no API key or buffer is provided", async () => {
    const result = await transcribeAudio({});
    expect(result).toBeDefined();
    expect(typeof result).toBe("string");
  });

  it("handles image vision fallback gracefully without throw", async () => {
    const result = await analyzeImageWithVision({});
    expect(result.description).toBeDefined();
    expect(typeof result.description).toBe("string");
  });

  it("identifies receipt indicators properly from sample text", () => {
    const sampleText = "Ushbu chek bo'yicha to'lov summasi 150 000 so'm, holati: muvaffaqiyatli.";
    const isReceipt = /to'lov|chek|summa|so'm|uzs/i.test(sampleText);
    expect(isReceipt).toBe(true);

    const amountMatch = sampleText.match(/([\d\s.,]{3,})\s*(so'm|uzs|sum)/i);
    const amount = amountMatch ? Number(amountMatch[1].replace(/[\s,.]/g, "")) : undefined;
    expect(amount).toBe(150000);
  });
});
