import "server-only";
import { TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions";

export function telegramApiCredentials(): { apiId: number; apiHash: string } {
  const apiId = Number(process.env.TELEGRAM_API_ID);
  const apiHash = process.env.TELEGRAM_API_HASH;
  if (!apiId || !apiHash) {
    throw new Error("TELEGRAM_API_ID / TELEGRAM_API_HASH is not set");
  }
  return { apiId, apiHash };
}

export async function openTelegramClient(sessionString: string): Promise<TelegramClient> {
  const { apiId, apiHash } = telegramApiCredentials();
  const client = new TelegramClient(new StringSession(sessionString), apiId, apiHash, {
    connectionRetries: 5,
    // Every use of this client is a single short-lived request/response
    // sequence (send code, verify, resolve a channel) followed by an
    // explicit disconnect() — there's no persistent update listener to
    // maintain. Without this, a network hiccup mid-request can leave a
    // background reconnect loop running past our disconnect() call.
    autoReconnect: false,
  });
  await client.connect();
  return client;
}
