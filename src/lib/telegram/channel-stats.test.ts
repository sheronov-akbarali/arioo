import { describe, expect, it, vi, beforeEach } from "vitest";

process.env.TELEGRAM_SESSION_ENCRYPTION_KEY = Buffer.alloc(32, 5).toString("base64");

const { invoke, disconnect } = vi.hoisted(() => ({
  invoke: vi.fn(),
  disconnect: vi.fn(),
}));
vi.mock("@/lib/telegram/client", () => ({
  openTelegramClient: vi.fn().mockResolvedValue({ invoke, disconnect }),
}));

import { encryptSessionSecret } from "./session-crypto";
import { getTelegramChannelStats } from "./channel-stats";

const connection = {
  channelUsername: "arioo_uz",
  sessionSecretEncrypted: encryptSessionSecret("session-string"),
};

beforeEach(() => {
  invoke.mockReset();
});

describe("getTelegramChannelStats", () => {
  it("returns member count and recent posts when stats are available", async () => {
    invoke
      .mockResolvedValueOnce({ fullChat: { participantsCount: 1200 } }) // GetFullChannel
      .mockResolvedValueOnce({
        recentPostsInteractions: [
          { views: 340, forwards: 12, msgId: 101 },
        ],
      }); // GetBroadcastStats

    const result = await getTelegramChannelStats(connection);

    expect(result).toEqual({
      available: true,
      memberCount: 1200,
      recentPosts: [{ id: 101, text: "", views: 340, forwards: 12 }],
    });
  });

  it("returns not_enough_subscribers when Telegram rejects the stats request", async () => {
    invoke
      .mockResolvedValueOnce({ fullChat: { participantsCount: 40 } })
      .mockRejectedValueOnce({ errorMessage: "STATS_MIGRATE_X" });

    const result = await getTelegramChannelStats(connection);

    expect(result).toEqual({ available: false, reason: "not_enough_subscribers" });
  });

  it("returns unknown when GetFullChannel itself fails", async () => {
    invoke.mockRejectedValueOnce({ errorMessage: "CHANNEL_INVALID" });

    const result = await getTelegramChannelStats(connection);

    expect(result).toEqual({ available: false, reason: "unknown" });
    expect(disconnect).toHaveBeenCalled();
  });
});
