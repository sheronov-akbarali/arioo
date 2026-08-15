import { describe, it, expect, vi, beforeEach } from "vitest";
import { getInstagramChannelStats, type InstagramCredentials } from "./channel-stats";

const baseCredentials: InstagramCredentials = {
  accessToken: "EAAlong-lived",
  expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  pageAccessToken: "EAApage",
  igUserId: "ig123",
  username: "arioo_uz",
};

function jsonResponse(body: unknown, ok = true, status = 200) {
  return { ok, status, json: async () => body };
}

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("getInstagramChannelStats", () => {
  it("returns stats for an already-fresh token without re-exchanging", async () => {
    const exchange = vi.fn();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ username: "arioo_uz", followers_count: 45200, media_count: 120 }))
      .mockResolvedValueOnce(
        jsonResponse({
          data: [
            { name: "reach", values: [{ value: 12000 }] },
            { name: "profile_views", values: [{ value: 850 }] },
          ],
        })
      );
    vi.stubGlobal("fetch", fetchMock);

    const result = await getInstagramChannelStats(baseCredentials, exchange);

    expect(exchange).not.toHaveBeenCalled();
    expect(result).toEqual({
      available: true,
      username: "arioo_uz",
      followersCount: 45200,
      mediaCount: 120,
      reach: 12000,
      profileViews: 850,
      updatedCredentials: baseCredentials,
    });
  });

  it("re-exchanges an expiring token before fetching stats", async () => {
    const expiring: InstagramCredentials = {
      ...baseCredentials,
      expiresAt: new Date(Date.now() + 60 * 1000).toISOString(),
    };
    const exchange = vi.fn().mockResolvedValue({
      accessToken: "EAArefreshed",
      expiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
    });
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ username: "arioo_uz", followers_count: 10, media_count: 1 }))
      .mockResolvedValueOnce(jsonResponse({ data: [] }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await getInstagramChannelStats(expiring, exchange);

    expect(exchange).toHaveBeenCalledWith("EAAlong-lived");
    expect(result.available).toBe(true);
    if (result.available) {
      expect(result.updatedCredentials.accessToken).toBe("EAArefreshed");
    }
  });

  it("returns reauth_required when the exchange throws", async () => {
    const expired: InstagramCredentials = { ...baseCredentials, expiresAt: new Date(0).toISOString() };
    const exchange = vi.fn().mockRejectedValue(new Error("invalid token"));

    const result = await getInstagramChannelStats(expired, exchange);

    expect(result).toEqual({ available: false, reason: "reauth_required" });
  });

  it("resolves the business account lazily when missing from credentials", async () => {
    const withoutResolution: InstagramCredentials = {
      accessToken: baseCredentials.accessToken,
      expiresAt: baseCredentials.expiresAt,
    };
    const exchange = vi.fn();
    const fetchMock = vi
      .fn()
      // me/accounts
      .mockResolvedValueOnce(
        jsonResponse({
          data: [
            { id: "page1", access_token: "page1token", instagram_business_account: undefined },
            { id: "page2", access_token: "page2token", instagram_business_account: { id: "ig999" } },
          ],
        })
      )
      // profile
      .mockResolvedValueOnce(jsonResponse({ username: "second_page", followers_count: 5, media_count: 2 }))
      // insights
      .mockResolvedValueOnce(jsonResponse({ data: [] }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await getInstagramChannelStats(withoutResolution, exchange);

    expect(result.available).toBe(true);
    if (result.available) {
      expect(result.updatedCredentials.igUserId).toBe("ig999");
      expect(result.updatedCredentials.pageAccessToken).toBe("page2token");
    }
    const profileCallUrl = fetchMock.mock.calls[1][0] as URL;
    expect(profileCallUrl.toString()).toContain("/ig999?");
  });

  it("returns no_business_account when no connected page has an Instagram account", async () => {
    const withoutResolution: InstagramCredentials = {
      accessToken: baseCredentials.accessToken,
      expiresAt: baseCredentials.expiresAt,
    };
    const exchange = vi.fn();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse({ data: [{ id: "page1", access_token: "page1token", instagram_business_account: undefined }] })
      )
    );

    const result = await getInstagramChannelStats(withoutResolution, exchange);

    expect(result).toEqual({ available: false, reason: "no_business_account" });
  });

  it("returns reauth_required when the Graph API reports an invalid token error", async () => {
    const exchange = vi.fn();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse({ error: { message: "Invalid OAuth access token", code: 190 } }, false, 401))
    );

    const result = await getInstagramChannelStats(baseCredentials, exchange);

    expect(result).toEqual({ available: false, reason: "reauth_required" });
  });

  it("returns unknown for any other API error", async () => {
    const exchange = vi.fn();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ error: { message: "Server error", code: 1 } }, false, 500)));

    const result = await getInstagramChannelStats(baseCredentials, exchange);

    expect(result).toEqual({ available: false, reason: "unknown" });
  });
});
