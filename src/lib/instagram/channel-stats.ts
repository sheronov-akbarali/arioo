import "server-only";

const GRAPH_API_BASE = "https://graph.facebook.com/v21.0";

export type InstagramCredentials = {
  accessToken: string;
  expiresAt?: string;
  pageAccessToken?: string;
  igUserId?: string;
  username?: string;
};

export type InstagramStatsResult =
  | {
      available: true;
      username: string;
      followersCount: number;
      mediaCount: number;
      reach: number;
      profileViews: number;
      updatedCredentials: InstagramCredentials;
    }
  | { available: false; reason: "reauth_required" | "no_business_account" | "unknown" };

type ExchangeFn = (accessToken: string) => Promise<{ accessToken: string; expiresAt?: string }>;

type GraphErrorBody = { error?: { message?: string; code?: number } };

class InstagramApiError extends Error {
  code?: number;
  constructor(message: string, code?: number) {
    super(message);
    this.code = code;
  }
}

async function graphFetch(
  accessToken: string,
  path: string,
  params: Record<string, string>
): Promise<Record<string, unknown>> {
  const url = new URL(`${GRAPH_API_BASE}/${path}`);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  url.searchParams.set("access_token", accessToken);

  const res = await fetch(url);
  const json = (await res.json().catch(() => null)) as (GraphErrorBody & Record<string, unknown>) | null;

  if (!res.ok || json?.error) {
    throw new InstagramApiError(json?.error?.message ?? `Instagram API error ${res.status}`, json?.error?.code);
  }
  return json ?? {};
}

async function resolveBusinessAccount(
  userAccessToken: string
): Promise<{ pageAccessToken: string; igUserId: string } | null> {
  const accounts = await graphFetch(userAccessToken, "me/accounts", {
    fields: "id,access_token,instagram_business_account",
  });
  const pages =
    (accounts.data as
      | Array<{ id: string; access_token: string; instagram_business_account?: { id: string } }>
      | undefined) ?? [];
  const withIg = pages.find((page) => page.instagram_business_account?.id);
  if (!withIg?.instagram_business_account) return null;
  return { pageAccessToken: withIg.access_token, igUserId: withIg.instagram_business_account.id };
}

function insightValue(insights: Record<string, unknown>, metric: string): number {
  const data = (insights.data as Array<{ name: string; values?: Array<{ value: number }> }> | undefined) ?? [];
  const found = data.find((row) => row.name === metric);
  return found?.values?.at(-1)?.value ?? 0;
}

export async function getInstagramChannelStats(
  credentials: InstagramCredentials,
  exchange: ExchangeFn
): Promise<InstagramStatsResult> {
  let creds = credentials;

  // Meta long-lived user tokens last ~60 days; refresh well ahead of expiry
  // since the exchange endpoint only allows one renewal per 24h anyway.
  const EXPIRY_BUFFER_MS = 6 * 60 * 60 * 1000;
  const isExpired = !creds.expiresAt || new Date(creds.expiresAt).getTime() - EXPIRY_BUFFER_MS < Date.now();
  if (isExpired) {
    try {
      const refreshed = await exchange(creds.accessToken);
      creds = { ...creds, accessToken: refreshed.accessToken, expiresAt: refreshed.expiresAt };
    } catch {
      return { available: false, reason: "reauth_required" };
    }
  }

  try {
    if (!creds.pageAccessToken || !creds.igUserId) {
      const resolved = await resolveBusinessAccount(creds.accessToken);
      if (!resolved) return { available: false, reason: "no_business_account" };
      creds = { ...creds, pageAccessToken: resolved.pageAccessToken, igUserId: resolved.igUserId };
    }

    const pageAccessToken = creds.pageAccessToken as string;
    const igUserId = creds.igUserId as string;

    const profile = await graphFetch(pageAccessToken, igUserId, {
      fields: "username,followers_count,media_count",
    });
    const insights = await graphFetch(pageAccessToken, `${igUserId}/insights`, {
      metric: "reach,profile_views",
      period: "day",
    });

    const username = String(profile.username ?? "");
    return {
      available: true,
      username,
      followersCount: Number(profile.followers_count ?? 0),
      mediaCount: Number(profile.media_count ?? 0),
      reach: insightValue(insights, "reach"),
      profileViews: insightValue(insights, "profile_views"),
      updatedCredentials: { ...creds, username },
    };
  } catch (error) {
    if (error instanceof InstagramApiError && (error.code === 190 || error.code === 102)) {
      return { available: false, reason: "reauth_required" };
    }
    return { available: false, reason: "unknown" };
  }
}
