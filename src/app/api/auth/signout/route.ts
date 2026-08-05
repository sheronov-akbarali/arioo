import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { sessions } from "@/db/schema/auth";
import { SESSION_COOKIE_NAME } from "@/lib/auth/cookies";

export async function POST() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (token) {
    await db.delete(sessions).where(eq(sessions.sessionToken, token));
    cookieStore.delete(SESSION_COOKIE_NAME);
  }
  return NextResponse.json({ ok: true });
}
