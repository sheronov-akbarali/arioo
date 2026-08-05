import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { type NextRequest } from "next/server";
import { exchangeCodeForProfile, type ProviderId } from "@/lib/auth/oauth/providers";
import { completeLogin, linkProviderToUser, EmailAlreadyInUseError } from "@/lib/auth/session";
import { getSession } from "@/lib/auth/dal";
import { SESSION_COOKIE_NAME, sessionCookieOptions } from "@/lib/auth/cookies";
import { routing } from "@/i18n/routing";

const VALID_PROVIDERS: ProviderId[] = ["google", "github"];
const DEFAULT_LOCALE = routing.defaultLocale;

function resolveLocale(candidate: string | undefined): string {
  return (routing.locales as readonly string[]).includes(candidate ?? "")
    ? candidate!
    : DEFAULT_LOCALE;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> },
) {
  const { provider } = await params;
  if (!VALID_PROVIDERS.includes(provider as ProviderId)) {
    return new Response("Unknown provider", { status: 404 });
  }

  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const cookieStore = await cookies();
  const storedState = cookieStore.get("tayanchai_oauth_state")?.value;
  cookieStore.delete("tayanchai_oauth_state");

  const [expectedState, mode, storedLocale] = (storedState ?? "").split(":");
  const locale = resolveLocale(storedLocale);

  if (!code || !state || !storedState) {
    redirect(`/${locale}/sign-in?error=oauth_failed`);
  }
  if (expectedState !== state) {
    redirect(`/${locale}/sign-in?error=oauth_failed`);
  }

  const redirectUri = new URL(
    `/api/auth/${provider}/callback`,
    request.nextUrl.origin,
  ).toString();
  const profile = await exchangeCodeForProfile(provider as ProviderId, code, redirectUri);
  if (!profile) {
    redirect(`/${locale}/sign-in?error=oauth_failed`);
  }

  if (mode === "link") {
    const session = await getSession();
    if (!session) redirect(`/${locale}/sign-in?error=oauth_failed`);
    const result = await linkProviderToUser({ ...profile, provider, userId: session.user.id });
    if (!result.ok) {
      redirect(`/${locale}/settings/accounts?error=${result.error}`);
    }
    redirect(`/${locale}/settings/accounts`);
  }

  const headerList = await headers();
  const meta = {
    userAgent: headerList.get("user-agent"),
    ipAddress: headerList.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
  };

  try {
    const { sessionToken, expires } = await completeLogin({ ...profile, provider }, meta);
    cookieStore.set(SESSION_COOKIE_NAME, sessionToken, sessionCookieOptions(expires));
  } catch (error) {
    if (error instanceof EmailAlreadyInUseError) {
      redirect(`/${locale}/sign-in?error=email_in_use`);
    }
    throw error;
  }
  redirect(`/${locale}/dashboard`);
}
