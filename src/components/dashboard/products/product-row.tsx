"use client";

import { useTransition } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { deleteProductAction } from "@/app/[locale]/(dashboard)/products/actions";

export function ProductRow({
  locale,
  id,
  name,
  typeLabel,
  statusLabel,
  formattedPrice,
}: {
  locale: string;
  id: string;
  name: string;
  typeLabel: string;
  statusLabel: string;
  formattedPrice: string;
}) {
  const [isPending, startTransition] = useTransition();

  const handleDelete = () => {
    if (!confirm("Ushbu mahsulotni o'chirmoqchimisiz?")) return;
    startTransition(async () => {
      await deleteProductAction(locale, id);
    });
  };

  return (
    <tr className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
      <td className="px-4 py-3 font-medium">{name}</td>
      <td className="px-4 py-3 text-muted-foreground">{typeLabel}</td>
      <td className="px-4 py-3">
        <Badge variant="outline">{statusLabel}</Badge>
      </td>
      <td className="px-4 py-3 text-right font-medium">{formattedPrice}</td>
      <td className="px-4 py-3 text-right">
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
      </td>
    </tr>
  );
}
