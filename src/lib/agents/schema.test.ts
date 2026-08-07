import { describe, expect, it } from "vitest";
import { parseAgentInput } from "./schema";

describe("parseAgentInput", () => {
  it("accepts a valid agent", () => {
    const result = parseAgentInput({
      name: "Sotuv boti",
      role: "sales",
      systemPrompt: "Siz TayanchAI mijozlariga yordam beruvchi sotuv assistentisiz.",
      model: "anthropic/claude-sonnet-4.5",
    });
    expect(result.success).toBe(true);
  });

  it("rejects an unknown role", () => {
    const result = parseAgentInput({
      name: "Bot",
      role: "not-a-real-role",
      systemPrompt: "Yetarlicha uzun tizim prompti bu yerda.",
      model: "anthropic/claude-sonnet-4.5",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a too-short system prompt", () => {
    const result = parseAgentInput({
      name: "Bot",
      role: "sales",
      systemPrompt: "qisqa",
      model: "anthropic/claude-sonnet-4.5",
    });
    expect(result.success).toBe(false);
  });
});
