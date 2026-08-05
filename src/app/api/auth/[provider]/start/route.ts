import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { type NextRequest } from "next/server";
import { buildAuthorizeUrl, type ProviderId } from "@/lib/auth/oauth/providers";
import { getSession } from "@/lib/auth/dal";
import { routing } from "@/i18n/routing";

const VALID_PROVIDERS: ProviderId[] = ["google", "github"];

function localeFromReferer(referer: string | null): string {
  if (!referer) return routing.defaultLocale;
  try {
    const segments = new URL(referer).pathname.split("/").filter(Boolean);
    const candidate = segments[0];
    return (routing.locales as readonly string[]).includes(candidate ?? "")
      ? candidate!
      : routing.defaultLocale;
  } catch {
    return routing.defaultLocale;
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> },
) {
  const { provider } = await params;
  if (!VALID_PROVIDERS.includes(provider as ProviderId)) {
    return new Response("Unknown provider", { status: 404 });
  }

  const mode = request.nextUrl.searchParams.get("mode") === "link" ? "link" : "signin";
  if (mode === "link") {
    const session = await getSession();
    if (!session) return new Response("Not signed in", { status: 401 });
  }

  const locale = localeFromReferer(request.headers.get("referer"));
  const state = randomUUID();
  const cookieStore = await cookies();
  cookieStore.set("tayanchai_oauth_state", `${state}:${mode}:${locale}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });

  const redirectUri = new URL(
    `/api/auth/${provider}/callback`,
    request.nextUrl.origin,
  ).toString();
  redirect(buildAuthorizeUrl(provider as ProviderId, state, redirectUri));
}
