"use server";

import { revalidatePath } from "next/cache";
import { eq, and } from "drizzle-orm";
import { Api } from "telegram";
import { db } from "@/db/client";
import { telegramChannelConnections } from "@/db/schema/telegram-channel-connection";
import { integrations } from "@/db/schema/integrations";
import { requireOrganization } from "@/lib/auth/dal";
import { openTelegramClient, telegramApiCredentials } from "@/lib/telegram/client";
import { encryptSessionSecret, decryptSessionSecret } from "@/lib/telegram/session-crypto";
import { finalizeConnection } from "@/lib/telegram/finalize-connection";
import { normalizeTelegramUsername } from "@/lib/telegram/normalize-username";
import type { TelegramConnectState } from "@/lib/telegram/connect-state";

function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 4) return phone;
  return `${phone.slice(0, phone.length - digits.length + 3)}***${digits.slice(-2)}`;
}

export async function startTelegramConnection(
  locale: string,
  _prevState: TelegramConnectState,
  formData: FormData,
): Promise<TelegramConnectState> {
  const { organization } = await requireOrganization(locale);
  const phone = String(formData.get("phone") ?? "").trim();
  const rawChannelUsername = String(formData.get("channelUsername") ?? "");
  if (!phone || !rawChannelUsername.trim()) {
    return { status: "idle", error: "missing_fields" };
  }

  const channelUsername = normalizeTelegramUsername(rawChannelUsername);
  if (!channelUsername) {
    return { status: "idle", error: "invalid_channel_format" };
  }

  const client = await openTelegramClient("");
  try {
    const { phoneCodeHash } = await client.sendCode(telegramApiCredentials(), phone);
    const sessionString = client.session.save() as unknown as string;

    await db
      .insert(telegramChannelConnections)
      .values({
        organizationId: organization.id,
        channelUsername,
        phoneMasked: maskPhone(phone),
        phone,
        sessionSecretEncrypted: encryptSessionSecret(sessionString),
        phoneCodeHash,
        status: "pending_code",
      })
      .onConflictDoUpdate({
        target: telegramChannelConnections.organizationId,
        set: {
          channelUsername,
          phoneMasked: maskPhone(phone),
          phone,
          sessionSecretEncrypted: encryptSessionSecret(sessionString),
          phoneCodeHash,
          status: "pending_code",
          lastError: null,
          updatedAt: new Date(),
        },
      });

    return { status: "pending_code" };
  } finally {
    await client.disconnect();
  }
}

async function loadConnection(organizationId: string) {
  const [row] = await db
    .select()
    .from(telegramChannelConnections)
    .where(eq(telegramChannelConnections.organizationId, organizationId));
  if (!row?.sessionSecretEncrypted) {
    throw new Error("No in-progress Telegram connection found");
  }
  return row;
}

export async function submitTelegramCode(
  locale: string,
  _prevState: TelegramConnectState,
  formData: FormData,
): Promise<TelegramConnectState> {
  const { organization } = await requireOrganization(locale);
  const code = String(formData.get("code") ?? "").trim();
  const connection = await loadConnection(organization.id);
  const client = await openTelegramClient(decryptSessionSecret(connection.sessionSecretEncrypted!));

  try {
    await client.invoke(
      new Api.auth.SignIn({
        phoneNumber: connection.phone ?? undefined,
        phoneCodeHash: connection.phoneCodeHash ?? "",
        phoneCode: code,
      }),
    );
    return await finalizeConnection({
      organizationId: organization.id,
      channelUsername: connection.channelUsername,
      client,
      locale,
    });
  } catch (err) {
    const message = (err as { errorMessage?: string }).errorMessage;
    if (message === "SESSION_PASSWORD_NEEDED") {
      const sessionString = client.session.save() as unknown as string;
      await db
        .update(telegramChannelConnections)
        .set({
          status: "pending_password",
          sessionSecretEncrypted: encryptSessionSecret(sessionString),
          updatedAt: new Date(),
        })
        .where(eq(telegramChannelConnections.organizationId, organization.id));
      return { status: "pending_password" };
    }
    return { status: "pending_code", error: "invalid_code" };
  } finally {
    await client.disconnect();
  }
}

export async function submitTelegramPassword(
  locale: string,
  _prevState: TelegramConnectState,
  formData: FormData,
): Promise<TelegramConnectState> {
  const { organization } = await requireOrganization(locale);
  const password = String(formData.get("password") ?? "");
  const connection = await loadConnection(organization.id);
  const client = await openTelegramClient(decryptSessionSecret(connection.sessionSecretEncrypted!));

  try {
    const passwordInfo = await client.invoke(new Api.account.GetPassword());
    const { computeCheck } = await import("telegram/Password");
    const passwordSrpCheck = await computeCheck(passwordInfo, password);
    await client.invoke(new Api.auth.CheckPassword({ password: passwordSrpCheck }));
    return await finalizeConnection({
      organizationId: organization.id,
      channelUsername: connection.channelUsername,
      client,
      locale,
    });
  } catch {
    return { status: "pending_password", error: "invalid_password" };
  } finally {
    await client.disconnect();
  }
}

export async function disconnectTelegramChannel(locale: string): Promise<void> {
  const { organization } = await requireOrganization(locale);
  const [connection] = await db
    .select()
    .from(telegramChannelConnections)
    .where(eq(telegramChannelConnections.organizationId, organization.id));
  if (connection?.sessionSecretEncrypted) {
    try {
      const client = await openTelegramClient(decryptSessionSecret(connection.sessionSecretEncrypted));
      try {
        // gramjs has no logOut() convenience method — Api.auth.LogOut is invoked like any other MTProto call.
        // Best-effort: a revoked session or rotated encryption key must not block removing our own record.
        await client.invoke(new Api.auth.LogOut());
      } catch {
        // ignore — proceed to delete our record regardless of remote logout outcome
      } finally {
        await client.disconnect();
      }
    } catch {
      // decrypt/openTelegramClient itself failed — still proceed to delete our record
    }
  }
  await db
    .delete(telegramChannelConnections)
    .where(eq(telegramChannelConnections.organizationId, organization.id));

  await db
    .update(integrations)
    .set({ status: "setup_needed", updatedAt: new Date() })
    .where(and(eq(integrations.organizationId, organization.id), eq(integrations.providerId, "telegram_mtproto")));

  revalidatePath(`/${locale}/statistics/marketing`);
  revalidatePath(`/${locale}/integrations`);
}
