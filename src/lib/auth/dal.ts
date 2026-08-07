import "server-only";
import { cache } from "react";
import { redirect, notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { auth, currentUser } from "@clerk/nextjs/server";
import { db } from "@/db/client";
import { memberships, organizations } from "@/db/schema/org";
import { aiAgents } from "@/db/schema/agents";

export const getSession = cache(async () => {
  const { userId } = await auth();
  if (!userId) return null;

  const user = await currentUser();
  if (!user) return null;

  return {
    user: {
      id: userId,
      email: user.primaryEmailAddress?.emailAddress ?? null,
      name: user.fullName ?? user.username ?? null,
      image: user.imageUrl ?? null,
    },
  };
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

export async function requireAgent(locale: string, agentId: string) {
  const context = await requireOrganization(locale);
  const [agent] = await db.select().from(aiAgents).where(eq(aiAgents.id, agentId));

  if (!agent || agent.organizationId !== context.organization.id) {
    notFound();
  }
  return { ...context, agent: agent! };
}
