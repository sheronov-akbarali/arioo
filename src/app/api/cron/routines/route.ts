import { NextResponse } from "next/server";
import { runScheduledRoutines } from "@/lib/routines/executor";

/**
 * Cron Runner for "schedule"-triggered Routines.
 * "crm_event"/"integration_event"/"ai_event" routines fire immediately from
 * their real event source instead — see src/lib/routines/executor.ts.
 * Can be triggered by Vercel Cron or any scheduler via GET/POST /api/cron/routines
 */
export async function GET(req: Request) {
  return handleCron(req);
}

export async function POST(req: Request) {
  return handleCron(req);
}

async function handleCron(req: Request) {
  try {
    const authHeader = req.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    // Optional secret check if configured
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const results = await runScheduledRoutines();

    return NextResponse.json({
      success: true,
      executedCount: results.length,
      results,
    });
  } catch (error) {
    console.error("Cron execution error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
