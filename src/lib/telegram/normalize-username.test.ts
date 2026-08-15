import { describe, it, expect } from "vitest";
import { normalizeTelegramUsername } from "./normalize-username";

describe("normalizeTelegramUsername", () => {
  it("accepts a bare username", () => {
    expect(normalizeTelegramUsername("Avtotest_Plus_Uz")).toBe("Avtotest_Plus_Uz");
  });

  it("strips a leading @", () => {
    expect(normalizeTelegramUsername("@Avtotest_Plus_Uz")).toBe("Avtotest_Plus_Uz");
  });

  it("extracts the username from a pasted t.me link", () => {
    expect(normalizeTelegramUsername("https://t.me/Avtotest_Plus_Uz")).toBe("Avtotest_Plus_Uz");
    expect(normalizeTelegramUsername("http://t.me/Avtotest_Plus_Uz")).toBe("Avtotest_Plus_Uz");
    expect(normalizeTelegramUsername("t.me/Avtotest_Plus_Uz")).toBe("Avtotest_Plus_Uz");
    expect(normalizeTelegramUsername("https://telegram.me/Avtotest_Plus_Uz")).toBe("Avtotest_Plus_Uz");
  });

  it("strips a trailing post id or query string from a link", () => {
    expect(normalizeTelegramUsername("https://t.me/Avtotest_Plus_Uz/123")).toBe("Avtotest_Plus_Uz");
    expect(normalizeTelegramUsername("https://t.me/Avtotest_Plus_Uz?start=1")).toBe("Avtotest_Plus_Uz");
  });

  it("returns null for empty input", () => {
    expect(normalizeTelegramUsername("   ")).toBeNull();
  });

  it("returns null for a private invite link", () => {
    expect(normalizeTelegramUsername("https://t.me/+AbCdEf123")).toBeNull();
    expect(normalizeTelegramUsername("https://t.me/joinchat/AbCdEf123")).toBeNull();
  });
});
