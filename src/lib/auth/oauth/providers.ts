import "server-only";

export type ProviderId = "google" | "github";

export type OAuthProfile = {
  providerAccountId: string;
  email: string | null;
  name: string | null;
  image: string | null;
};

type ProviderConfig = {
  authorizeUrl: string;
  tokenUrl: string;
  profileUrl: string;
  scope: string;
  clientIdEnv: string;
  clientSecretEnv: string;
  mapProfile: (raw: Record<string, unknown>) => OAuthProfile;
};

const PROVIDERS: Record<ProviderId, ProviderConfig> = {
  google: {
    authorizeUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenUrl: "https://oauth2.googleapis.com/token",
    profileUrl: "https://openidconnect.googleapis.com/v1/userinfo",
    scope: "openid email profile",
    clientIdEnv: "GOOGLE_CLIENT_ID",
    clientSecretEnv: "GOOGLE_CLIENT_SECRET",
    mapProfile: (raw) => ({
      providerAccountId: String(raw.sub),
      email: (raw.email as string) ?? null,
      name: (raw.name as string) ?? null,
      image: (raw.picture as string) ?? null,
    }),
  },
  github: {
    authorizeUrl: "https://github.com/login/oauth/authorize",
    tokenUrl: "https://github.com/login/oauth/access_token",
    profileUrl: "https://api.github.com/user",
    scope: "read:user user:email",
    clientIdEnv: "GITHUB_CLIENT_ID",
    clientSecretEnv: "GITHUB_CLIENT_SECRET",
    mapProfile: (raw) => ({
      providerAccountId: String(raw.id),
      email: (raw.email as string) ?? null,
      name: (raw.name as string) ?? (raw.login as string) ?? null,
      image: (raw.avatar_url as string) ?? null,
    }),
  },
};

export function buildAuthorizeUrl(
  provider: ProviderId,
  state: string,
  redirectUri: string,
): string {
  const config = PROVIDERS[provider];
  const url = new URL(config.authorizeUrl);
  url.searchParams.set("client_id", process.env[config.clientIdEnv]!);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("state", state);
  url.searchParams.set("scope", config.scope);
  url.searchParams.set("response_type", "code");
  return url.toString();
}

export async function exchangeCodeForProfile(
  provider: ProviderId,
  code: string,
  redirectUri: string,
): Promise<OAuthProfile | null> {
  const config = PROVIDERS[provider];
  try {
    const tokenResponse = await fetch(config.tokenUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        // GitHub's token endpoint otherwise replies with a query-string body
        // instead of JSON; Google ignores this header and always returns JSON.
        Accept: "application/json",
      },
      body: new URLSearchParams({
        client_id: process.env[config.clientIdEnv]!,
        client_secret: process.env[config.clientSecretEnv]!,
        code,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });
    if (!tokenResponse.ok) {
      const body = await tokenResponse.text?.().catch(() => "<unreadable body>");
      console.error(`OAuth token exchange failed for ${provider}: ${tokenResponse.status} ${body}`);
      return null;
    }
    const tokenBody = (await tokenResponse.json()) as { access_token?: string };
    if (!tokenBody.access_token) return null;

    const profileResponse = await fetch(config.profileUrl, {
      headers: { Authorization: `Bearer ${tokenBody.access_token}` },
    });
    if (!profileResponse.ok) return null;
    const raw = (await profileResponse.json()) as Record<string, unknown>;
    return config.mapProfile(raw);
  } catch (error) {
    console.error(`OAuth exchange failed for ${provider}`, error);
    return null;
  }
}
