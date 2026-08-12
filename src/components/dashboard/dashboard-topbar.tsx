"use client";

import { useTranslations } from "next-intl";
import { usePathname } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/marketing/theme-toggle";
import { getActiveNavItem } from "./sidebar-nav";

export function DashboardTopbar() {
  const t = useTranslations("dashboard");
  const pathname = usePathname();
  const active = getActiveNavItem(pathname);

  return (
    <div className="border-border flex h-12 shrink-0 items-center justify-between border-b px-4">
      <span className="text-sm font-medium">{active ? t(`nav.${active.key}`) : null}</span>
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          disabled
          aria-label={t("topbar.commandPaletteHint")}
          className="text-muted-foreground gap-1 px-2 text-xs"
        >
          <span>⌘K</span>
        </Button>
        <ThemeToggle />
      </div>
    </div>
  );
}
