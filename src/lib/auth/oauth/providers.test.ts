import { afterEach, describe, expect, it, vi } from "vitest";
import { buildAuthorizeUrl, exchangeCodeForProfile } from "./providers";

describe("buildAuthorizeUrl", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("builds a Google authorize URL with client_id, redirect_uri and state", () => {
    vi.stubEnv("GOOGLE_CLIENT_ID", "google-client-id");
    const url = new URL(
      buildAuthorizeUrl("google", "abc123", "https://tayanchai.uz/api/auth/google/callback"),
    );
    expect(url.origin + url.pathname).toBe("https://accounts.google.com/o/oauth2/v2/auth");
    expect(url.searchParams.get("client_id")).toBe("google-client-id");
    expect(url.searchParams.get("redirect_uri")).toBe(
      "https://tayanchai.uz/api/auth/google/callback",
    );
    expect(url.searchParams.get("state")).toBe("abc123");
  });

  it("builds a GitHub authorize URL", () => {
    vi.stubEnv("GITHUB_CLIENT_ID", "github-client-id");
    const url = new URL(
      buildAuthorizeUrl("github", "xyz789", "https://tayanchai.uz/api/auth/github/callback"),
    );
    expect(url.origin + url.pathname).toBe("https://github.com/login/oauth/authorize");
    expect(url.searchParams.get("client_id")).toBe("github-client-id");
  });
});

describe("exchangeCodeForProfile", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("exchanges a Google code and returns a normalized profile", async () => {
    vi.stubEnv("GOOGLE_CLIENT_ID", "id");
    vi.stubEnv("GOOGLE_CLIENT_SECRET", "secret");
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ access_token: "tok" }) })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ sub: "g-123", email: "a@b.com", name: "Akbarali", picture: "http://img" }),
      });
    vi.stubGlobal("fetch", fetchMock);

    const profile = await exchangeCodeForProfile(
      "google",
      "the-code",
      "https://tayanchai.uz/api/auth/google/callback",
    );

    expect(profile).toEqual({
      providerAccountId: "g-123",
      email: "a@b.com",
      name: "Akbarali",
      image: "http://img",
    });
  });

  it("returns null when the token exchange fails", async () => {
    vi.stubEnv("GOOGLE_CLIENT_ID", "id");
    vi.stubEnv("GOOGLE_CLIENT_SECRET", "secret");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false }));

    const profile = await exchangeCodeForProfile("google", "bad-code", "https://x/callback");
    expect(profile).toBeNull();
  });

  it("returns null when fetch throws", async () => {
    vi.stubEnv("GOOGLE_CLIENT_ID", "id");
    vi.stubEnv("GOOGLE_CLIENT_SECRET", "secret");
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));

    const profile = await exchangeCodeForProfile("google", "code", "https://x/callback");
    expect(profile).toBeNull();
  });
});
