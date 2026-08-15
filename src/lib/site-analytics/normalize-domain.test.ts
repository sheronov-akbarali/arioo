import { describe, it, expect } from "vitest";
import { normalizeDomain } from "./normalize-domain";

describe("normalizeDomain", () => {
  it("accepts a bare hostname", () => {
    expect(normalizeDomain("example.uz")).toBe("example.uz");
  });

  it("strips protocol, path, query and trailing slash", () => {
    expect(normalizeDomain("https://Example.uz/pricing?ref=x")).toBe("example.uz");
    expect(normalizeDomain("http://example.uz/")).toBe("example.uz");
  });

  it("strips a port", () => {
    expect(normalizeDomain("example.uz:3000")).toBe("example.uz");
  });

  it("accepts subdomains", () => {
    expect(normalizeDomain("shop.example.uz")).toBe("shop.example.uz");
  });

  it("rejects empty input", () => {
    expect(normalizeDomain("   ")).toBeNull();
  });

  it("rejects a single-label host with no dot", () => {
    expect(normalizeDomain("localhost")).toBeNull();
  });

  it("rejects garbage input", () => {
    expect(normalizeDomain("not a domain!!")).toBeNull();
  });
});
