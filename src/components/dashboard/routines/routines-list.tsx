"use client";

import { useTransition } from "react";
import { Play, Pause, Trash2, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  executeRoutineNowAction,
  toggleRoutineAction,
  deleteRoutineAction,
} from "@/app/[locale]/(dashboard)/routines/actions";

export type RoutineRow = {
  id: string;
  name: string;
  triggerType: string;
  resource: string;
  status: "active" | "paused";
  createdAt: Date;
};

export function RoutinesList({
  locale,
  routines,
}: {
  locale: string;
  routines: RoutineRow[];
}) {
  const [isPending, startTransition] = useTransition();

  const handleExecute = (id: string) => {
    startTransition(async () => {
      await executeRoutineNowAction(locale, id);
    });
  };

  const handleToggle = (id: string, currentStatus: "active" | "paused") => {
    const nextStatus = currentStatus === "active" ? "paused" : "active";
    startTransition(async () => {
      await toggleRoutineAction(locale, id, nextStatus);
    });
  };

  const handleDelete = (id: string) => {
    if (!confirm("Ushbu rutinani o'chirmoqchimisiz?")) return;
    startTransition(async () => {
      await deleteRoutineAction(locale, id);
    });
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs text-muted-foreground">
            <th className="px-4 py-3 font-medium">Nomi</th>
            <th className="px-4 py-3 font-medium">Trigger</th>
            <th className="px-4 py-3 font-medium">Resurs</th>
            <th className="px-4 py-3 font-medium">Status</th>
            <th className="px-4 py-3 text-right font-medium">Amallar</th>
          </tr>
        </thead>
        <tbody>
          {routines.map((routine) => (
            <tr key={routine.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
              <td className="px-4 py-3 font-medium">{routine.name}</td>
              <td className="px-4 py-3 text-muted-foreground">{routine.triggerType}</td>
              <td className="px-4 py-3 text-muted-foreground truncate max-w-[200px]">{routine.resource}</td>
              <td className="px-4 py-3">
                <Badge variant={routine.status === "active" ? "default" : "secondary"}>
                  {routine.status === "active" ? "Faol" : "To'xtatilgan"}
                </Badge>
              </td>
              <td className="px-4 py-3 text-right">
                <div className="flex items-center justify-end gap-1.5">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 text-xs gap-1"
                    disabled={isPending}
                    onClick={() => handleExecute(routine.id)}
                    title="Hozir ishga tushirish"
                  >
                    <Play className="size-3 text-emerald-600" />
                    Ishga tushirish
                  </Button>

                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 w-8 p-0"
                    disabled={isPending}
                    onClick={() => handleToggle(routine.id, routine.status)}
                    title={routine.status === "active" ? "To'xtatish" : "Faollashtirish"}
                  >
                    {routine.status === "active" ? (
                      <Pause className="size-3.5 text-amber-600" />
                    ) : (
                      <CheckCircle2 className="size-3.5 text-emerald-600" />
                    )}
                  </Button>

                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                    disabled={isPending}
                    onClick={() => handleDelete(routine.id)}
                    title="O'chirish"
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
