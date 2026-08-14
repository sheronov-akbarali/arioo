import "server-only";
import { Api } from "telegram";
import { openTelegramClient } from "./client";
import { decryptSessionSecret } from "./session-crypto";

export type TelegramChannelStats =
  | {
      available: true;
      memberCount: number;
      recentPosts: Array<{ id: number; text: string; views: number; forwards: number }>;
    }
  | { available: false; reason: "not_enough_subscribers" | "unknown" };

export async function getTelegramChannelStats(connection: {
  channelUsername: string;
  sessionSecretEncrypted: string;
}): Promise<TelegramChannelStats> {
  const client = await openTelegramClient(decryptSessionSecret(connection.sessionSecretEncrypted));
  try {
    const full = (await client.invoke(
      new Api.channels.GetFullChannel({ channel: connection.channelUsername }),
    )) as unknown as { fullChat: { participantsCount: number } };
    const memberCount = full.fullChat.participantsCount;

    try {
      const stats = (await client.invoke(
        new Api.stats.GetBroadcastStats({ channel: connection.channelUsername }),
      )) as unknown as {
        recentPostsInteractions: Array<{ msgId: number; views: number; forwards: number }>;
      };
      return {
        available: true,
        memberCount,
        recentPosts: stats.recentPostsInteractions.map((post) => ({
          id: post.msgId,
          text: "",
          views: post.views,
          forwards: post.forwards,
        })),
      };
    } catch {
      return { available: false, reason: "not_enough_subscribers" };
    }
  } finally {
    await client.disconnect();
  }
}
