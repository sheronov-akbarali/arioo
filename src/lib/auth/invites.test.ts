import { describe, expect, it } from "vitest";
import { isInviteValid, parseInviteEmail } from "./invites";

describe("parseInviteEmail", () => {
  it("accepts a valid email", () => {
    expect(parseInviteEmail("teammate@example.com")).toEqual({
      success: true,
      data: "teammate@example.com",
    });
  });

  it("rejects an invalid email", () => {
    const result = parseInviteEmail("not-an-email");
    expect(result.success).toBe(false);
  });
});

describe("isInviteValid", () => {
  it("accepts a pending, unexpired invite", () => {
    const invite = { status: "pending", expiresAt: new Date(Date.now() + 86_400_000) };
    expect(isInviteValid(invite)).toBe(true);
  });

  it("rejects an already-accepted invite", () => {
    const invite = { status: "accepted", expiresAt: new Date(Date.now() + 86_400_000) };
    expect(isInviteValid(invite)).toBe(false);
  });

  it("rejects an expired invite", () => {
    const invite = { status: "pending", expiresAt: new Date(Date.now() - 1000) };
    expect(isInviteValid(invite)).toBe(false);
  });
});
