import { describe, it, expect } from "vitest";
import { hashAdminPassword, verifyAdminPassword } from "./password";

describe("admin password hashing", () => {
  it("verifies the correct password against its own hash", () => {
    const hash = hashAdminPassword("correct-horse-battery-staple");
    expect(verifyAdminPassword("correct-horse-battery-staple", hash)).toBe(true);
  });

  it("rejects an incorrect password", () => {
    const hash = hashAdminPassword("correct-horse-battery-staple");
    expect(verifyAdminPassword("wrong-password", hash)).toBe(false);
  });

  it("produces a different salt (and hash) on each call", () => {
    const a = hashAdminPassword("same-password");
    const b = hashAdminPassword("same-password");
    expect(a).not.toBe(b);
    expect(verifyAdminPassword("same-password", a)).toBe(true);
    expect(verifyAdminPassword("same-password", b)).toBe(true);
  });

  it("rejects a malformed stored hash", () => {
    expect(verifyAdminPassword("anything", "not-a-valid-hash")).toBe(false);
  });
});
