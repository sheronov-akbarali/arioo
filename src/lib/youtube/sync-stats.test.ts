import { describe, it, expect, vi, beforeEach } from "vitest";

process.env.INTEGRATION_CREDENTIALS_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString("base64");

const dbSelectWhere = vi.fn();
const dbUpdateSet = vi.fn().mockReturnThis();
const dbUpdateWhere = vi.fn().mockResolvedValue(undefined);
vi.mock("@/db/client", () => ({
  db: {
    select: vi.fn(() => ({ from: () => ({ where: dbSelectWhere }) })),
    update: vi.fn(() => ({ set: dbUpdateSet, where: dbUpdateWhere })),
  },
}));

const { getYoutubeChannelStats } = vi.hoisted(() => ({ getYoutubeChannelStats: vi.fn() }));
vi.mock("./channel-stats", () => ({ getYoutubeChannelStats }));

const { refreshAccessToken } = vi.hoisted(() => ({ refreshAccessToken: vi.fn() }));
vi.mock("@/lib/integrations/oauth/exchange", () => ({ refreshAccessToken }));

import { encryptCredential } from "@/lib/integrations/credential-crypto";
import { syncYoutubeStats } from "./sync-stats";

beforeEach(() => {
  dbSelectWhere.mockReset();
  dbUpdateSet.mockClear();
  dbUpdateWhere.mockClear();
  getYoutubeChannelStats.mockReset();
});

describe("syncYoutubeStats", () => {
  it("returns connected:false when there is no integration row", async () => {
    dbSelectWhere.mockResolvedValue([]);

    const result = await syncYoutubeStats("org_1");

    expect(result).toEqual({ connected: false });
    expect(getYoutubeChannelStats).not.toHaveBeenCalled();
  });

  it("returns connected:false when the integration is archived", async () => {
    dbSelectWhere.mockResolvedValue([
      { id: "int_1", status: "archived", credentialsEncrypted: encryptCredential(JSON.stringify({ accessToken: "x" })) },
    ]);

    const result = await syncYoutubeStats("org_1");

    expect(result).toEqual({ connected: false });
  });

  it("fetches stats and persists updated credentials on success", async () => {
    const credentials = { accessToken: "old", channelId: "UC1" };
    dbSelectWhere.mockResolvedValue([
      { id: "int_1", status: "active", credentialsEncrypted: encryptCredential(JSON.stringify(credentials)) },
    ]);
    getYoutubeChannelStats.mockResolvedValue({
      available: true,
      channelTitle: "Arioo",
      subscriberCount: 10,
      viewCount: 20,
      videoCount: 3,
      recentVideos: [],
      updatedCredentials: { accessToken: "new", channelId: "UC1" },
    });

    const result = await syncYoutubeStats("org_1");

    expect(result.connected).toBe(true);
    if (result.connected) {
      expect(result.integrationId).toBe("int_1");
      expect(result.result.available).toBe(true);
    }
    expect(dbUpdateSet).toHaveBeenCalledWith(
      expect.objectContaining({ status: "active", lastError: null })
    );
  });

  it("marks the integration need_attention when stats are unavailable", async () => {
    dbSelectWhere.mockResolvedValue([
      { id: "int_1", status: "active", credentialsEncrypted: encryptCredential(JSON.stringify({ accessToken: "old" })) },
    ]);
    getYoutubeChannelStats.mockResolvedValue({ available: false, reason: "quota_exceeded" });

    const result = await syncYoutubeStats("org_1");

    expect(result).toEqual({
      connected: true,
      integrationId: "int_1",
      result: { available: false, reason: "quota_exceeded" },
    });
    expect(dbUpdateSet).toHaveBeenCalledWith(
      expect.objectContaining({ status: "need_attention", lastError: "quota_exceeded" })
    );
  });
});
