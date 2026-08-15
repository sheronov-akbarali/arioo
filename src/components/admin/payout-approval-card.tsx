"use client";

import { useTransition } from "react";
import { Check, X, CreditCard, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { adminApprovePayoutAction, updateTicketStatusAction } from "@/app/[locale]/(admin)/admin/actions";

export function PayoutApprovalCard({
  ticket,
  orgName,
}: {
  ticket: {
    id: string;
    organizationId: string;
    subject: string;
    description: string;
    status: "open" | "in_progress" | "closed";
    createdAt: Date;
  };
  orgName: string;
}) {
  const [isPending, startTransition] = useTransition();

  const handleApprove = () => {
    if (!confirm("Ushbu so'rov bo'yicha pul mijoz kartasiga o'tkazildimi?")) return;

    startTransition(async () => {
      await adminApprovePayoutAction(ticket.id, ticket.organizationId, 50000);
    });
  };

  const handleReject = () => {
    if (!confirm("Ushbu so'rovni bekor qilmoqchimisiz?")) return;

    startTransition(async () => {
      await updateTicketStatusAction(ticket.id, "closed");
    });
  };

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border bg-card hover:bg-muted/20 transition-colors">
      <div className="flex items-start gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600">
          <CreditCard className="size-5" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h4 className="font-semibold text-sm">{ticket.subject}</h4>
            <Badge variant={ticket.status === "open" ? "default" : "secondary"} className="text-[10px]">
              {ticket.status === "open" ? "Kutilmoqda" : "Bajarildi"}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5 whitespace-pre-line font-mono">
            {ticket.description}
          </p>
          <div className="flex items-center gap-3 text-[11px] text-muted-foreground mt-2">
            <span>Tashkilot: <strong>{orgName}</strong></span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <Clock className="size-3" />
              {new Date(ticket.createdAt).toLocaleDateString("uz-UZ")}
            </span>
          </div>
        </div>
      </div>

      {ticket.status === "open" && (
        <div className="flex items-center gap-2 shrink-0">
          <Button
            size="sm"
            variant="default"
            className="h-8 gap-1 text-xs bg-emerald-600 hover:bg-emerald-700"
            disabled={isPending}
            onClick={handleApprove}
          >
            <Check className="size-3.5" />
            Tasdiqlash & O'tkazildi
          </Button>

          <Button
            size="sm"
            variant="outline"
            className="h-8 gap-1 text-xs text-destructive hover:bg-destructive/10"
            disabled={isPending}
            onClick={handleReject}
          >
            <X className="size-3.5" />
            Rad etish
          </Button>
        </div>
      )}
    </div>
  );
}
