"use client";

import { useTransition } from "react";
import { FileText, Trash2, CheckCircle2, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { deleteKnowledgeDocumentAction } from "@/app/[locale]/(dashboard)/assistants/[agentId]/knowledge/actions";

export function KnowledgeDocItem({
  locale,
  agentId,
  id,
  filename,
  status,
  statusLabel,
}: {
  locale: string;
  agentId: string;
  id: string;
  filename: string;
  status: string;
  statusLabel: string;
}) {
  const [isPending, startTransition] = useTransition();

  const handleDelete = () => {
    if (!confirm("Ushbu bilimlar hujjati va uning vektor indekslarini o'chirmoqchimisiz?")) return;
    startTransition(async () => {
      await deleteKnowledgeDocumentAction(locale, agentId, id);
    });
  };

  return (
    <li className="flex items-center justify-between rounded-lg border p-3 hover:bg-muted/30 transition-colors">
      <div className="flex items-center gap-3 min-w-0">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-brand/10 text-brand">
          <FileText className="size-4" />
        </span>
        <div className="truncate">
          <p className="text-sm font-medium truncate">{filename}</p>
          <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
            {status === "ready" ? (
              <CheckCircle2 className="size-3 text-emerald-600" />
            ) : (
              <Clock className="size-3 text-amber-500 animate-spin" />
            )}
            <Badge variant="outline" className="text-[10px] py-0 h-4">
              {statusLabel}
            </Badge>
          </div>
        </div>
      </div>

      <Button
        size="sm"
        variant="ghost"
        className="size-8 p-0 text-muted-foreground hover:text-destructive"
        disabled={isPending}
        onClick={handleDelete}
        title="O'chirish"
      >
        <Trash2 className="size-4" />
      </Button>
    </li>
  );
}
