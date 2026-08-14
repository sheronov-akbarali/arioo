import "server-only";

const API_BASE = "https://api.vercel.com/v1/query/web-analytics";

export type SiteAnalyticsCount = {
  pageviews: number;
  visitors: number;
};

export type SiteAnalyticsBreakdownRow = {
  key: string;
  visitors: number;
  count: number;
};

export type SiteAnalytics = {
  totals: SiteAnalyticsCount;
  previousTotals: SiteAnalyticsCount;
  topPages: SiteAnalyticsBreakdownRow[];
  topReferrers: SiteAnalyticsBreakdownRow[];
};

function isConfigured(): boolean {
  return Boolean(process.env.VERCEL_API_TOKEN && process.env.VERCEL_ANALYTICS_PROJECT_ID);
}

function authParams(): URLSearchParams {
  const params = new URLSearchParams({
    projectId: process.env.VERCEL_ANALYTICS_PROJECT_ID as string,
  });
  if (process.env.VERCEL_TEAM_ID) params.set("teamId", process.env.VERCEL_TEAM_ID);
  return params;
}

async function query<T>(path: string, params: URLSearchParams): Promise<T> {
  const res = await fetch(`${API_BASE}/${path}?${params.toString()}`, {
    headers: { Authorization: `Bearer ${process.env.VERCEL_API_TOKEN}` },
    // Web Analytics data is not real-time-critical; a short cache keeps the
    // dashboard responsive without hammering the API on every render.
    next: { revalidate: 60 },
  });
  if (!res.ok) {
    throw new Error(`Vercel Web Analytics API error (${res.status}): ${await res.text()}`);
  }
  return res.json() as Promise<T>;
}

async function fetchCount(since: Date, until: Date): Promise<SiteAnalyticsCount> {
  const params = authParams();
  params.set("since", since.toISOString());
  params.set("until", until.toISOString());
  const json = await query<{ data: SiteAnalyticsCount }>("visits/count", params);
  return json.data;
}

async function fetchBreakdown(
  since: Date,
  until: Date,
  by: string,
): Promise<SiteAnalyticsBreakdownRow[]> {
  const params = authParams();
  params.set("since", since.toISOString());
  params.set("until", until.toISOString());
  params.append("by", by);
  params.set("limit", "8");
  const json = await query<{ data: Array<Record<string, unknown>> }>("visits/aggregate", params);
  return json.data.map((row) => ({
    key: String(row[by] ?? "—"),
    visitors: Number(row.visitors ?? 0),
    count: Number(row.count ?? 0),
  }));
}

/**
 * Returns null when VERCEL_API_TOKEN / VERCEL_ANALYTICS_PROJECT_ID are not
 * configured, so callers can render a "not connected" state instead of
 * fake data.
 */
export async function getSiteAnalytics(
  currentStart: Date,
  currentEnd: Date,
  previousStart: Date,
): Promise<SiteAnalytics | null> {
  if (!isConfigured()) return null;

  const [totals, previousTotals, topPages, topReferrers] = await Promise.all([
    fetchCount(currentStart, currentEnd),
    fetchCount(previousStart, currentStart),
    fetchBreakdown(currentStart, currentEnd, "requestPath"),
    fetchBreakdown(currentStart, currentEnd, "referrerHostname"),
  ]);

  return { totals, previousTotals, topPages, topReferrers };
}
