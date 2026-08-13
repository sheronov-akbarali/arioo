"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { ListSearchInput } from "@/components/dashboard/list-search-input";
import { Link } from "@/i18n/navigation";
import { Card } from "@/components/ui/card";

export type ChatThread = {
  id: string;
  agentName: string;
  lastMessagePreview: string;
  timestampLabel: string;
  isActive: boolean;
};

export function ChatsList({ threads }: { threads: ChatThread[] }) {
  const t = useTranslations("chats");
  const [query, setQuery] = useState("");
  const filtered = threads.filter((thread) => {
    const haystack = `${thread.agentName} ${thread.lastMessagePreview}`.toLowerCase();
    return haystack.includes(query.trim().toLowerCase());
  });

  return (
    <Card className="flex max-h-[70vh] flex-col gap-2 overflow-y-auto p-2">
      <div className="px-2 pt-1">
        <ListSearchInput placeholder={t("searchPlaceholder")} value={query} onChange={setQuery} />
      </div>
      <ul className="divide-y divide-border">
        {filtered.map((thread) => (
          <li key={thread.id}>
            <Link
              href={`/chats?conversation=${thread.id}`}
              className={
                "block px-4 py-3 transition-colors hover:bg-muted " +
                (thread.isActive ? "bg-muted" : "")
              }
            >
              <div className="flex items-center justify-between gap-2">
                <p className="font-medium">{thread.agentName}</p>
                <span className="text-xs text-muted-foreground">{thread.timestampLabel}</span>
              </div>
              <p className="mt-1 line-clamp-1 text-sm text-muted-foreground">
                {thread.lastMessagePreview}
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </Card>
  );
}
