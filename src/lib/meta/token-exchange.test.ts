import { describe, it, expect, vi, beforeEach } from "vitest";
import { exchangeLongLivedToken } from "./token-exchange";

function jsonResponse(body: unknown, ok = true, status = 200) {
  return { ok, status, json: async () => body };
}

beforeEach(() => {
  vi.restoreAllMocks();
  process.env.META_CLIENT_ID = "meta_client";
  process.env.META_CLIENT_SECRET = "meta_secret";
});

describe("exchangeLongLivedToken", () => {
  it.each(["instagram", "facebook"] as const)("requests a long-lived token for %s", async (provider) => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ access_token: "EAAlong", expires_in: 5184000 }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await exchangeLongLivedToken(provider, "EAAshort");

    expect(result.accessToken).toBe("EAAlong");
    expect(result.expiresAt).toBeDefined();
    const url = fetchMock.mock.calls[0][0] as URL;
    expect(url.toString()).toContain("grant_type=fb_exchange_token");
    expect(url.toString()).toContain("fb_exchange_token=EAAshort");
  });

  it("throws when the response has no access_token", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ error: { message: "bad token" } }, false, 400)));

    await expect(exchangeLongLivedToken("instagram", "EAAshort")).rejects.toThrow("bad token");
  });
});
