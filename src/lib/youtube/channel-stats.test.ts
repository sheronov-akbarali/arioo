import { describe, it, expect, vi, beforeEach } from "vitest";
import { getYoutubeChannelStats, type YoutubeCredentials } from "./channel-stats";

const baseCredentials: YoutubeCredentials = {
  accessToken: "ya29.valid",
  refreshToken: "1//refresh",
  expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
  channelId: "UC123",
  channelTitle: "Arioo Channel",
};

function jsonResponse(body: unknown, ok = true, status = 200) {
  return { ok, status, json: async () => body };
}

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("getYoutubeChannelStats", () => {
  it("returns stats for an already-fresh token without refreshing", async () => {
    const refresh = vi.fn();
    const fetchMock = vi
      .fn()
      // channels?part=statistics
      .mockResolvedValueOnce(
        jsonResponse({ items: [{ statistics: { subscriberCount: "1200", viewCount: "45000", videoCount: "37" } }] })
      )
      // search?type=video
      .mockResolvedValueOnce(jsonResponse({ items: [{ id: { videoId: "vid1" } }, { id: { videoId: "vid2" } }] }))
      // videos?part=snippet,statistics
      .mockResolvedValueOnce(
        jsonResponse({
          items: [
            { id: "vid1", snippet: { title: "Video One" }, statistics: { viewCount: "500" } },
            { id: "vid2", snippet: { title: "Video Two" }, statistics: { viewCount: "300" } },
          ],
        })
      );
    vi.stubGlobal("fetch", fetchMock);

    const result = await getYoutubeChannelStats(baseCredentials, refresh);

    expect(refresh).not.toHaveBeenCalled();
    expect(result).toEqual({
      available: true,
      channelTitle: "Arioo Channel",
      subscriberCount: 1200,
      viewCount: 45000,
      videoCount: 37,
      recentVideos: [
        { id: "vid1", title: "Video One", viewCount: 500 },
        { id: "vid2", title: "Video Two", viewCount: 300 },
      ],
      updatedCredentials: baseCredentials,
    });

    // The search.list call must include the required `part` parameter, or
    // Google returns HTTP 400 missingRequiredParameter on every real call.
    const searchCallUrl = fetchMock.mock.calls[1][0] as URL;
    expect(searchCallUrl.toString()).toContain("part=id");
  });

  it("refreshes an expired token before fetching stats", async () => {
    const expired: YoutubeCredentials = {
      ...baseCredentials,
      expiresAt: new Date(Date.now() - 60 * 1000).toISOString(),
    };
    const refresh = vi.fn().mockResolvedValue({
      accessToken: "ya29.refreshed",
      expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    });
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse({ items: [{ statistics: { subscriberCount: "10", viewCount: "20", videoCount: "1" } }] })
      )
      .mockResolvedValueOnce(jsonResponse({ items: [] }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await getYoutubeChannelStats(expired, refresh);

    expect(refresh).toHaveBeenCalledWith("1//refresh");
    expect(result.available).toBe(true);
    if (result.available) {
      expect(result.updatedCredentials.accessToken).toBe("ya29.refreshed");
      expect(result.updatedCredentials.refreshToken).toBe("1//refresh");
    }
    // Authorization header on the first Data API call used the refreshed token.
    const firstCallHeaders = fetchMock.mock.calls[0][1].headers;
    expect(firstCallHeaders.Authorization).toBe("Bearer ya29.refreshed");
  });

  it("returns reauth_required when there is no refresh token and the access token expired", async () => {
    const expired: YoutubeCredentials = { ...baseCredentials, refreshToken: undefined, expiresAt: new Date(0).toISOString() };
    const refresh = vi.fn();

    const result = await getYoutubeChannelStats(expired, refresh);

    expect(refresh).not.toHaveBeenCalled();
    expect(result).toEqual({ available: false, reason: "reauth_required" });
  });

  it("returns reauth_required when refreshing throws", async () => {
    const expired: YoutubeCredentials = { ...baseCredentials, expiresAt: new Date(0).toISOString() };
    const refresh = vi.fn().mockRejectedValue(new Error("invalid_grant"));

    const result = await getYoutubeChannelStats(expired, refresh);

    expect(result).toEqual({ available: false, reason: "reauth_required" });
  });

  it("fetches the channel id lazily when missing from credentials", async () => {
    const withoutChannelId: YoutubeCredentials = { ...baseCredentials, channelId: undefined, channelTitle: undefined };
    const refresh = vi.fn();
    const fetchMock = vi
      .fn()
      // channels?mine=true
      .mockResolvedValueOnce(jsonResponse({ items: [{ id: "UC999", snippet: { title: "My Channel" } }] }))
      // channels?part=statistics
      .mockResolvedValueOnce(
        jsonResponse({ items: [{ statistics: { subscriberCount: "5", viewCount: "10", videoCount: "2" } }] })
      )
      // search
      .mockResolvedValueOnce(jsonResponse({ items: [] }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await getYoutubeChannelStats(withoutChannelId, refresh);

    expect(result.available).toBe(true);
    if (result.available) {
      expect(result.updatedCredentials.channelId).toBe("UC999");
      expect(result.updatedCredentials.channelTitle).toBe("My Channel");
    }
    const statsCallUrl = fetchMock.mock.calls[1][0] as URL;
    expect(statsCallUrl.toString()).toContain("id=UC999");
  });

  it("returns quota_exceeded when the Data API reports quotaExceeded", async () => {
    const refresh = vi.fn();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse({ error: { errors: [{ reason: "quotaExceeded" }] } }, false, 403)
      )
    );

    const result = await getYoutubeChannelStats(baseCredentials, refresh);

    expect(result).toEqual({ available: false, reason: "quota_exceeded" });
  });

  it("returns unknown for any other API error", async () => {
    const refresh = vi.fn();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({}, false, 500)));

    const result = await getYoutubeChannelStats(baseCredentials, refresh);

    expect(result).toEqual({ available: false, reason: "unknown" });
  });

  it("returns reauth_required when the Data API responds with HTTP 401", async () => {
    const refresh = vi.fn();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({}, false, 401)));

    const result = await getYoutubeChannelStats(baseCredentials, refresh);

    expect(result).toEqual({ available: false, reason: "reauth_required" });
  });

  it("refreshes when expiresAt is missing", async () => {
    const missingExpiry: YoutubeCredentials = { ...baseCredentials, expiresAt: undefined };
    const refresh = vi.fn().mockResolvedValue({
      accessToken: "ya29.refreshed",
      expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    });
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse({ items: [{ statistics: { subscriberCount: "10", viewCount: "20", videoCount: "1" } }] })
      )
      .mockResolvedValueOnce(jsonResponse({ items: [] }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await getYoutubeChannelStats(missingExpiry, refresh);

    expect(refresh).toHaveBeenCalledWith("1//refresh");
    expect(result.available).toBe(true);
  });

  it("refreshes when the access token expires within the buffer window", async () => {
    const almostExpired: YoutubeCredentials = {
      ...baseCredentials,
      expiresAt: new Date(Date.now() + 30 * 1000).toISOString(),
    };
    const refresh = vi.fn().mockResolvedValue({
      accessToken: "ya29.refreshed",
      expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    });
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse({ items: [{ statistics: { subscriberCount: "10", viewCount: "20", videoCount: "1" } }] })
      )
      .mockResolvedValueOnce(jsonResponse({ items: [] }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await getYoutubeChannelStats(almostExpired, refresh);

    expect(refresh).toHaveBeenCalledWith("1//refresh");
    expect(result.available).toBe(true);
  });
});
