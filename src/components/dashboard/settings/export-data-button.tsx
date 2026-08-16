"use client";

import { useState, useTransition } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { exportOrganizationDataAction } from "@/app/[locale]/(dashboard)/settings/security/actions";

export function ExportDataButton({ locale }: { locale: string }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleExport = () => {
    setError(null);
    startTransition(async () => {
      const res = await exportOrganizationDataAction(locale);
      if (!res.success || !res.data) {
        setError(res.error || "Eksport muvaffaqiyatsiz tugadi");
        return;
      }
      const blob = new Blob([res.data], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `arioo-export-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    });
  };

  return (
    <div className="flex flex-col gap-1.5 items-end">
      <Button variant="outline" onClick={handleExport} disabled={isPending} className="gap-2">
        <Download className="size-4" />
        {isPending ? "Tayyorlanmoqda..." : "Ma'lumotlarni eksport qilish"}
      </Button>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
