import { describe, it, expect } from "vitest";
import { countByStatus, STATUS_DASHBOARD_ORDER } from "./status";

describe("countByStatus", () => {
  it("counts rows grouped by status, defaulting missing statuses to 0", () => {
    const rows = [
      { status: "active" as const },
      { status: "active" as const },
      { status: "need_attention" as const },
    ];
    const counts = countByStatus(rows);
    expect(counts.active).toBe(2);
    expect(counts.need_attention).toBe(1);
    expect(counts.verifying).toBe(0);
    expect(counts.setup_needed).toBe(0);
    expect(counts.archived).toBe(0);
  });

  it("exposes a fixed dashboard display order with 5 statuses", () => {
    expect(STATUS_DASHBOARD_ORDER).toEqual([
      "active",
      "need_attention",
      "verifying",
      "setup_needed",
      "archived",
    ]);
  });
});
