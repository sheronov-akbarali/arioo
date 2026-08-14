import "server-only";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import type { TelegramClient } from "telegram";
import { Api } from "telegram";
import { db } from "@/db/client";
import { telegramChannelConnections } from "@/db/schema/telegram-channel-connection";
import { integrations, integrationEvents } from "@/db/schema/integrations";
import { encryptSessionSecret } from "./session-crypto";
import type { TelegramConnectState } from "./connect-state";

const ADMIN_PARTICIPANT_TYPES = new Set(["ChannelParticipantAdmin", "ChannelParticipantCreator"]);

export async function finalizeConnection(params: {
  organizationId: string;
  channelUsername: string;
  client: TelegramClient;
  locale: string;
}): Promise<TelegramConnectState> {
  const { organizationId, channelUsername, client, locale } = params;

  let chat: { id: string; title: string; accessHash: string } | undefined;
  let participantResult: { participant: { className: string } };
  try {
    const resolved = (await client.invoke(
      new Api.contacts.ResolveUsername({ username: channelUsername }),
    )) as unknown as { chats: Array<{ id: string; title: string; accessHash: string }> };
    chat = resolved.chats[0];
    if (!chat) {
      throw new Error("channel not found");
    }

    participantResult = (await client.invoke(
      new Api.channels.GetParticipant({
        channel: channelUsername,
        participant: "me",
      }),
    )) as unknown as { participant: { className: string } };
  } catch {
    // Free-text channel username from step 1 — a typo or nonexistent channel
    // (e.g. USERNAME_NOT_OCCUPIED, CHANNEL_INVALID) is a routine failure path.
    await db
      .update(telegramChannelConnections)
      .set({
        status: "error",
        lastError: "channel_not_found",
        sessionSecretEncrypted: null,
        phoneCodeHash: null,
        phone: null,
        updatedAt: new Date(),
      })
      .where(eq(telegramChannelConnections.organizationId, organizationId));
    return { status: "error", error: "channel_not_found" };
  }

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

  // A failure here is a bookkeeping/analytics-integration issue, not a Telegram
  // connection issue — it must never bubble up and be misreported to the user as
  // an "invalid code"/"invalid password" error by the callers' try/catch blocks.
  try {
    const [row] = await db
      .insert(integrations)
      .values({
        organizationId,
        providerId: "telegram_mtproto",
        connectionMode: "wizard",
        status: "active",
        lastVerifiedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [integrations.organizationId, integrations.providerId],
        set: { status: "active", lastVerifiedAt: new Date(), lastError: null, updatedAt: new Date() },
      })
      .returning({ id: integrations.id });

    await db.insert(integrationEvents).values({
      integrationId: row.id,
      type: "verified",
      message: "MTProto session verified",
    });
  } catch (error) {
    console.error("Failed to sync Telegram MTProto connection to integrations table:", error);
  }

  revalidatePath(`/${locale}/integrations`);
  return { status: "connected" };
}
