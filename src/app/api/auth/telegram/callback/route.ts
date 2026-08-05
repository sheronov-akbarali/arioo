import { z } from "zod";
import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { isTelegramAuthFresh, verifyTelegramAuth } from "@/lib/auth/oauth/telegram";
import { completeLogin, linkProviderToUser } from "@/lib/auth/session";
import { getSession } from "@/lib/auth/dal";
import { SESSION_COOKIE_NAME, sessionCookieOptions } from "@/lib/auth/cookies";

const telegramAuthSchema = z.object({
  id: z.union([z.string(), z.number()]).transform(String),
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  username: z.string().optional(),
  photo_url: z.string().optional(),
  auth_date: z.union([z.string(), z.number()]).transform(String),
  hash: z.string(),
});

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = telegramAuthSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  }
  const data = parsed.data;

  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken || !verifyTelegramAuth(data, botToken) || !isTelegramAuthFresh(data, 86_400)) {
    return NextResponse.json({ error: "invalid_signature" }, { status: 401 });
  }

  const profile = {
    providerAccountId: data.id,
    email: null,
    name: [data.first_name, data.last_name].filter(Boolean).join(" ") || data.username || null,
    image: data.photo_url ?? null,
  };

  const mode = request.nextUrl.searchParams.get("mode") === "link" ? "link" : "signin";
  const cookieStore = await cookies();

  if (mode === "link") {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "not_signed_in" }, { status: 401 });
    const result = await linkProviderToUser({
      ...profile,
      provider: "telegram",
      userId: session.user.id,
    });
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 409 });
    return NextResponse.json({ ok: true });
  }

  const { sessionToken, expires } = await completeLogin({ ...profile, provider: "telegram" });
  cookieStore.set(SESSION_COOKIE_NAME, sessionToken, sessionCookieOptions(expires));
  return NextResponse.json({ ok: true });
}
