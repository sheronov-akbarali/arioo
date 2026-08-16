import "server-only";
import { getOAuthConfig } from "./config";

type ExchangeResult = { accessToken: string; refreshToken?: string; expiresAt?: string; raw: unknown };

type TokenResponsePayload = {
  access_token?: unknown;
  refresh_token?: unknown;
  expires_in?: unknown;
  [key: string]: unknown;
};

async function postForToken(
  tokenUrl: string,
  params: Record<string, string>,
  // amoCRM's token endpoint rejects form-urlencoded bodies and requires JSON
  // — every other provider here (Bitrix24, Google, GitHub, HeadHunter) uses
  // the standard OAuth2 form-encoded body.
  encoding: "form" | "json" = "form"
): Promise<TokenResponsePayload> {
  const response = await fetch(tokenUrl, {
    method: "POST",
    headers:
      encoding === "json"
        ? { "Content-Type": "application/json", Accept: "application/json" }
        : { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
    body: encoding === "json" ? JSON.stringify(params) : new URLSearchParams(params).toString(),
  });

  const json = await response.json().catch(() => null);

  // GitHub (and some other providers) return HTTP 200 even on OAuth errors,
  // with the real reason in an `error`/`error_description` body field.
  if (!response.ok || (json && typeof json === "object" && "error" in json && !("access_token" in json))) {
    const description =
      json && typeof json === "object"
        ? (json as { error_description?: string; error?: string }).error_description ??
          (json as { error?: string }).error
        : undefined;
    throw new Error(
      description
        ? `OAuth token request failed against ${tokenUrl}: ${description}`
        : `OAuth token request failed (${response.status}) against ${tokenUrl}`
    );
  }

  return (json ?? {}) as TokenResponsePayload;
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

  const params = {
    client_id: config.clientId,
    client_secret: config.clientSecret,
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
  };

  const raw = await postForToken(tokenUrl, params, provider === "amocrm" ? "json" : "form");
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

  const params = {
    client_id: config.clientId,
    client_secret: config.clientSecret,
    grant_type: "refresh_token",
    refresh_token: refreshToken,
  };

  const raw = await postForToken(config.tokenUrl, params, provider === "amocrm" ? "json" : "form");
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
