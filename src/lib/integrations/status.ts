export type IntegrationStatus = "setup_needed" | "verifying" | "active" | "need_attention" | "archived";

export const STATUS_DASHBOARD_ORDER: IntegrationStatus[] = [
  "active",
  "need_attention",
  "verifying",
  "setup_needed",
  "archived",
];

export function countByStatus(rows: { status: IntegrationStatus }[]): Record<IntegrationStatus, number> {
  const counts: Record<IntegrationStatus, number> = {
    setup_needed: 0,
    verifying: 0,
    active: 0,
    need_attention: 0,
    archived: 0,
  };
  for (const row of rows) {
    counts[row.status] += 1;
  }
  return counts;
}
