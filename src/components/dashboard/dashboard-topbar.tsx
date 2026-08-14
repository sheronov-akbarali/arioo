"use client";

import { useTranslations, useLocale } from "next-intl";
import { usePathname } from "@/i18n/navigation";
import { ThemeToggle } from "@/components/marketing/theme-toggle";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { getActiveNavItem } from "./sidebar-nav";
import { CommandPalette } from "./command-palette";
import { NotificationsPopover } from "./notifications-popover";

export function DashboardTopbar() {
  const t = useTranslations("dashboard");
  const locale = useLocale();
  const pathname = usePathname();
  const active = getActiveNavItem(pathname);

  return (
    <div className="border-border flex h-14 shrink-0 items-center justify-between border-b px-3 sm:px-4 bg-background/95 backdrop-blur-sm sticky top-0 z-20">
      <div className="flex items-center gap-2">
        <SidebarTrigger className="flex md:hidden" />
        <span className="text-sm font-semibold truncate max-w-[180px] sm:max-w-none">
          {active ? t(`nav.${active.key}`) : null}
        </span>
      </div>
      <div className="flex items-center gap-1.5 sm:gap-2">
        <CommandPalette locale={locale} />
        <NotificationsPopover locale={locale} />
        <ThemeToggle />
      </div>
    </div>
  );
}
