"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { ListSearchInput } from "@/components/dashboard/list-search-input";
import { AssistantCard } from "./assistant-card";
import type { agentRole, agentStatus } from "@/db/schema/agents";

type Agent = {
  id: string;
  name: string;
  role: (typeof agentRole.enumValues)[number];
  status: (typeof agentStatus.enumValues)[number];
};

export function AssistantsGrid({ agents }: { agents: Agent[] }) {
  const t = useTranslations("assistants");
  const [query, setQuery] = useState("");
  const filtered = agents.filter((agent) =>
    agent.name.toLowerCase().includes(query.trim().toLowerCase()),
  );

  return (
    <div className="flex flex-col gap-4">
      <ListSearchInput placeholder={t("searchPlaceholder")} value={query} onChange={setQuery} />
      {query.trim() !== "" && filtered.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">{t("noResults")}</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {filtered.map((agent) => (
            <AssistantCard
              key={agent.id}
              agent={agent}
              roleLabel={t(`roles.${agent.role}`)}
              statusLabel={t(`statusLabels.${agent.status}`)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
