"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

const TABS = [
  { key: "ai", labelKey: "ai" },
  { key: "chats", labelKey: "chats" },
  { key: "calls", labelKey: "calls" },
  { key: "knowledge", labelKey: "knowledge" },
  { key: "analytics", labelKey: "analytics" },
  { key: "ab-testing", labelKey: "abTesting" },
] as const;

export function AssistantTabs({ agentId }: { agentId: string }) {
  const t = useTranslations("assistants.detail.tabs");
  const pathname = usePathname();

  return (
    <nav className="flex flex-wrap gap-1 border-b border-border">
      {TABS.map(({ key, labelKey }) => {
        const href = `/assistants/${agentId}/${key}`;
        const active = pathname.startsWith(href);
        return (
          <Link
            key={key}
            href={href}
            className={cn(
              "border-b-2 px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "border-brand text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {t(labelKey)}
          </Link>
        );
      })}
    </nav>
  );
}
