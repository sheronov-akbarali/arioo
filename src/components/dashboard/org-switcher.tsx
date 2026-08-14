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
    <div className="flex h-11 w-full items-center gap-3 rounded-lg px-3 transition-colors hover:bg-sidebar-accent" title={name}>
      <span className="flex size-6 shrink-0 items-center justify-center text-sidebar-primary">
        <svg viewBox="0 0 512 512" className="size-6" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
          <g stroke="currentColor" strokeWidth="32" strokeLinecap="round">
            <line x1="256" y1="270" x2="150" y2="380" />
            <line x1="256" y1="270" x2="362" y2="380" />
            <line x1="256" y1="270" x2="256" y2="128" />
          </g>
          <circle cx="150" cy="380" r="42" fill="currentColor" />
          <circle cx="362" cy="380" r="42" fill="currentColor" />
          <circle cx="256" cy="128" r="42" fill="currentColor" />
          <circle cx="256" cy="270" r="76" fill="currentColor" opacity="0.9" />
        </svg>
      </span>
      <span className="truncate text-[15px] font-bold text-sidebar-foreground group-data-[collapsible=icon]:hidden">
        {name}
      </span>
    </div>
  );
}
