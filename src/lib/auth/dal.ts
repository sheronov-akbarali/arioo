import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { sessions, users } from "@/db/schema/auth";
import { memberships, organizations } from "@/db/schema/org";
import { SESSION_COOKIE_NAME } from "./cookies";

export const getSession = cache(async () => {
  const token = (await cookies()).get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;

  const [row] = await db
    .select({ session: sessions, user: users })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(eq(sessions.sessionToken, token));

  if (!row || row.session.expires < new Date()) return null;
  return row;
});

export async function verifySession(locale: string) {
  const result = await getSession();
  if (!result) redirect(`/${locale}/sign-in`);
  return result;
}

export async function requireOrganization(locale: string) {
  const session = await verifySession(locale);

  const [row] = await db
    .select({ membership: memberships, organization: organizations })
    .from(memberships)
    .innerJoin(organizations, eq(memberships.organizationId, organizations.id))
    .where(eq(memberships.userId, session.user.id));

  if (!row) redirect(`/${locale}/onboarding`);
  return { ...session, ...row };
}
