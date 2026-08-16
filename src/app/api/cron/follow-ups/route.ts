import { NextResponse } from "next/server";
import { processDueFollowUps } from "@/lib/follow-ups/scheduler";

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

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { processedCount, errorsCount } = await processDueFollowUps();

    return NextResponse.json({
      success: true,
      processedCount,
      errorsCount,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Cron follow-ups error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
