import { NextResponse } from "next/server";
import { createHmac, randomBytes } from "node:crypto";
import { requireOrganization } from "@/lib/auth/dal";

function signYoutubeState(payload: { organizationId: string; locale: string }): string {
  const secret =
    process.env.OAUTH_STATE_SIGNING_SECRET ||
    process.env.INTEGRATION_TOKEN_ENCRYPTION_KEY ||
    "arioo-default-secret-key-32bytes!";
  const nonce = randomBytes(8).toString("hex");
  const timestamp = Date.now();
  const body = JSON.stringify({ ...payload, timestamp, nonce });
  const bodyBase64 = Buffer.from(body).toString("base64url");
  const signature = createHmac("sha256", secret).update(bodyBase64).digest("base64url");
  return `${bodyBase64}.${signature}`;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const locale = url.searchParams.get("locale") ?? "uz";

  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID || process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    return NextResponse.redirect(
      new URL(`/${locale}/statistics/marketing?youtube=not_configured`, req.url)
    );
  }

  let orgId: string;
  try {
    const { organization } = await requireOrganization(locale);
    orgId = organization.id;
  } catch {
    return NextResponse.redirect(new URL(`/${locale}/sign-in`, req.url));
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || url.origin;
  const redirectUri = `${appUrl}/api/oauth/youtube/callback`;
  const state = signYoutubeState({ organizationId: orgId, locale });

  const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", "https://www.googleapis.com/auth/youtube.readonly");
  authUrl.searchParams.set("access_type", "offline");
  authUrl.searchParams.set("prompt", "consent");
  authUrl.searchParams.set("state", state);

  return NextResponse.redirect(authUrl.toString());
}
