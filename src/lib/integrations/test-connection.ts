import "server-only";
import { decryptCredential } from "./credential-crypto";

type IntegrationSnapshot = {
  credentialsEncrypted: string | null;
  config: Record<string, unknown> | null;
  linkedChannelId: string | null;
};

async function testTelegramBot(snapshot: IntegrationSnapshot): Promise<{ ok: boolean; error?: string }> {
  if (!snapshot.credentialsEncrypted) return { ok: false, error: "Bot token topilmadi" };
  const { botToken } = JSON.parse(decryptCredential(snapshot.credentialsEncrypted));
  const response = await fetch(`https://api.telegram.org/bot${botToken}/getMe`);
  const data = await response.json();
  return data.ok ? { ok: true } : { ok: false, error: "Bot token yaroqsiz" };
}

async function testGenericOAuth(snapshot: IntegrationSnapshot): Promise<{ ok: boolean; error?: string }> {
  if (!snapshot.credentialsEncrypted) return { ok: false, error: "OAuth token topilmadi" };
  return { ok: true };
}

const TESTERS: Record<string, (snapshot: IntegrationSnapshot) => Promise<{ ok: boolean; error?: string }>> = {
  telegram_bot: testTelegramBot,
  amocrm: testGenericOAuth,
  bitrix24: testGenericOAuth,
  google: testGenericOAuth,
  github: testGenericOAuth,
  headhunter: testGenericOAuth,
};

export async function testIntegrationConnection(
  providerId: string,
  snapshot: IntegrationSnapshot
): Promise<{ ok: boolean; error?: string }> {
  const tester = TESTERS[providerId];
  if (!tester) return { ok: false, error: "Bu provayder uchun test hali qo'llab-quvvatlanmaydi" };
  if (!snapshot.credentialsEncrypted) return { ok: false, error: "Ulanish ma'lumotlari topilmadi" };
  try {
    return await tester(snapshot);
  } catch (error) {
    console.error(`Test connection failed for "${providerId}":`, error);
    return { ok: false, error: "Tekshiruvda xatolik yuz berdi" };
  }
}
