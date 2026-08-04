import { describe, expect, it } from "vitest";
import { parseConsultationInput } from "./schema";

describe("parseConsultationInput", () => {
  it("accepts a valid Uzbek phone number and name", () => {
    const result = parseConsultationInput({ name: "Akbarali", phone: "+998901234567" });
    expect(result).toEqual({ success: true, data: { name: "Akbarali", phone: "+998901234567" } });
  });

  it("rejects a name shorter than 2 characters", () => {
    const result = parseConsultationInput({ name: "A", phone: "+998901234567" });
    expect(result.success).toBe(false);
  });

  it("rejects a phone number not matching the +998XXXXXXXXX format", () => {
    const result = parseConsultationInput({ name: "Akbarali", phone: "901234567" });
    expect(result.success).toBe(false);
  });

  it("rejects non-object input", () => {
    const result = parseConsultationInput(null);
    expect(result.success).toBe(false);
  });
});
