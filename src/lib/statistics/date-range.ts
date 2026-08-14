export const STATISTICS_RANGES = ["7d", "30d", "month"] as const;
export type StatisticsRange = (typeof STATISTICS_RANGES)[number];

export function parseStatisticsRange(raw: string | undefined): StatisticsRange {
  return STATISTICS_RANGES.find((r) => r === raw) ?? "7d";
}

function rangeDays(range: StatisticsRange, now: Date): number {
  if (range === "7d") return 7;
  if (range === "30d") return 30;
  return now.getDate(); // "month" — from the 1st through today
}

function startOfDayUtc(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

export type StatisticsWindow = {
  currentStart: Date;
  currentEnd: Date;
  previousStart: Date;
};

export function statisticsWindow(range: StatisticsRange, now: Date): StatisticsWindow {
  const today = startOfDayUtc(now);
  const periodDays = rangeDays(range, now);
  const currentStart = new Date(today.getTime() - (periodDays - 1) * 86_400_000);
  const currentEnd = new Date(today.getTime() + 86_400_000); // exclusive, end of today
  const previousStart = new Date(currentStart.getTime() - periodDays * 86_400_000);
  return { currentStart, currentEnd, previousStart };
}
