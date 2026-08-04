import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { checkRateLimit } from "./rate-limit";

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
});
