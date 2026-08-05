"use server";

import { headers, cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { sessions } from "@/db/schema/auth";
import { SESSION_COOKIE_NAME } from "./cookies";

export async function touchSession(): Promise<void> {
  const token = (await cookies()).get(SESSION_COOKIE_NAME)?.value;
  if (!token) return;
  const headerList = await headers();
  await db
    .update(sessions)
    .set({
      userAgent: headerList.get("user-agent") ?? null,
      ipAddress: headerList.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
      lastActiveAt: new Date(),
    })
    .where(eq(sessions.sessionToken, token));
}
