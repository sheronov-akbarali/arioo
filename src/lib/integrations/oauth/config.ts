import "server-only";

export type OAuthProviderConfig = {
  authUrl: string;
  tokenUrl: string;
  clientId: string;
  clientSecret: string;
  scopes: string[];
  extraAuthParams?: Record<string, string>;
};

const PROVIDER_ENV_PREFIX: Record<string, string> = {
  amocrm: "AMOCRM",
  bitrix24: "BITRIX24",
  google: "GOOGLE",
  youtube: "GOOGLE",
  github: "GITHUB",
  headhunter: "HEADHUNTER",
  instagram: "META",
  facebook: "META",
};

const PROVIDER_ENDPOINTS: Record<
  string,
  { authUrl: string; tokenUrl: string; scopes: string[]; extraAuthParams?: Record<string, string> }
> = {
  amocrm: { authUrl: "https://www.amocrm.ru/oauth", tokenUrl: "", scopes: [] },
  bitrix24: {
    authUrl: "https://auth2.bitrix24.net/oauth/authorize/",
    tokenUrl: "https://oauth.bitrix.info/oauth/token/",
    scopes: ["im", "imbot", "imopenlines", "crm", "user_basic"],
  },
  google: {
    authUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenUrl: "https://oauth2.googleapis.com/token",
    scopes: [
      "https://www.googleapis.com/auth/drive",
      "https://www.googleapis.com/auth/spreadsheets",
      "https://www.googleapis.com/auth/calendar",
      "https://www.googleapis.com/auth/calendar.events",
      "https://www.googleapis.com/auth/userinfo.profile",
      "https://www.googleapis.com/auth/userinfo.email",
    ],
  },
  youtube: {
    authUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenUrl: "https://oauth2.googleapis.com/token",
    scopes: ["https://www.googleapis.com/auth/youtube.readonly"],
    extraAuthParams: { access_type: "offline", prompt: "consent" },
  },
  github: {
    authUrl: "https://github.com/login/oauth/authorize",
    tokenUrl: "https://github.com/login/oauth/access_token",
    scopes: ["repo", "read:user"],
  },
  headhunter: {
    authUrl: "https://hh.ru/oauth/authorize",
    tokenUrl: "https://hh.ru/oauth/token",
    scopes: [],
  },
  instagram: {
    authUrl: "https://www.facebook.com/v21.0/dialog/oauth",
    tokenUrl: "https://graph.facebook.com/v21.0/oauth/access_token",
    scopes: [
      "instagram_basic",
      "instagram_manage_insights",
      "pages_show_list",
      "pages_read_engagement",
      "business_management",
    ],
  },
  facebook: {
    authUrl: "https://www.facebook.com/v21.0/dialog/oauth",
    tokenUrl: "https://graph.facebook.com/v21.0/oauth/access_token",
    scopes: ["pages_show_list", "pages_read_engagement"],
  },
};

export function isOAuthConfigured(provider: string): boolean {
  const prefix = PROVIDER_ENV_PREFIX[provider];
  if (!prefix) return false;
  return Boolean(process.env[`${prefix}_CLIENT_ID`] && process.env[`${prefix}_CLIENT_SECRET`]);
}

export function getOAuthConfig(provider: string): OAuthProviderConfig | null {
  const prefix = PROVIDER_ENV_PREFIX[provider];
  const endpoints = PROVIDER_ENDPOINTS[provider];
  if (!prefix || !endpoints) return null;

  const clientId = process.env[`${prefix}_CLIENT_ID`];
  const clientSecret = process.env[`${prefix}_CLIENT_SECRET`];
  if (!clientId || !clientSecret) return null;

  return { ...endpoints, clientId, clientSecret };
}
