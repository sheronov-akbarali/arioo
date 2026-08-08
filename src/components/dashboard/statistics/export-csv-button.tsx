"use client";

import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";

type Row = { date: string; costUsd: number; threads: number };

export function ExportCsvButton({ rows, label }: { rows: Row[]; label: string }) {
  function handleExport() {
    const header = "date,cost_usd,threads";
    const lines = rows.map((row) => `${row.date},${row.costUsd.toFixed(4)},${row.threads}`);
    const csv = [header, ...lines].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `statistics-${rows[0]?.date ?? "export"}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Button size="sm" variant="outline" onClick={handleExport}>
      <Download />
      {label}
    </Button>
  );
}
