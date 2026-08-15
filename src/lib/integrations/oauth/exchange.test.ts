import { describe, it, expect, vi, beforeEach } from "vitest";
import { exchangeCodeForToken, refreshAccessToken } from "./exchange";

describe("exchangeCodeForToken", () => {
  beforeEach(() => {
    process.env.GITHUB_CLIENT_ID = "gh_client";
    process.env.GITHUB_CLIENT_SECRET = "gh_secret";
    process.env.GOOGLE_CLIENT_ID = "g_client";
    process.env.GOOGLE_CLIENT_SECRET = "g_secret";
    process.env.NEXT_PUBLIC_APP_URL = "https://arioo.uz";
  });

  it("posts a form-urlencoded body to the provider token URL", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ access_token: "gho_abc123", token_type: "bearer" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await exchangeCodeForToken("github", "code123", {});

    expect(result.accessToken).toBe("gho_abc123");
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://github.com/login/oauth/access_token");
    expect(init.method).toBe("POST");
    expect(init.headers["Content-Type"]).toBe("application/x-www-form-urlencoded");
    expect(init.headers["Accept"]).toBe("application/json");
    const body = new URLSearchParams(init.body);
    expect(body.get("client_id")).toBe("gh_client");
    expect(body.get("grant_type")).toBe("authorization_code");
    expect(body.get("code")).toBe("code123");
  });

  it("computes expiresAt from expires_in when present", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ access_token: "ya29.abc", refresh_token: "1//refresh", expires_in: 3600 }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const before = Date.now();
    const result = await exchangeCodeForToken("google", "code123", {});
    const after = Date.now();

    expect(result.refreshToken).toBe("1//refresh");
    expect(result.expiresAt).toBeDefined();
    const expiresAtMs = new Date(result.expiresAt!).getTime();
    expect(expiresAtMs).toBeGreaterThanOrEqual(before + 3600 * 1000);
    expect(expiresAtMs).toBeLessThanOrEqual(after + 3600 * 1000);
  });

  it("throws for an unknown provider", async () => {
    await expect(exchangeCodeForToken("unknown", "code", {})).rejects.toThrow();
  });
});

describe("refreshAccessToken", () => {
  beforeEach(() => {
    process.env.GOOGLE_CLIENT_ID = "g_client";
    process.env.GOOGLE_CLIENT_SECRET = "g_secret";
  });

  it("posts a refresh_token grant and returns the new access token", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ access_token: "ya29.new", expires_in: 3600 }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await refreshAccessToken("google", "1//old-refresh");

    expect(result.accessToken).toBe("ya29.new");
    expect(result.expiresAt).toBeDefined();
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://oauth2.googleapis.com/token");
    const body = new URLSearchParams(init.body);
    expect(body.get("grant_type")).toBe("refresh_token");
    expect(body.get("refresh_token")).toBe("1//old-refresh");
  });

  it("falls back to the original refresh token when the response omits one", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ access_token: "ya29.new" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await refreshAccessToken("google", "1//old-refresh");

    expect(result.refreshToken).toBe("1//old-refresh");
  });

  it("throws when the token endpoint responds with an error status", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 400 }));
    await expect(refreshAccessToken("google", "1//old-refresh")).rejects.toThrow();
  });
});
