import { describe, it, expect, vi } from "vitest";

const dbSelectLimit = vi.fn().mockResolvedValue([]);
const dbSelectOrderBy = vi.fn(() => ({ limit: dbSelectLimit }));
const dbSelectWhere = vi.fn(() => ({ orderBy: dbSelectOrderBy }));
const dbSelectFrom = vi.fn(() => ({ where: dbSelectWhere }));

vi.mock("@/db/client", () => ({
  db: {
    select: vi.fn(() => ({ from: dbSelectFrom })),
  },
}));

import { analyzeUnansweredQuestions } from "./unanswered-analyzer";

describe("Unanswered Questions Analyzer", () => {
  it("returns recommendations array gracefully for an organization", async () => {
    const suggestions = await analyzeUnansweredQuestions({
      organizationId: "org_sample_test",
    });

    expect(Array.isArray(suggestions)).toBe(true);
  });
});
