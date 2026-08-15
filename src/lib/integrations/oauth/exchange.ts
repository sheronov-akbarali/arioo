import "server-only";
import { getOAuthConfig } from "./config";

type ExchangeResult = { accessToken: string; refreshToken?: string; expiresAt?: string; raw: unknown };

type TokenResponsePayload = {
  access_token?: unknown;
  refresh_token?: unknown;
  expires_in?: unknown;
  [key: string]: unknown;
};

async function postForToken(tokenUrl: string, params: URLSearchParams): Promise<TokenResponsePayload> {
  const response = await fetch(tokenUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: params.toString(),
  });

  if (!response.ok) {
    throw new Error(`OAuth token request failed (${response.status}) against ${tokenUrl}`);
  }

  return response.json();
}

function expiresAtFrom(raw: TokenResponsePayload): string | undefined {
  return typeof raw.expires_in === "number"
    ? new Date(Date.now() + raw.expires_in * 1000).toISOString()
    : undefined;
}

export async function exchangeCodeForToken(
  provider: string,
  code: string,
  extra: Record<string, string>
): Promise<ExchangeResult> {
  const config = getOAuthConfig(provider);
  if (!config) throw new Error(`OAuth is not configured for provider "${provider}"`);

  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/integrations/${provider}/oauth/callback`;

  // amoCRM's token endpoint is bound to the portal subdomain, known only
  // from the callback's `referer` query param — overridden via `extra.tokenUrl`.
  const tokenUrl = extra.tokenUrl || config.tokenUrl;
  if (!tokenUrl) throw new Error(`No token URL resolved for provider "${provider}"`);

  const params = new URLSearchParams({
    client_id: config.clientId,
    client_secret: config.clientSecret,
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
  });

  const raw = await postForToken(tokenUrl, params);
  const accessToken = raw.access_token;
  if (typeof accessToken !== "string") {
    throw new Error(`Token exchange response for "${provider}" did not include access_token`);
  }

  return {
    accessToken,
    refreshToken: typeof raw.refresh_token === "string" ? raw.refresh_token : undefined,
    expiresAt: expiresAtFrom(raw),
    raw,
  };
}

export async function refreshAccessToken(provider: string, refreshToken: string): Promise<ExchangeResult> {
  const config = getOAuthConfig(provider);
  if (!config) throw new Error(`OAuth is not configured for provider "${provider}"`);
  if (!config.tokenUrl) throw new Error(`No token URL resolved for provider "${provider}"`);

  const params = new URLSearchParams({
    client_id: config.clientId,
    client_secret: config.clientSecret,
    grant_type: "refresh_token",
    refresh_token: refreshToken,
  });

  const raw = await postForToken(config.tokenUrl, params);
  const accessToken = raw.access_token;
  if (typeof accessToken !== "string") {
    throw new Error(`Token refresh response for "${provider}" did not include access_token`);
  }

  return {
    accessToken,
    // Google (and most providers) omit refresh_token on refresh — the
    // original one stays valid and must be reused by the caller.
    refreshToken: typeof raw.refresh_token === "string" ? raw.refresh_token : refreshToken,
    expiresAt: expiresAtFrom(raw),
    raw,
  };
}
