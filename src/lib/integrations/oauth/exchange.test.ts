import { describe, it, expect, vi, beforeEach } from "vitest";
import { exchangeCodeForToken } from "./exchange";

describe("exchangeCodeForToken", () => {
  beforeEach(() => {
    process.env.GITHUB_CLIENT_ID = "gh_client";
    process.env.GITHUB_CLIENT_SECRET = "gh_secret";
    process.env.NEXT_PUBLIC_APP_URL = "https://arioo.uz";
  });

  it("posts to the provider token URL and returns the access token", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ access_token: "gho_abc123", token_type: "bearer" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await exchangeCodeForToken("github", "code123", {});

    expect(result.accessToken).toBe("gho_abc123");
    expect(fetchMock).toHaveBeenCalledWith(
      "https://github.com/login/oauth/access_token",
      expect.objectContaining({ method: "POST" })
    );
  });

  it("throws for an unknown provider", async () => {
    await expect(exchangeCodeForToken("unknown", "code", {})).rejects.toThrow();
  });
});
