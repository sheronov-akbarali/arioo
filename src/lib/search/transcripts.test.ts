import { describe, it, expect, vi, beforeEach } from "vitest";

const dbExecute = vi.hoisted(() => vi.fn());

vi.mock("@/db/client", () => ({
  db: { execute: dbExecute },
}));

import { searchTranscripts } from "./transcripts";

describe("searchTranscripts", () => {
  beforeEach(() => {
    dbExecute.mockReset();
  });

  it("rejects queries shorter than 2 characters without hitting the database", async () => {
    const result = await searchTranscripts({
      organizationId: "org_1",
      query: "a",
      page: 1,
      pageSize: 20,
    });

    expect(result).toEqual({ ok: false, error: "too_short" });
    expect(dbExecute).not.toHaveBeenCalled();
  });

  it("maps rows and total_count from the query result", async () => {
    dbExecute.mockResolvedValueOnce({
      rows: [
        {
          message_id: "msg_1",
          conversation_id: "conv_1",
          agent_id: "agent_1",
          agent_name: "Sotuv boti",
          channel: "telegram",
          role: "user",
          created_at: "2026-08-18T10:00:00.000Z",
          snippet: "Salom, <mark>qaytarish</mark> siyosati qanday?",
          total_count: "3",
        },
      ],
    });

    const result = await searchTranscripts({
      organizationId: "org_1",
      query: "qaytarish",
      page: 1,
      pageSize: 20,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("expected ok result");
    expect(result.totalCount).toBe(3);
    expect(result.results).toEqual([
      {
        messageId: "msg_1",
        conversationId: "conv_1",
        agentId: "agent_1",
        agentName: "Sotuv boti",
        channel: "telegram",
        role: "user",
        createdAt: new Date("2026-08-18T10:00:00.000Z"),
        snippet: "Salom, <mark>qaytarish</mark> siyosati qanday?",
      },
    ]);
  });

  it("returns zero results and zero total_count when nothing matches", async () => {
    dbExecute.mockResolvedValueOnce({ rows: [] });

    const result = await searchTranscripts({
      organizationId: "org_1",
      query: "hech-narsa-yoq",
      page: 1,
      pageSize: 20,
    });

    expect(result).toEqual({ ok: true, results: [], totalCount: 0 });
  });

  it("returns a query_failed outcome instead of throwing when the DB errors", async () => {
    dbExecute.mockRejectedValueOnce(new Error("connection reset"));

    const result = await searchTranscripts({
      organizationId: "org_1",
      query: "qaytarish",
      page: 1,
      pageSize: 20,
    });

    expect(result).toEqual({ ok: false, error: "query_failed" });
  });
});
