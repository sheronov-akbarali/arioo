import "server-only";

export type ApprovalStatus = "pending" | "approved" | "rejected" | "auto_resolved" | "expired";

export function canResolve(status: ApprovalStatus): boolean {
  return status === "pending";
}
