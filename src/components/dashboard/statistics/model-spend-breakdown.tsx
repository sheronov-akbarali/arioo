type ModelSpendRow = { model: string; costUsd: number; percent: number };

function formatUsd(value: number): string {
  return `$${value.toFixed(2)}`;
}

export function ModelSpendBreakdown({ rows }: { rows: ModelSpendRow[] }) {
  return (
    <div className="flex flex-col gap-3">
      {rows.map((row) => (
        <div key={row.model} className="flex flex-col gap-1">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">{row.model}</span>
            <span className="text-muted-foreground">
              {formatUsd(row.costUsd)} ({row.percent.toFixed(1)}%)
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-brand" style={{ width: `${row.percent}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}
