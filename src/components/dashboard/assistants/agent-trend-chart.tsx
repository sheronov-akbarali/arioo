"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

type Point = { date: string; label: string; value: number };
type Unit = "usd" | "uzs";

function formatValue(value: number, unit: Unit): string {
  return unit === "usd" ? `$${value.toFixed(3)}` : `${new Intl.NumberFormat("uz-UZ").format(value)} so'm`;
}

function ChartTooltip({
  active,
  payload,
  unit,
}: {
  active?: boolean;
  payload?: { payload: Point }[];
  unit: Unit;
}) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload;
  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 text-xs shadow-md">
      <p className="font-medium text-popover-foreground">{point.label}</p>
      <p className="mt-0.5 text-muted-foreground">{formatValue(point.value, unit)}</p>
    </div>
  );
}

export function AgentTrendChart({
  data,
  unit,
  color = "var(--color-brand)",
}: {
  data: Point[];
  unit: Unit;
  color?: string;
}) {
  return (
    <ResponsiveContainer width="100%" height={180}>
      <BarChart data={data} margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 3" />
        <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} />
        <YAxis
          tickLine={false}
          axisLine={false}
          width={44}
          tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
          tickFormatter={(value: number) => formatValue(value, unit)}
        />
        <Tooltip cursor={{ fill: "var(--muted)" }} content={<ChartTooltip unit={unit} />} />
        <Bar dataKey="value" fill={color} radius={[4, 4, 0, 0]} maxBarSize={20} />
      </BarChart>
    </ResponsiveContainer>
  );
}
