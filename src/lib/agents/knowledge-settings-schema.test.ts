import { describe, expect, it } from "vitest";
import { parseKnowledgeSettingsInput } from "./knowledge-settings-schema";

const VALID_INPUT = {
  embeddingModel: "text-embedding-3-small",
  relevanceThreshold: "0.85",
  maxResults: "10",
  maxContextTokens: "4000",
  aggregationStrategy: "merge",
};

describe("parseKnowledgeSettingsInput", () => {
  it("accepts valid input", () => {
    const result = parseKnowledgeSettingsInput(VALID_INPUT);
    expect(result.success).toBe(true);
  });

  it("rejects relevanceThreshold above 1", () => {
    const result = parseKnowledgeSettingsInput({ ...VALID_INPUT, relevanceThreshold: "1.5" });
    expect(result.success).toBe(false);
  });

  it("rejects an unknown aggregationStrategy", () => {
    const result = parseKnowledgeSettingsInput({ ...VALID_INPUT, aggregationStrategy: "bogus" });
    expect(result.success).toBe(false);
  });
});
