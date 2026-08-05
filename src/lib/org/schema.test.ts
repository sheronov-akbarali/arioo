import { describe, expect, it } from "vitest";
import { parseOrganizationInput } from "./schema";

describe("parseOrganizationInput", () => {
  it("accepts a valid name and industry", () => {
    const result = parseOrganizationInput({ name: "Tayanch Do'kon", industry: "retail" });
    expect(result).toEqual({
      success: true,
      data: { name: "Tayanch Do'kon", industry: "retail" },
    });
  });

  it("rejects an empty name", () => {
    const result = parseOrganizationInput({ name: "", industry: "retail" });
    expect(result.success).toBe(false);
  });

  it("rejects an unknown industry", () => {
    const result = parseOrganizationInput({ name: "Do'kon", industry: "not-a-real-industry" });
    expect(result.success).toBe(false);
  });
});
