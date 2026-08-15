import { describe, it, expect, vi, beforeEach } from "vitest";
import { getFacebookPageStats, type FacebookCredentials } from "./channel-stats";

const baseCredentials: FacebookCredentials = {
  accessToken: "EAAlong-lived",
  expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  pageAccessToken: "EAApage",
  pageId: "page123",
  pageName: "Arioo Do'kon",
};

function jsonResponse(body: unknown, ok = true, status = 200) {
  return { ok, status, json: async () => body };
}

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("getFacebookPageStats", () => {
  it("returns stats for an already-fresh token without re-exchanging", async () => {
    const exchange = vi.fn();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ name: "Arioo Do'kon", fan_count: 12500 }))
      .mockResolvedValueOnce(
        jsonResponse({
          data: [
            { name: "page_impressions", values: [{ value: 3400 }] },
            { name: "page_engaged_users", values: [{ value: 210 }] },
          ],
        })
      );
    vi.stubGlobal("fetch", fetchMock);

    const result = await getFacebookPageStats(baseCredentials, exchange);

    expect(exchange).not.toHaveBeenCalled();
    expect(result).toEqual({
      available: true,
      pageName: "Arioo Do'kon",
      fanCount: 12500,
      impressions: 3400,
      engagedUsers: 210,
      updatedCredentials: baseCredentials,
    });
  });

  it("re-exchanges an expiring token before fetching stats", async () => {
    const expiring: FacebookCredentials = { ...baseCredentials, expiresAt: new Date(Date.now() + 60 * 1000).toISOString() };
    const exchange = vi.fn().mockResolvedValue({
      accessToken: "EAArefreshed",
      expiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
    });
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ name: "Arioo Do'kon", fan_count: 5 }))
      .mockResolvedValueOnce(jsonResponse({ data: [] }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await getFacebookPageStats(expiring, exchange);

    expect(exchange).toHaveBeenCalledWith("EAAlong-lived");
    expect(result.available).toBe(true);
    if (result.available) {
      expect(result.updatedCredentials.accessToken).toBe("EAArefreshed");
    }
  });

  it("returns reauth_required when the exchange throws", async () => {
    const expired: FacebookCredentials = { ...baseCredentials, expiresAt: new Date(0).toISOString() };
    const exchange = vi.fn().mockRejectedValue(new Error("invalid token"));

    const result = await getFacebookPageStats(expired, exchange);

    expect(result).toEqual({ available: false, reason: "reauth_required" });
  });

  it("resolves the page lazily when missing from credentials", async () => {
    const withoutResolution: FacebookCredentials = {
      accessToken: baseCredentials.accessToken,
      expiresAt: baseCredentials.expiresAt,
    };
    const exchange = vi.fn();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ data: [{ id: "page999", name: "Sotuv Sahifasi", access_token: "page999token" }] }))
      .mockResolvedValueOnce(jsonResponse({ name: "Sotuv Sahifasi", fan_count: 42 }))
      .mockResolvedValueOnce(jsonResponse({ data: [] }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await getFacebookPageStats(withoutResolution, exchange);

    expect(result.available).toBe(true);
    if (result.available) {
      expect(result.updatedCredentials.pageId).toBe("page999");
      expect(result.updatedCredentials.pageAccessToken).toBe("page999token");
    }
  });

  it("returns no_page when the user manages no Facebook pages", async () => {
    const withoutResolution: FacebookCredentials = {
      accessToken: baseCredentials.accessToken,
      expiresAt: baseCredentials.expiresAt,
    };
    const exchange = vi.fn();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ data: [] })));

    const result = await getFacebookPageStats(withoutResolution, exchange);

    expect(result).toEqual({ available: false, reason: "no_page" });
  });

  it("returns reauth_required when the Graph API reports an invalid token error", async () => {
    const exchange = vi.fn();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse({ error: { message: "Invalid OAuth access token", code: 190 } }, false, 401))
    );

    const result = await getFacebookPageStats(baseCredentials, exchange);

    expect(result).toEqual({ available: false, reason: "reauth_required" });
  });

  it("returns unknown for any other API error", async () => {
    const exchange = vi.fn();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ error: { message: "Server error", code: 1 } }, false, 500)));

    const result = await getFacebookPageStats(baseCredentials, exchange);

    expect(result).toEqual({ available: false, reason: "unknown" });
  });
});
