"use client";

import { useTranslations } from "next-intl";
import { useClerk } from "@clerk/nextjs";
import { LogOut } from "lucide-react";
import { SidebarMenuButton } from "@/components/ui/sidebar";

export function UserMenu({ name }: { name: string | null }) {
  const t = useTranslations("dashboard.userMenu");
  const displayName = name ?? t("anonymous");

  // The dashboard sidebar is permanently locked to icon-rail mode (see
  // (dashboard)/layout.tsx) — an initial badge (matching OrgSwitcher's
  // treatment) plus an icon-only sign-out button fit the rail instead of
  // the name + full button row this used to render.
  return (
    <div className="flex h-11 w-full items-center gap-3 rounded-lg px-3 transition-colors hover:bg-sidebar-accent">
      <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-sidebar-primary text-sm font-bold text-sidebar-primary-foreground shadow-sm">
        {displayName.charAt(0).toUpperCase() || "?"}
      </span>
      <span className="truncate text-[15px] font-medium text-sidebar-foreground group-data-[collapsible=icon]:hidden">
        {displayName}
      </span>
    </div>
  );
}
