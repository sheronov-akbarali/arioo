import { NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { db } from "@/db/client";
import { integrations, integrationEvents } from "@/db/schema/integrations";
import { verifyOAuthState } from "@/lib/integrations/oauth/state";
import { exchangeCodeForToken } from "@/lib/integrations/oauth/exchange";
import { encryptCredential } from "@/lib/integrations/credential-crypto";
import { exchangeLongLivedToken } from "@/lib/meta/token-exchange";

export async function GET(req: Request, { params }: { params: Promise<{ provider: string }> }) {
  const { provider } = await params;
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const stateToken = url.searchParams.get("state");
  const referer = url.searchParams.get("referer"); // amoCRM's portal subdomain hint

  const state = stateToken ? verifyOAuthState(stateToken) : null;
  const locale = state?.locale ?? "uz";

  if (!code || !state || state.provider !== provider) {
    return NextResponse.redirect(
      new URL(`/${locale}/integrations?oauthError=invalid_state`, req.url)
    );
  }

  const returnPath = state.returnPath ?? "/integrations";

  try {
    const extra: Record<string, string> = {};
    if (provider === "amocrm" && referer) {
      extra.tokenUrl = `${referer.replace(/\/$/, "")}/oauth2/access_token`;
    }

    const { accessToken, refreshToken, expiresAt } = await exchangeCodeForToken(provider, code, extra);

    // Meta's short-lived code-exchange token only lasts ~1-2h — upgrade it to a
    // 60-day long-lived token immediately so the connection survives past the
    // first page load.
    let finalAccessToken = accessToken;
    let finalExpiresAt = expiresAt;
    if (provider === "instagram" || provider === "facebook") {
      const longLived = await exchangeLongLivedToken(provider, accessToken);
      finalAccessToken = longLived.accessToken;
      finalExpiresAt = longLived.expiresAt;
    }

    const credentialsEncrypted = encryptCredential(
      JSON.stringify({ accessToken: finalAccessToken, refreshToken, expiresAt: finalExpiresAt })
    );

    const [existing] = await db
      .select({ id: integrations.id })
      .from(integrations)
      .where(and(eq(integrations.organizationId, state.organizationId), eq(integrations.providerId, provider)));

    let integrationId: string;
    if (existing) {
      await db
        .update(integrations)
        .set({ status: "active", credentialsEncrypted, lastVerifiedAt: new Date(), lastError: null, updatedAt: new Date() })
        .where(eq(integrations.id, existing.id));
      integrationId = existing.id;
    } else {
      const [created] = await db
        .insert(integrations)
        .values({
          organizationId: state.organizationId,
          providerId: provider,
          connectionMode: "oauth",
          status: "active",
          credentialsEncrypted,
          lastVerifiedAt: new Date(),
        })
        .returning({ id: integrations.id });
      integrationId = created.id;
    }

    await db.insert(integrationEvents).values({ integrationId, type: "verified", message: "OAuth token obtained" });

    return NextResponse.redirect(new URL(`/${locale}${returnPath}?oauthSuccess=${provider}`, req.url));
  } catch (error) {
    console.error(`OAuth callback failed for provider "${provider}":`, error);
    return NextResponse.redirect(
      new URL(`/${locale}${returnPath}?oauthError=exchange_failed&provider=${provider}`, req.url)
    );
  }
}
