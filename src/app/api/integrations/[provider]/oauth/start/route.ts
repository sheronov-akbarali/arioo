import { NextResponse } from "next/server";
import { getOAuthConfig, isOAuthConfigured } from "@/lib/integrations/oauth/config";
import { signOAuthState } from "@/lib/integrations/oauth/state";
import { requireOrganization } from "@/lib/auth/dal";

export async function GET(req: Request, { params }: { params: Promise<{ provider: string }> }) {
  const { provider } = await params;
  const url = new URL(req.url);
  const locale = url.searchParams.get("locale") ?? "uz";
  const returnPath = url.searchParams.get("returnPath") ?? undefined;
  const { organization } = await requireOrganization(locale);

  if (!isOAuthConfigured(provider)) {
    return NextResponse.redirect(
      new URL(`/${locale}/integrations?oauthError=not_configured&provider=${provider}`, req.url)
    );
  }

  const config = getOAuthConfig(provider);
  if (!config) {
    return NextResponse.redirect(new URL(`/${locale}/integrations?oauthError=unknown_provider`, req.url));
  }

  const state = signOAuthState({ organizationId: organization.id, provider, locale, returnPath });
  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/integrations/${provider}/oauth/callback`;

  const authorizeUrl = new URL(config.authUrl);
  authorizeUrl.searchParams.set("client_id", config.clientId);
  authorizeUrl.searchParams.set("redirect_uri", redirectUri);
  authorizeUrl.searchParams.set("response_type", "code");
  authorizeUrl.searchParams.set("state", state);
  if (config.scopes.length > 0) {
    authorizeUrl.searchParams.set("scope", config.scopes.join(" "));
  }
  if (config.extraAuthParams) {
    for (const [key, value] of Object.entries(config.extraAuthParams)) {
      authorizeUrl.searchParams.set(key, value);
    }
  }

  return NextResponse.redirect(authorizeUrl.toString());
}
