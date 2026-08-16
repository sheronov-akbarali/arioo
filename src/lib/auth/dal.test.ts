import { describe, it, expect, vi, beforeEach } from "vitest";

const authMock = vi.fn();
const currentUserMock = vi.fn();

vi.mock("@clerk/nextjs/server", () => ({
  auth: () => authMock(),
  currentUser: () => currentUserMock(),
}));

vi.mock("@/db/client", () => ({ db: {} }));

import { getSession } from "./dal";

describe("getSession", () => {
  beforeEach(() => {
    authMock.mockReset();
    currentUserMock.mockReset();
  });

  it("returns null instead of throwing when Clerk's currentUser() call fails transiently", async () => {
    authMock.mockResolvedValue({ userId: "user_1" });
    currentUserMock.mockRejectedValue(new Error("Clerk API rate limited"));

    await expect(getSession()).resolves.toBeNull();
  });

  it("returns null when there is no authenticated user", async () => {
    authMock.mockResolvedValue({ userId: null });

    await expect(getSession()).resolves.toBeNull();
  });

  it("returns the session when Clerk succeeds", async () => {
    authMock.mockResolvedValue({ userId: "user_1" });
    currentUserMock.mockResolvedValue({
      primaryEmailAddress: { emailAddress: "a@b.com" },
      fullName: "Test User",
      username: "testuser",
      imageUrl: "https://example.com/a.png",
    });

    await expect(getSession()).resolves.toEqual({
      user: { id: "user_1", email: "a@b.com", name: "Test User", image: "https://example.com/a.png" },
    });
  });
});
