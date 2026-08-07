import { describe, expect, it } from "vitest";
import { canResolve } from "./transitions";

describe("canResolve", () => {
  it("allows resolving a pending approval", () => {
    expect(canResolve("pending")).toBe(true);
  });

  it("rejects resolving an already-approved approval", () => {
    expect(canResolve("approved")).toBe(false);
  });

  it("rejects resolving an expired approval", () => {
    expect(canResolve("expired")).toBe(false);
  });
});
