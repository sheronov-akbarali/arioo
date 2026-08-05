import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { type NextRequest } from "next/server";
import { buildAuthorizeUrl, type ProviderId } from "@/lib/auth/oauth/providers";
import { getSession } from "@/lib/auth/dal";

const VALID_PROVIDERS: ProviderId[] = ["google", "github"];

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

  const state = randomUUID();
  const cookieStore = await cookies();
  cookieStore.set("tayanchai_oauth_state", `${state}:${mode}`, {
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
