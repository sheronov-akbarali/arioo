import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { siteAnalyticsSites, siteAnalyticsEvents } from "@/db/schema/site-analytics";
import { hashVisitor } from "@/lib/site-analytics/visitor-hash";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

// Public, unauthenticated ingestion endpoint — called cross-origin from the
// tracked site itself. The tracking key is the access control: never leak
// validation details, always respond 204 regardless of outcome.
export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => null)) as
      | { key?: string; path?: string; referrer?: string | null }
      | null;

    const key = body?.key;
    if (typeof key === "string" && key) {
      const [site] = await db
        .select({ id: siteAnalyticsSites.id })
        .from(siteAnalyticsSites)
        .where(eq(siteAnalyticsSites.trackingKey, key));

      if (site) {
        const ip =
          req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
          req.headers.get("x-real-ip") ||
          "unknown";
        const userAgent = req.headers.get("user-agent") || "unknown";
        const visitorHash = hashVisitor(ip, userAgent);

        let referrerHost: string | null = null;
        if (typeof body?.referrer === "string" && body.referrer) {
          try {
            referrerHost = new URL(body.referrer).hostname;
          } catch {
            referrerHost = null;
          }
        }

        const path = typeof body?.path === "string" && body.path ? body.path.slice(0, 512) : "/";

        await db.insert(siteAnalyticsEvents).values({ siteId: site.id, path, referrerHost, visitorHash });
      }
    }
  } catch (error) {
    console.error("Site analytics collect failed:", error);
  }

  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}
