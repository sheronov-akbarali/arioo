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

function getAccessToken(snapshot: IntegrationSnapshot): string | null {
  if (!snapshot.credentialsEncrypted) return null;
  try {
    const { accessToken } = JSON.parse(decryptCredential(snapshot.credentialsEncrypted));
    return typeof accessToken === "string" ? accessToken : null;
  } catch {
    return null;
  }
}

async function testBearerEndpoint(
  url: string,
  accessToken: string,
  invalidLabel: string
): Promise<{ ok: boolean; error?: string }> {
  const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (res.ok) return { ok: true };
  if (res.status === 401 || res.status === 403) return { ok: false, error: invalidLabel };
  return { ok: false, error: `Tekshiruv so'rovi muvaffaqiyatsiz (${res.status})` };
}

async function testGithub(snapshot: IntegrationSnapshot): Promise<{ ok: boolean; error?: string }> {
  const accessToken = getAccessToken(snapshot);
  if (!accessToken) return { ok: false, error: "OAuth token topilmadi" };
  return testBearerEndpoint("https://api.github.com/user", accessToken, "GitHub token yaroqsiz yoki muddati o'tgan");
}

async function testHeadhunter(snapshot: IntegrationSnapshot): Promise<{ ok: boolean; error?: string }> {
  const accessToken = getAccessToken(snapshot);
  if (!accessToken) return { ok: false, error: "OAuth token topilmadi" };
  return testBearerEndpoint("https://api.hh.ru/me", accessToken, "HeadHunter token yaroqsiz yoki muddati o'tgan");
}

async function testGoogle(snapshot: IntegrationSnapshot): Promise<{ ok: boolean; error?: string }> {
  const accessToken = getAccessToken(snapshot);
  if (!accessToken) return { ok: false, error: "OAuth token topilmadi" };
  return testBearerEndpoint(
    "https://www.googleapis.com/oauth2/v3/userinfo",
    accessToken,
    "Google token yaroqsiz yoki muddati o'tgan"
  );
}

// amoCRM and Bitrix24 API calls are bound to the customer's own portal
// subdomain (e.g. {subdomain}.amocrm.ru), which isn't persisted after the
// initial OAuth callback — so, unlike GitHub/HeadHunter/Google, there is no
// fixed endpoint to call here. Honestly limited to a credential-existence
// check until the portal domain is stored alongside the token.
async function testTokenExistsOnly(snapshot: IntegrationSnapshot): Promise<{ ok: boolean; error?: string }> {
  return getAccessToken(snapshot) ? { ok: true } : { ok: false, error: "OAuth token topilmadi" };
}

const TESTERS: Record<string, (snapshot: IntegrationSnapshot) => Promise<{ ok: boolean; error?: string }>> = {
  telegram_bot: testTelegramBot,
  amocrm: testTokenExistsOnly,
  bitrix24: testTokenExistsOnly,
  google: testGoogle,
  github: testGithub,
  headhunter: testHeadhunter,
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
