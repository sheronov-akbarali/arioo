import { describe, it, expect, beforeEach } from "vitest";
import { hashVisitor } from "./visitor-hash";

beforeEach(() => {
  process.env.SITE_ANALYTICS_SALT = "test-salt";
});

describe("hashVisitor", () => {
  it("is deterministic for the same ip/UA/day", () => {
    const day = new Date("2026-08-15T10:00:00Z");
    const a = hashVisitor("1.2.3.4", "Mozilla/5.0", day);
    const b = hashVisitor("1.2.3.4", "Mozilla/5.0", day);
    expect(a).toBe(b);
  });

  it("differs across days for the same ip/UA", () => {
    const day1 = hashVisitor("1.2.3.4", "Mozilla/5.0", new Date("2026-08-15T10:00:00Z"));
    const day2 = hashVisitor("1.2.3.4", "Mozilla/5.0", new Date("2026-08-16T10:00:00Z"));
    expect(day1).not.toBe(day2);
  });

  it("differs across salts for the same ip/UA/day", () => {
    const day = new Date("2026-08-15T10:00:00Z");
    process.env.SITE_ANALYTICS_SALT = "salt-a";
    const a = hashVisitor("1.2.3.4", "Mozilla/5.0", day);
    process.env.SITE_ANALYTICS_SALT = "salt-b";
    const b = hashVisitor("1.2.3.4", "Mozilla/5.0", day);
    expect(a).not.toBe(b);
  });

  it("differs across visitors on the same day", () => {
    const day = new Date("2026-08-15T10:00:00Z");
    const a = hashVisitor("1.2.3.4", "Mozilla/5.0", day);
    const b = hashVisitor("5.6.7.8", "Mozilla/5.0", day);
    expect(a).not.toBe(b);
  });

  it("throws when SITE_ANALYTICS_SALT is not set", () => {
    delete process.env.SITE_ANALYTICS_SALT;
    expect(() => hashVisitor("1.2.3.4", "Mozilla/5.0")).toThrow("SITE_ANALYTICS_SALT");
  });
});
