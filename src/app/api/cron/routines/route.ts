import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { routines } from "@/db/schema/routines";
import { notifications } from "@/db/schema/notifications";

/**
 * Automated Cron Runner for Scheduled Routines
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

    // Fetch active routines
    const activeRoutines = await db
      .select()
      .from(routines)
      .where(eq(routines.status, "active"));

    console.log(`Cron: Executing ${activeRoutines.length} active routines...`);

    const results = [];
    for (const r of activeRoutines) {
      try {
        // Record notification for organization
        await db.insert(notifications).values({
          id: crypto.randomUUID(),
          organizationId: r.organizationId,
          type: "system",
          title: `Avtomatik Rutina bajarildi: ${r.name}`,
          body: `Trigger: ${r.triggerType} (${r.resource}) reja bo'yicha muvaffaqiyatli ishga tushirildi.`,
        });

        results.push({ id: r.id, name: r.name, status: "executed" });
      } catch (err) {
        console.error(`Failed to execute routine ${r.id}:`, err);
        results.push({ id: r.id, name: r.name, status: "failed" });
      }
    }

    return NextResponse.json({
      success: true,
      executedCount: activeRoutines.length,
      results,
    });
  } catch (error) {
    console.error("Cron execution error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
