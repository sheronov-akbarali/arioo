import "server-only";
import { and, eq, gte, lt, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { siteAnalyticsSites, siteAnalyticsEvents } from "@/db/schema/site-analytics";

export type RegisteredSite = { id: string; domain: string; trackingKey: string };

export type SiteAnalyticsCount = { pageviews: number; visitors: number };
export type SiteAnalyticsBreakdownRow = { key: string; visitors: number };

export type SiteAnalyticsData = {
  totals: SiteAnalyticsCount;
  previousTotals: SiteAnalyticsCount;
  topPages: SiteAnalyticsBreakdownRow[];
  topReferrers: SiteAnalyticsBreakdownRow[];
  hasAnyEventEver: boolean;
};

export async function getRegisteredSite(organizationId: string): Promise<RegisteredSite | null> {
  const [row] = await db
    .select({ id: siteAnalyticsSites.id, domain: siteAnalyticsSites.domain, trackingKey: siteAnalyticsSites.trackingKey })
    .from(siteAnalyticsSites)
    .where(eq(siteAnalyticsSites.organizationId, organizationId));
  return row ?? null;
}

async function countRange(siteId: string, since: Date, until: Date): Promise<SiteAnalyticsCount> {
  const [row] = await db
    .select({
      pageviews: sql<number>`count(*)`,
      visitors: sql<number>`count(distinct ${siteAnalyticsEvents.visitorHash})`,
    })
    .from(siteAnalyticsEvents)
    .where(
      and(
        eq(siteAnalyticsEvents.siteId, siteId),
        gte(siteAnalyticsEvents.createdAt, since),
        lt(siteAnalyticsEvents.createdAt, until)
      )
    );
  return { pageviews: Number(row?.pageviews ?? 0), visitors: Number(row?.visitors ?? 0) };
}

async function topPathsBreakdown(siteId: string, since: Date, until: Date): Promise<SiteAnalyticsBreakdownRow[]> {
  const rows = await db
    .select({
      key: siteAnalyticsEvents.path,
      visitors: sql<number>`count(distinct ${siteAnalyticsEvents.visitorHash})`,
    })
    .from(siteAnalyticsEvents)
    .where(
      and(
        eq(siteAnalyticsEvents.siteId, siteId),
        gte(siteAnalyticsEvents.createdAt, since),
        lt(siteAnalyticsEvents.createdAt, until)
      )
    )
    .groupBy(siteAnalyticsEvents.path)
    .orderBy(sql`count(distinct ${siteAnalyticsEvents.visitorHash}) desc`)
    .limit(8);
  return rows.map((row) => ({ key: row.key, visitors: Number(row.visitors) }));
}

async function topReferrersBreakdown(siteId: string, since: Date, until: Date): Promise<SiteAnalyticsBreakdownRow[]> {
  const rows = await db
    .select({
      key: siteAnalyticsEvents.referrerHost,
      visitors: sql<number>`count(distinct ${siteAnalyticsEvents.visitorHash})`,
    })
    .from(siteAnalyticsEvents)
    .where(
      and(
        eq(siteAnalyticsEvents.siteId, siteId),
        gte(siteAnalyticsEvents.createdAt, since),
        lt(siteAnalyticsEvents.createdAt, until)
      )
    )
    .groupBy(siteAnalyticsEvents.referrerHost)
    .orderBy(sql`count(distinct ${siteAnalyticsEvents.visitorHash}) desc`)
    .limit(8);
  return rows.map((row) => ({ key: row.key ?? "direct", visitors: Number(row.visitors) }));
}

export async function getSiteAnalyticsData(
  siteId: string,
  currentStart: Date,
  currentEnd: Date,
  previousStart: Date
): Promise<SiteAnalyticsData> {
  const [totals, previousTotals, topPages, topReferrers, everRows] = await Promise.all([
    countRange(siteId, currentStart, currentEnd),
    countRange(siteId, previousStart, currentStart),
    topPathsBreakdown(siteId, currentStart, currentEnd),
    topReferrersBreakdown(siteId, currentStart, currentEnd),
    db.select({ id: siteAnalyticsEvents.id }).from(siteAnalyticsEvents).where(eq(siteAnalyticsEvents.siteId, siteId)).limit(1),
  ]);

  return { totals, previousTotals, topPages, topReferrers, hasAnyEventEver: everRows.length > 0 };
}
