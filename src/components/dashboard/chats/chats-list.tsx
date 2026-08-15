"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { ListSearchInput } from "@/components/dashboard/list-search-input";
import { Link } from "@/i18n/navigation";
import { Card } from "@/components/ui/card";

export type ChatThread = {
  id: string;
  agentName: string;
  channel: string;
  sentiment?: "positive" | "neutral" | "negative";
  lastMessagePreview: string;
  timestampLabel: string;
  isActive: boolean;
};

export function ChatsList({ threads }: { threads: ChatThread[] }) {
  const t = useTranslations("chats");
  const [query, setQuery] = useState("");
  const filtered = threads.filter((thread) => {
    const haystack = `${thread.agentName} ${thread.lastMessagePreview} ${thread.channel}`.toLowerCase();
    return haystack.includes(query.trim().toLowerCase());
  });

  return (
    <Card className="flex max-h-[70vh] flex-col gap-2 overflow-y-auto p-2">
      <div className="px-2 pt-1">
        <ListSearchInput placeholder={t("searchPlaceholder")} value={query} onChange={setQuery} />
      </div>
      {query.trim() !== "" && filtered.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">{t("noResults")}</p>
      ) : (
        <ul className="divide-y divide-border">
          {filtered.map((thread) => (
            <li key={thread.id}>
              <Link
                href={`/chats?conversation=${thread.id}`}
                className={
                  "block px-4 py-3 transition-colors hover:bg-muted/70 rounded-lg " +
                  (thread.isActive ? "bg-muted font-medium" : "")
                }
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <p className="font-medium truncate text-sm">{thread.agentName}</p>
                    <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-muted-foreground/10 text-muted-foreground shrink-0">
                      {thread.channel}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0">{thread.timestampLabel}</span>
                </div>
                <div className="mt-1 flex items-center justify-between gap-2">
                  <p className="line-clamp-1 text-xs text-muted-foreground flex-1">
                    {thread.lastMessagePreview}
                  </p>
                  {thread.sentiment && (
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded-full shrink-0 font-medium ${
                        thread.sentiment === "positive"
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                          : thread.sentiment === "negative"
                            ? "bg-red-500/10 text-red-600 dark:text-red-400"
                            : "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                      }`}
                    >
                      {thread.sentiment === "positive" ? "😊 Ijobiy" : thread.sentiment === "negative" ? "😡 Salbiy" : "😐 Neytral"}
                    </span>
                  )}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
