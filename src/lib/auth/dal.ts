import "server-only";
import { cache } from "react";
import { redirect, notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { auth, currentUser } from "@clerk/nextjs/server";
import { db } from "@/db/client";
import { memberships, organizations } from "@/db/schema/org";
import { aiAgents } from "@/db/schema/agents";

export const getSession = cache(async () => {
  // Clerk's backend API (currentUser/auth) can fail transiently (rate
  // limiting, a network hiccup) — without this guard that throws through
  // every page that calls requireOrganization/requireAgent, crashing the
  // whole render instead of just bouncing to sign-in like a real
  // unauthenticated visit would.
  try {
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
  } catch (error) {
    console.error("getSession: Clerk API call failed", error);
    return null;
  }
});

export async function verifySession(locale: string) {
  const result = await getSession();
  if (!result) redirect(`/${locale}/sign-in`);
  return result;
}

/** Like requireOrganization, but for pages reachable by both signed-out
 * visitors and signed-in dashboard users (e.g. the public pricing page)
 * — returns null instead of redirecting when there's no session/org. */
export async function getOptionalOrganization() {
  const session = await getSession();
  if (!session) return null;

  const [row] = await db
    .select({ membership: memberships, organization: organizations })
    .from(memberships)
    .innerJoin(organizations, eq(memberships.organizationId, organizations.id))
    .where(eq(memberships.userId, session.user.id));

  if (!row) return null;
  return { ...session, ...row };
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

// API routes can't use requireOrganization/requireAgent: those redirect()
// on failure, which is a Next.js navigation helper that only works from
// Server Components/Actions, not from a Route Handler. This returns null
// instead so callers can respond with a proper 401/404 Response.
export async function getAgentForCurrentUser(agentId: string) {
  const { userId } = await auth();
  if (!userId) return null;

  const [membership] = await db
    .select()
    .from(memberships)
    .where(eq(memberships.userId, userId));
  if (!membership) return null;

  const [agent] = await db.select().from(aiAgents).where(eq(aiAgents.id, agentId));
  if (!agent || agent.organizationId !== membership.organizationId) return null;

  return agent;
}
