"use client";

import { useTranslations } from "next-intl";
import { useClerk } from "@clerk/nextjs";
import { LogOut } from "lucide-react";
import { SidebarMenuButton } from "@/components/ui/sidebar";

export function UserMenu({ name }: { name: string | null }) {
  const t = useTranslations("dashboard.userMenu");
  const { signOut } = useClerk();
  const displayName = name ?? t("anonymous");

  // The dashboard sidebar is permanently locked to icon-rail mode (see
  // (dashboard)/layout.tsx) — an initial badge (matching OrgSwitcher's
  // treatment) plus an icon-only sign-out button fit the rail instead of
  // the name + full button row this used to render.
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2 px-1 py-1" title={displayName}>
        <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-sidebar-accent text-xs font-semibold text-sidebar-accent-foreground">
          {displayName.charAt(0).toUpperCase() || "?"}
        </span>
        <span className="truncate text-sm group-data-[collapsible=icon]:hidden">{displayName}</span>
      </div>
      <SidebarMenuButton tooltip={t("signOut")} onClick={() => signOut({ redirectUrl: "/sign-in" })}>
        <LogOut />
        <span>{t("signOut")}</span>
      </SidebarMenuButton>
    </div>
  );
}
