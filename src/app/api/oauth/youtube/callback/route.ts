import { NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "node:crypto";
import { db } from "@/db/client";
import { youtubeChannelConnections } from "@/db/schema/youtube-channel-connection";
import { encryptToken } from "@/lib/crypto/token-crypto";

type StatePayload = { organizationId: string; locale: string; timestamp: number };

function verifyYoutubeState(token: string): StatePayload | null {
  const [bodyBase64, signature] = token.split(".");
  if (!bodyBase64 || !signature) return null;

  const secret =
    process.env.OAUTH_STATE_SIGNING_SECRET ||
    process.env.INTEGRATION_TOKEN_ENCRYPTION_KEY ||
    "arioo-default-secret-key-32bytes!";

  const expectedSignature = createHmac("sha256", secret).update(bodyBase64).digest("base64url");
  const a = Buffer.from(signature);
  const b = Buffer.from(expectedSignature);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  try {
    const parsed = JSON.parse(Buffer.from(bodyBase64, "base64url").toString("utf8"));
    if (typeof parsed.organizationId !== "string" || typeof parsed.timestamp !== "number") {
      return null;
    }
    // 15 daqiqa TTL
    if (Date.now() - parsed.timestamp > 15 * 60 * 1000) {
      return null;
    }
    return {
      organizationId: parsed.organizationId,
      locale: typeof parsed.locale === "string" ? parsed.locale : "uz",
      timestamp: parsed.timestamp,
    };
  } catch {
    return null;
  }
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const stateToken = url.searchParams.get("state");
  const errorParam = url.searchParams.get("error");

  const state = stateToken ? verifyYoutubeState(stateToken) : null;
  const locale = state?.locale ?? "uz";

  if (errorParam || !code || !state) {
    return NextResponse.redirect(
      new URL(`/${locale}/statistics/marketing?youtube=error`, req.url)
    );
  }

  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID || process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return NextResponse.redirect(
      new URL(`/${locale}/statistics/marketing?youtube=not_configured`, req.url)
    );
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || url.origin;
  const redirectUri = `${appUrl}/api/oauth/youtube/callback`;

  try {
    // 1. Code ni Token ga almashtiramiz
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        grant_type: "authorization_code",
        redirect_uri: redirectUri,
      }),
    });

    if (!tokenRes.ok) {
      console.error("YouTube token exchange failed:", await tokenRes.text());
      return NextResponse.redirect(
        new URL(`/${locale}/statistics/marketing?youtube=error`, req.url)
      );
    }

    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;
    const refreshToken = tokenData.refresh_token;
    const expiresIn = tokenData.expires_in ?? 3600;

    if (!accessToken) {
      return NextResponse.redirect(
        new URL(`/${locale}/statistics/marketing?youtube=error`, req.url)
      );
    }

    // 2. YouTube Data API dan kanal ma'lumotlarini olamiz
    const channelRes = await fetch(
      "https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&mine=true",
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    let channelId = "mine";
    let channelTitle: string | null = null;

    if (channelRes.ok) {
      const channelData = await channelRes.json();
      const item = channelData.items?.[0];
      if (item) {
        channelId = item.id;
        channelTitle = item.snippet?.title ?? null;
      }
    }

    const tokenExpiresAt = new Date(Date.now() + expiresIn * 1000);
    const accessTokenEncrypted = encryptToken(accessToken);
    const refreshTokenEncrypted = refreshToken ? encryptToken(refreshToken) : accessTokenEncrypted;

    // 3. DB ga yozamiz
    await db
      .insert(youtubeChannelConnections)
      .values({
        organizationId: state.organizationId,
        channelId,
        channelTitle,
        accessTokenEncrypted,
        refreshTokenEncrypted,
        tokenExpiresAt,
        status: "connected",
        lastSyncedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: youtubeChannelConnections.organizationId,
        set: {
          channelId,
          channelTitle,
          accessTokenEncrypted,
          refreshTokenEncrypted,
          tokenExpiresAt,
          status: "connected",
          lastSyncedAt: new Date(),
          lastError: null,
          updatedAt: new Date(),
        },
      });

    return NextResponse.redirect(
      new URL(`/${locale}/statistics/marketing?youtube=connected`, req.url)
    );
  } catch (err) {
    console.error("YouTube OAuth callback error:", err);
    return NextResponse.redirect(
      new URL(`/${locale}/statistics/marketing?youtube=error`, req.url)
    );
  }
}
