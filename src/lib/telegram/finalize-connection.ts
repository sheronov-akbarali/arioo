import "server-only";
import { eq } from "drizzle-orm";
import type { TelegramClient } from "telegram";
import { Api } from "telegram";
import { db } from "@/db/client";
import { telegramChannelConnections } from "@/db/schema/telegram-channel-connection";
import { encryptSessionSecret } from "./session-crypto";
import type { TelegramConnectState } from "./connect-state";

const ADMIN_PARTICIPANT_TYPES = new Set(["ChannelParticipantAdmin", "ChannelParticipantCreator"]);

export async function finalizeConnection(params: {
  organizationId: string;
  channelUsername: string;
  client: TelegramClient;
}): Promise<TelegramConnectState> {
  const { organizationId, channelUsername, client } = params;

  const resolved = (await client.invoke(
    new Api.contacts.ResolveUsername({ username: channelUsername }),
  )) as unknown as { chats: Array<{ id: string; title: string; accessHash: string }> };
  const chat = resolved.chats[0];

  const participantResult = (await client.invoke(
    new Api.channels.GetParticipant({
      channel: channelUsername,
      participant: "me",
    }),
  )) as unknown as { participant: { className: string } };

  const isAdmin = ADMIN_PARTICIPANT_TYPES.has(participantResult.participant.className);

  if (!isAdmin) {
    await client.invoke(new Api.auth.LogOut());
    await db
      .update(telegramChannelConnections)
      .set({
        status: "error",
        lastError: "not_channel_admin",
        sessionSecretEncrypted: null,
        phoneCodeHash: null,
        phone: null,
        updatedAt: new Date(),
      })
      .where(eq(telegramChannelConnections.organizationId, organizationId));
    return { status: "error", error: "not_channel_admin" };
  }

  const sessionString = client.session.save() as unknown as string;
  await db
    .update(telegramChannelConnections)
    .set({
      status: "connected",
      channelTitle: chat?.title ?? channelUsername,
      sessionSecretEncrypted: encryptSessionSecret(sessionString),
      phoneCodeHash: null,
      phone: null,
      lastError: null,
      lastSyncedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(telegramChannelConnections.organizationId, organizationId));
  return { status: "connected" };
}
