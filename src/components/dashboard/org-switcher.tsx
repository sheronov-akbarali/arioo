import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { memberships, organizations } from "@/db/schema/org";

export async function OrgSwitcher({ userId, activeOrgId }: { userId: string; activeOrgId: string }) {
  const rows = await db
    .select({ organization: organizations })
    .from(memberships)
    .innerJoin(organizations, eq(memberships.organizationId, organizations.id))
    .where(eq(memberships.userId, userId));

  const active = rows.find((row) => row.organization.id === activeOrgId)?.organization;

  // Multi-organization switching UI is deferred: worken.ru's own switcher only
  // matters once a user belongs to 2+ orgs, which Phase 2a's single-org
  // onboarding flow (Task 11) never produces. Rendering the active org name
  // now avoids a dead click target; the dropdown is a Phase 3+ addition once
  // a second org can actually be joined (e.g. via Task 15's team invites).
  return <span className="font-medium">{active?.name}</span>;
}
