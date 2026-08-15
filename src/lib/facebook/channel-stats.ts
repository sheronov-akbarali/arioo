import "server-only";

const GRAPH_API_BASE = "https://graph.facebook.com/v21.0";

export type FacebookCredentials = {
  accessToken: string;
  expiresAt?: string;
  pageAccessToken?: string;
  pageId?: string;
  pageName?: string;
};

export type FacebookStatsResult =
  | {
      available: true;
      pageName: string;
      fanCount: number;
      impressions: number;
      engagedUsers: number;
      updatedCredentials: FacebookCredentials;
    }
  | { available: false; reason: "reauth_required" | "no_page" | "unknown" };

type ExchangeFn = (accessToken: string) => Promise<{ accessToken: string; expiresAt?: string }>;

type GraphErrorBody = { error?: { message?: string; code?: number } };

class FacebookApiError extends Error {
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
    throw new FacebookApiError(json?.error?.message ?? `Facebook API error ${res.status}`, json?.error?.code);
  }
  return json ?? {};
}

async function resolvePage(
  userAccessToken: string
): Promise<{ pageAccessToken: string; pageId: string; pageName: string } | null> {
  const accounts = await graphFetch(userAccessToken, "me/accounts", { fields: "id,name,access_token" });
  const pages = (accounts.data as Array<{ id: string; name: string; access_token: string }> | undefined) ?? [];
  const first = pages[0];
  if (!first) return null;
  return { pageAccessToken: first.access_token, pageId: first.id, pageName: first.name };
}

function insightValue(insights: Record<string, unknown>, metric: string): number {
  const data = (insights.data as Array<{ name: string; values?: Array<{ value: number }> }> | undefined) ?? [];
  const found = data.find((row) => row.name === metric);
  return found?.values?.at(-1)?.value ?? 0;
}

export async function getFacebookPageStats(
  credentials: FacebookCredentials,
  exchange: ExchangeFn
): Promise<FacebookStatsResult> {
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
    if (!creds.pageAccessToken || !creds.pageId) {
      const resolved = await resolvePage(creds.accessToken);
      if (!resolved) return { available: false, reason: "no_page" };
      creds = { ...creds, pageAccessToken: resolved.pageAccessToken, pageId: resolved.pageId, pageName: resolved.pageName };
    }

    const pageAccessToken = creds.pageAccessToken as string;
    const pageId = creds.pageId as string;

    const profile = await graphFetch(pageAccessToken, pageId, { fields: "name,fan_count" });
    const insights = await graphFetch(pageAccessToken, `${pageId}/insights`, {
      metric: "page_impressions,page_engaged_users",
      period: "day",
    });

    const pageName = String(profile.name ?? creds.pageName ?? "");
    return {
      available: true,
      pageName,
      fanCount: Number(profile.fan_count ?? 0),
      impressions: insightValue(insights, "page_impressions"),
      engagedUsers: insightValue(insights, "page_engaged_users"),
      updatedCredentials: { ...creds, pageName },
    };
  } catch (error) {
    if (error instanceof FacebookApiError && (error.code === 190 || error.code === 102)) {
      return { available: false, reason: "reauth_required" };
    }
    return { available: false, reason: "unknown" };
  }
}
