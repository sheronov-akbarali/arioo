import { describe, it, expect, vi, beforeEach } from "vitest";
import { getYoutubeChannelStats } from "./channel-stats";
import { encryptToken } from "@/lib/crypto/token-crypto";

vi.mock("@/db/client", () => ({
  db: {
    update: vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([]),
      }),
    }),
  },
}));

describe("getYoutubeChannelStats", () => {
  beforeEach(() => {
    process.env.INTEGRATION_TOKEN_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString("base64");
  });

  it("fetches subscriberCount, viewCount, videoCount and recent videos", async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (url.includes("/channels")) {
        return {
          ok: true,
          json: async () => ({
            items: [
              {
                id: "UC_test_123",
                snippet: { title: "Arioo Tech" },
                statistics: {
                  subscriberCount: "15400",
                  viewCount: "1250000",
                  videoCount: "42",
                },
              },
            ],
          }),
        };
      }
      if (url.includes("/search")) {
        return {
          ok: true,
          json: async () => ({
            items: [
              { id: { videoId: "vid_1" }, snippet: { title: "Video 1" } },
              { id: { videoId: "vid_2" }, snippet: { title: "Video 2" } },
            ],
          }),
        };
      }
      if (url.includes("/videos")) {
        return {
          ok: true,
          json: async () => ({
            items: [
              { id: "vid_1", snippet: { title: "Video 1" }, statistics: { viewCount: "3500" } },
              { id: "vid_2", snippet: { title: "Video 2" }, statistics: { viewCount: "1200" } },
            ],
          }),
        };
      }
      return { ok: false, status: 404, text: async () => "Not found" };
    });
    vi.stubGlobal("fetch", fetchMock);

    const connection = {
      id: "conn_1",
      organizationId: "org_1",
      channelId: "UC_test_123",
      accessTokenEncrypted: encryptToken("valid_token"),
      refreshTokenEncrypted: encryptToken("valid_refresh_token"),
      tokenExpiresAt: new Date(Date.now() + 3600 * 1000),
    };

    const stats = await getYoutubeChannelStats(connection);

    expect(stats.available).toBe(true);
    if (stats.available) {
      expect(stats.subscriberCount).toBe(15400);
      expect(stats.viewCount).toBe(1250000);
      expect(stats.videoCount).toBe(42);
      expect(stats.recentVideos).toHaveLength(2);
      expect(stats.recentVideos[0].views).toBe(3500);
    }
  });

  it("returns available: false when API call fails", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      text: async () => "Unauthorized",
    });
    vi.stubGlobal("fetch", fetchMock);

    const connection = {
      id: "conn_1",
      organizationId: "org_1",
      channelId: "UC_test_123",
      accessTokenEncrypted: encryptToken("invalid_token"),
      refreshTokenEncrypted: encryptToken("invalid_refresh_token"),
      tokenExpiresAt: new Date(Date.now() + 3600 * 1000),
    };

    const stats = await getYoutubeChannelStats(connection);
    expect(stats.available).toBe(false);
  });
});
