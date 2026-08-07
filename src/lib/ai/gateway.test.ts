import { describe, expect, it } from "vitest";
import { estimateCostUsd, type GatewayModel } from "./gateway";

describe("estimateCostUsd", () => {
  const models: GatewayModel[] = [
    {
      id: "anthropic/claude-sonnet-4.5",
      name: "Claude Sonnet 4.5",
      pricing: { input: "0.000003", output: "0.000015" },
    },
    { id: "openai/gpt-5.4", name: "GPT-5.4" },
  ];

  it("computes cost from input/output token pricing", () => {
    const cost = estimateCostUsd(models, "anthropic/claude-sonnet-4.5", {
      inputTokens: 1000,
      outputTokens: 500,
    });
    expect(cost).toBeCloseTo(1000 * 0.000003 + 500 * 0.000015, 10);
  });

  it("returns null when the model has no pricing info", () => {
    const cost = estimateCostUsd(models, "openai/gpt-5.4", { inputTokens: 100, outputTokens: 50 });
    expect(cost).toBeNull();
  });

  it("returns null for an unknown model id", () => {
    const cost = estimateCostUsd(models, "unknown/model", { inputTokens: 100, outputTokens: 50 });
    expect(cost).toBeNull();
  });
});
