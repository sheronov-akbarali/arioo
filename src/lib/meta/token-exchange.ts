import "server-only";
import { getOAuthConfig } from "@/lib/integrations/oauth/config";

/**
 * Meta has no standard refresh_token grant. Instead a still-valid token
 * (short- or long-lived) is exchanged for a new 60-day long-lived token via
 * this endpoint — used both right after the initial OAuth code exchange and
 * periodically thereafter to keep the stored token alive. Shared by
 * Instagram and Facebook Page Insights, which are the same Meta App.
 */
export async function exchangeLongLivedToken(
  provider: "instagram" | "facebook",
  currentAccessToken: string
): Promise<{ accessToken: string; expiresAt?: string }> {
  const config = getOAuthConfig(provider);
  if (!config) throw new Error(`Meta OAuth is not configured for provider "${provider}"`);

  const url = new URL("https://graph.facebook.com/v21.0/oauth/access_token");
  url.searchParams.set("grant_type", "fb_exchange_token");
  url.searchParams.set("client_id", config.clientId);
  url.searchParams.set("client_secret", config.clientSecret);
  url.searchParams.set("fb_exchange_token", currentAccessToken);

  const res = await fetch(url);
  const json = (await res.json().catch(() => null)) as
    | { access_token?: string; expires_in?: number; error?: { message?: string } }
    | null;

  if (!res.ok || !json || typeof json.access_token !== "string") {
    throw new Error(json?.error?.message ?? `Meta long-lived token exchange failed (${res.status})`);
  }

  return {
    accessToken: json.access_token,
    expiresAt: typeof json.expires_in === "number" ? new Date(Date.now() + json.expires_in * 1000).toISOString() : undefined,
  };
}
