import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { type NextRequest } from "next/server";
import { exchangeCodeForProfile, type ProviderId } from "@/lib/auth/oauth/providers";
import { completeLogin, linkProviderToUser } from "@/lib/auth/session";
import { getSession } from "@/lib/auth/dal";
import { SESSION_COOKIE_NAME, sessionCookieOptions } from "@/lib/auth/cookies";

const VALID_PROVIDERS: ProviderId[] = ["google", "github"];
const DEFAULT_LOCALE = "uz";

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

  if (!code || !state || !storedState) {
    redirect(`/${DEFAULT_LOCALE}/sign-in?error=oauth_failed`);
  }
  const [expectedState, mode] = storedState.split(":");
  if (expectedState !== state) {
    redirect(`/${DEFAULT_LOCALE}/sign-in?error=oauth_failed`);
  }

  const redirectUri = new URL(
    `/api/auth/${provider}/callback`,
    request.nextUrl.origin,
  ).toString();
  const profile = await exchangeCodeForProfile(provider as ProviderId, code, redirectUri);
  if (!profile) {
    redirect(`/${DEFAULT_LOCALE}/sign-in?error=oauth_failed`);
  }

  if (mode === "link") {
    const session = await getSession();
    if (!session) redirect(`/${DEFAULT_LOCALE}/sign-in?error=oauth_failed`);
    const result = await linkProviderToUser({ ...profile, provider, userId: session.user.id });
    if (!result.ok) {
      redirect(`/${DEFAULT_LOCALE}/settings/accounts?error=${result.error}`);
    }
    redirect(`/${DEFAULT_LOCALE}/settings/accounts`);
  }

  const { sessionToken, expires } = await completeLogin({ ...profile, provider });
  cookieStore.set(SESSION_COOKIE_NAME, sessionToken, sessionCookieOptions(expires));
  redirect(`/${DEFAULT_LOCALE}/dashboard`);
}
