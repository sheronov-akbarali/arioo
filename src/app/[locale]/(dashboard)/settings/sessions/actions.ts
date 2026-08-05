"use server";

import { revalidatePath } from "next/cache";
import { and, eq, ne } from "drizzle-orm";
import { cookies } from "next/headers";
import { db } from "@/db/client";
import { sessions } from "@/db/schema/auth";
import { verifySession } from "@/lib/auth/dal";
import { SESSION_COOKIE_NAME } from "@/lib/auth/cookies";

export async function revokeSessionAction(locale: string, sessionToken: string): Promise<void> {
  const { user } = await verifySession(locale);
  await db
    .delete(sessions)
    .where(and(eq(sessions.sessionToken, sessionToken), eq(sessions.userId, user.id)));
  revalidatePath(`/${locale}/settings/sessions`);
}

export async function revokeOtherSessionsAction(locale: string): Promise<void> {
  const { user } = await verifySession(locale);
  const currentToken = (await cookies()).get(SESSION_COOKIE_NAME)?.value;
  await db
    .delete(sessions)
    .where(
      and(
        eq(sessions.userId, user.id),
        currentToken ? ne(sessions.sessionToken, currentToken) : undefined,
      ),
    );
  revalidatePath(`/${locale}/settings/sessions`);
}
