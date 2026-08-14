"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

const TABS = ["ai", "chats", "calls", "knowledge"] as const;

export function AssistantTabs({ agentId }: { agentId: string }) {
  const t = useTranslations("assistants.detail.tabs");
  const pathname = usePathname();

  return (
    <nav className="flex flex-wrap gap-1 border-b border-border">
      {TABS.map((tab) => {
        const href = `/assistants/${agentId}/${tab}`;
        const active = pathname.startsWith(href);
        return (
          <Link
            key={tab}
            href={href}
            className={cn(
              "border-b-2 px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "border-brand text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {t(tab)}
          </Link>
        );
      })}
    </nav>
  );
}
