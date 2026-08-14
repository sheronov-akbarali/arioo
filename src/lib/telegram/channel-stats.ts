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
  let client: Awaited<ReturnType<typeof openTelegramClient>> | undefined;
  try {
    client = await openTelegramClient(decryptSessionSecret(connection.sessionSecretEncrypted));
    try {
      let memberCount: number;
      try {
        const full = (await client.invoke(
          new Api.channels.GetFullChannel({ channel: connection.channelUsername }),
        )) as unknown as { fullChat: { participantsCount: number } };
        memberCount = full.fullChat.participantsCount;
      } catch {
        return { available: false, reason: "unknown" };
      }

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
  } catch {
    // decryptSessionSecret or openTelegramClient itself failed (e.g. a rotated
    // TELEGRAM_SESSION_ENCRYPTION_KEY) — no client was ever opened, so there's
    // nothing to disconnect. Fail soft so this doesn't take down the whole
    // /statistics/marketing page (including the unrelated Site analytics card).
    return { available: false, reason: "unknown" };
  }
}
