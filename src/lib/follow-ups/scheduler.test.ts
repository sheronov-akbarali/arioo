import { describe, it, expect, vi } from "vitest";

const dbSelectLimit = vi.fn().mockResolvedValue([]);
const dbSelectWhere = vi.fn(() => ({ limit: dbSelectLimit }));
const dbSelectFrom = vi.fn(() => ({ where: dbSelectWhere }));

vi.mock("@/db/client", () => ({
  db: {
    select: vi.fn(() => ({ from: dbSelectFrom })),
    insert: vi.fn(() => ({ values: vi.fn().mockResolvedValue(undefined) })),
    update: vi.fn(() => ({ set: vi.fn(() => ({ where: vi.fn().mockResolvedValue(undefined) })) })),
  },
}));

import { processDueFollowUps } from "./scheduler";

describe("Follow-up Scheduler", () => {
  it("processes due follow ups gracefully when queue is empty", async () => {
    const result = await processDueFollowUps();
    expect(result).toBeDefined();
    expect(result.processedCount).toBe(0);
    expect(result.errorsCount).toBe(0);
  });
});
