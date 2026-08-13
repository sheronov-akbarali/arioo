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
  const name = active?.name ?? "";

  // Multi-organization switching UI is deferred: worken.ru's own switcher only
  // matters once a user belongs to 2+ orgs, which Phase 2a's single-org
  // onboarding flow (Task 11) never produces. Rendering the active org name
  // now avoids a dead click target; the dropdown is a Phase 3+ addition once
  // a second org can actually be joined (e.g. via Task 15's team invites).
  //
  // The dashboard sidebar is permanently locked to icon-rail mode (see
  // (dashboard)/layout.tsx), so the name never has room to render — only the
  // initial badge is ever visible. It still renders in the DOM (hidden via
  // group-data-[collapsible=icon]:hidden, the same convention SidebarNav's
  // labels use) rather than being omitted, so a future expandable sidebar
  // doesn't need this component touched again.
  return (
    <div className="flex items-center gap-2 px-1 py-1" title={name}>
      <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-sidebar-primary text-xs font-semibold text-sidebar-primary-foreground">
        {name.charAt(0).toUpperCase() || "?"}
      </span>
      <span className="truncate text-sm font-medium group-data-[collapsible=icon]:hidden">{name}</span>
    </div>
  );
}
