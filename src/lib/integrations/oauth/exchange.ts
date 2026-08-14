import "server-only";
import { getOAuthConfig } from "./config";

type ExchangeResult = { accessToken: string; refreshToken?: string; raw: unknown };

export async function exchangeCodeForToken(
  provider: string,
  code: string,
  extra: Record<string, string>
): Promise<ExchangeResult> {
  const config = getOAuthConfig(provider);
  if (!config) throw new Error(`OAuth is not configured for provider "${provider}"`);

  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/integrations/${provider}/oauth/callback`;

  // amoCRM'ning token endpoint'i callback'da qaytgan `referer` orqali
  // ma'lum bo'lgan subdomenga bog'liq — `extra.tokenUrl` orqali override qilinadi.
  const tokenUrl = extra.tokenUrl || config.tokenUrl;
  if (!tokenUrl) throw new Error(`No token URL resolved for provider "${provider}"`);

  const response = await fetch(tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
    }),
  });

  if (!response.ok) {
    throw new Error(`Token exchange failed for provider "${provider}": ${response.status}`);
  }

  const raw = await response.json();
  const accessToken = raw.access_token;
  if (typeof accessToken !== "string") {
    throw new Error(`Token exchange response for "${provider}" did not include access_token`);
  }

  return { accessToken, refreshToken: raw.refresh_token, raw };
}
