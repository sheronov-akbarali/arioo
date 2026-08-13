"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { BookOpen } from "lucide-react";
import { ListSearchInput } from "@/components/dashboard/list-search-input";
import { Link } from "@/i18n/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type DocumentRow = { id: string; filename: string; status: "processing" | "ready" | "error" };
type Group = { agentId: string; agentName: string; documents: DocumentRow[] };

const STATUS_VARIANT: Record<DocumentRow["status"], "secondary" | "default" | "destructive"> = {
  processing: "secondary",
  ready: "default",
  error: "destructive",
};

export function KnowledgeBasesGrid({ groups }: { groups: Group[] }) {
  const t = useTranslations("knowledgeBases");
  const tStatus = useTranslations("assistants.knowledge.status");
  const [query, setQuery] = useState("");
  const normalized = query.trim().toLowerCase();

  const filteredGroups = groups
    .map((group) => ({
      ...group,
      documents: group.documents.filter((doc) => doc.filename.toLowerCase().includes(normalized)),
    }))
    .filter((group) => group.documents.length > 0 || normalized === "");

  return (
    <div className="flex flex-col gap-4">
      <ListSearchInput placeholder={t("searchPlaceholder")} value={query} onChange={setQuery} />
      {normalized !== "" && filteredGroups.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">{t("noResults")}</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {filteredGroups.map((group) => (
            <Card key={group.agentId}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <BookOpen className="size-4 text-brand" />
                    <p className="font-medium">{group.agentName}</p>
                  </div>
                  <Link
                    href={`/assistants/${group.agentId}/knowledge`}
                    className="text-xs font-medium text-brand hover:underline"
                  >
                    {t("manage")}
                  </Link>
                </div>
                <ul className="mt-3 flex flex-col gap-2">
                  {group.documents.map((document) => (
                    <li key={document.id} className="flex items-center justify-between text-sm">
                      <span className="truncate">{document.filename}</span>
                      <Badge variant={STATUS_VARIANT[document.status]}>
                        {tStatus(document.status)}
                      </Badge>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
