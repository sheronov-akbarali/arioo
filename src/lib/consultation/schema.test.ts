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

  it("reports which field failed so the UI can pick a specific message", () => {
    const badPhone = parseConsultationInput({ name: "Akbarali", phone: "901234567" });
    expect(badPhone.success === false && badPhone.field).toBe("phone");

    const badName = parseConsultationInput({ name: "A", phone: "+998901234567" });
    expect(badName.success === false && badName.field).toBe("name");
  });

  it("rejects a name containing newlines that could forge Telegram lines", () => {
    const result = parseConsultationInput({
      name: "Akbarali\nTelefon: +998900000000",
      phone: "+998901234567",
    });
    expect(result.success).toBe(false);
    expect(result.success === false && result.field).toBe("name");
  });

  it("rejects a name containing a carriage return", () => {
    const result = parseConsultationInput({ name: "Ak\rbarali", phone: "+998901234567" });
    expect(result.success).toBe(false);
  });

  it("accepts a valid input without a source", () => {
    const result = parseConsultationInput({ name: "Akbarali", phone: "+998901234567" });
    expect(result).toEqual({
      success: true,
      data: { name: "Akbarali", phone: "+998901234567" },
    });
  });

  it("accepts a valid input with an optional source", () => {
    const result = parseConsultationInput({
      name: "Akbarali",
      phone: "+998901234567",
      source: "partners",
    });
    expect(result).toEqual({
      success: true,
      data: { name: "Akbarali", phone: "+998901234567", source: "partners" },
    });
  });

  it("rejects a source longer than 40 characters", () => {
    const result = parseConsultationInput({
      name: "Akbarali",
      phone: "+998901234567",
      source: "a".repeat(41),
    });
    expect(result.success).toBe(false);
  });

  it("rejects a source containing newlines that could forge Telegram lines", () => {
    const result = parseConsultationInput({
      name: "Akbarali",
      phone: "+998901234567",
      source: "x\nIsm: Fake\nTelefon: +998000000000",
    });
    expect(result.success).toBe(false);
  });
});
