"use client";

import { useTransition } from "react";
import { formatDistanceToNow } from "date-fns";
import { uz } from "date-fns/locale";
import { Trash2, User, Bot, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  updateDealStatusAction,
  deleteDealAction,
} from "@/app/[locale]/(dashboard)/crm/actions";

export type KanbanDeal = {
  id: string;
  title: string;
  value: string | null;
  currency: string;
  status: "new" | "negotiating" | "won" | "lost";
  createdAt: Date;
  contactName: string | null;
  agentName: string | null;
};

const COLUMNS = [
  { id: "new" as const, title: "Yangi lid", color: "border-blue-500/20 bg-blue-50/30 dark:bg-blue-950/10" },
  { id: "negotiating" as const, title: "Muzokara", color: "border-amber-500/20 bg-amber-50/30 dark:bg-amber-950/10" },
  { id: "won" as const, title: "Muvaffaqiyatli", color: "border-emerald-500/20 bg-emerald-50/30 dark:bg-emerald-950/10" },
  { id: "lost" as const, title: "Bekor qilingan", color: "border-rose-500/20 bg-rose-50/30 dark:bg-rose-950/10" },
];

export function KanbanBoard({
  locale,
  initialDeals,
}: {
  locale: string;
  initialDeals: KanbanDeal[];
}) {
  const [isPending, startTransition] = useTransition();

  const handleStatusChange = (
    dealId: string,
    newStatus: "new" | "negotiating" | "won" | "lost"
  ) => {
    startTransition(async () => {
      await updateDealStatusAction(locale, dealId, newStatus);
    });
  };

  const handleDelete = (dealId: string) => {
    if (!confirm("Ushbu bitimni o'chirmoqchimisiz?")) return;
    startTransition(async () => {
      await deleteDealAction(locale, dealId);
    });
  };

  return (
    <div className="flex h-full flex-1 items-start gap-3 sm:gap-4 overflow-x-auto pb-4 snap-x snap-mandatory scroll-smooth -mx-3 px-3 sm:mx-0 sm:px-0">
      {COLUMNS.map((col) => {
        const columnDeals = initialDeals.filter((d) => d.status === col.id);
        const totalValue = columnDeals.reduce((sum, d) => sum + (Number(d.value) || 0), 0);

        return (
          <div
            key={col.id}
            className={`flex h-full w-[85vw] sm:w-[310px] shrink-0 snap-center flex-col gap-3 rounded-xl border p-3 sm:p-3.5 ${col.color}`}
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold">{col.title}</h3>
                {totalValue > 0 && (
                  <p className="text-xs font-medium text-muted-foreground">
                    {new Intl.NumberFormat("uz-UZ", {
                      style: "currency",
                      currency: "UZS",
                      maximumFractionDigits: 0,
                    }).format(totalValue)}
                  </p>
                )}
              </div>
              <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-background/80 px-2 text-xs font-bold border shadow-2xs">
                {columnDeals.length}
              </span>
            </div>

            <div className="flex flex-col gap-2.5 overflow-y-auto max-h-[calc(100vh-280px)]">
              {columnDeals.map((deal) => (
                <Card
                  key={deal.id}
                  className="group relative transition-all duration-150 hover:shadow-md border-border/80"
                >
                  <CardHeader className="p-3 pb-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-sm font-semibold leading-tight line-clamp-2">
                        {deal.title}
                      </CardTitle>
                      <button
                        onClick={() => handleDelete(deal.id)}
                        disabled={isPending}
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive p-1 rounded-md"
                        title="O'chirish"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  </CardHeader>
                  <CardContent className="p-3 pt-0 flex flex-col gap-2.5 text-xs">
                    {deal.value ? (
                      <p className="text-sm font-bold text-brand">
                        {new Intl.NumberFormat("uz-UZ", {
                          style: "currency",
                          currency: deal.currency || "UZS",
                          maximumFractionDigits: 0,
                        }).format(Number(deal.value))}
                      </p>
                    ) : null}

                    <div className="flex flex-col gap-1 text-muted-foreground">
                      <span className="flex items-center gap-1.5 truncate">
                        <User className="size-3 text-muted-foreground/70" />
                        {deal.contactName || "Noma'lum mijoz"}
                      </span>
                      {deal.agentName && (
                        <span className="flex items-center gap-1.5 truncate">
                          <Bot className="size-3 text-brand" />
                          {deal.agentName}
                        </span>
                      )}
                      <span className="flex items-center gap-1.5 text-[11px]">
                        <Clock className="size-3 text-muted-foreground/70" />
                        {formatDistanceToNow(new Date(deal.createdAt), {
                          addSuffix: true,
                          locale: uz,
                        })}
                      </span>
                    </div>

                    {/* Quick stage mover */}
                    <div className="mt-1 pt-2 border-t flex flex-wrap items-center justify-between gap-1 text-[11px]">
                      <span className="text-muted-foreground">O'tkazish:</span>
                      <div className="flex items-center gap-1">
                        {COLUMNS.filter((c) => c.id !== deal.status).map((targetCol) => (
                          <button
                            key={targetCol.id}
                            disabled={isPending}
                            onClick={() => handleStatusChange(deal.id, targetCol.id)}
                            className="px-1.5 py-0.5 rounded-sm bg-muted hover:bg-brand hover:text-brand-foreground transition-colors font-medium"
                          >
                            {targetCol.title.split(" ")[0]}
                          </button>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {columnDeals.length === 0 && (
                <div className="flex flex-col items-center justify-center py-8 text-center text-xs text-muted-foreground border border-dashed rounded-lg bg-background/40">
                  Hozircha bitim yo'q
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
