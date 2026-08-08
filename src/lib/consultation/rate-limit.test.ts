import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { checkRateLimit, __rateLimitSizeForTests } from "./rate-limit";

describe("checkRateLimit", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("allows the first request for a key", () => {
    expect(checkRateLimit("1.2.3.4-a")).toBe(true);
  });

  it("blocks a second request within the window", () => {
    checkRateLimit("1.2.3.4-b");
    expect(checkRateLimit("1.2.3.4-b")).toBe(false);
  });

  it("allows a request again after the window passes", () => {
    checkRateLimit("1.2.3.4-c");
    vi.setSystemTime(new Date("2026-01-01T00:00:31Z"));
    expect(checkRateLimit("1.2.3.4-c")).toBe(true);
  });

  it("evicts entries older than the window instead of growing forever", () => {
    // Start well past every key recorded by the tests above so the first call
    // here sweeps them out and the Map size is deterministic.
    const base = Date.parse("2026-01-01T02:00:00Z");
    vi.setSystemTime(new Date(base));
    for (let i = 0; i < 50; i++) {
      checkRateLimit(`10.0.0.${i}-evict`);
    }
    expect(__rateLimitSizeForTests()).toBe(50);

    // Past the window, a single call for an unrelated key must sweep all 50
    // stale entries out of the Map, leaving only the key just recorded.
    vi.setSystemTime(new Date(base + 31_000));
    expect(checkRateLimit("10.0.0.254-sweeper")).toBe(true);
    expect(__rateLimitSizeForTests()).toBe(1);
  });

  it("keeps rate limiting correct for a key across many windows", () => {
    let t = Date.parse("2026-01-01T03:00:00Z");
    for (let cycle = 0; cycle < 5; cycle++) {
      vi.setSystemTime(new Date(t));
      expect(checkRateLimit("1.2.3.4-cycles")).toBe(true);

      vi.setSystemTime(new Date(t + 1_000));
      expect(checkRateLimit("1.2.3.4-cycles")).toBe(false);

      t += 31_000;
    }
    // Only the single live entry for this key should remain.
    expect(__rateLimitSizeForTests()).toBe(1);
  });
});
