import "server-only";
import { sql } from "drizzle-orm";
import { db } from "@/db/client";

export type TranscriptChannel = "telegram" | "whatsapp" | "widget";

export type TranscriptSearchResult = {
  messageId: string;
  conversationId: string;
  agentId: string;
  agentName: string;
  channel: string;
  role: string;
  createdAt: Date;
  snippet: string;
};

export type TranscriptSearchParams = {
  organizationId: string;
  query: string;
  agentId?: string;
  channel?: TranscriptChannel;
  dateFrom?: Date;
  dateTo?: Date;
  page: number;
  pageSize: number;
};

export type TranscriptSearchOutcome =
  | { ok: true; results: TranscriptSearchResult[]; totalCount: number }
  | { ok: false; error: "too_short" | "query_failed" };

type TranscriptRow = {
  message_id: string;
  conversation_id: string;
  agent_id: string;
  agent_name: string;
  channel: string;
  role: string;
  created_at: string;
  snippet: string;
  total_count: string;
};

export async function searchTranscripts(
  params: TranscriptSearchParams,
): Promise<TranscriptSearchOutcome> {
  const trimmed = params.query.trim();
  if (trimmed.length < 2) {
    return { ok: false, error: "too_short" };
  }

  const offset = (params.page - 1) * params.pageSize;
  const tsQuery = sql`(websearch_to_tsquery('simple', ${trimmed}) || websearch_to_tsquery('russian', ${trimmed}) || websearch_to_tsquery('english', ${trimmed}))`;

  try {
    const result = await db.execute<TranscriptRow>(sql`
      SELECT
        m."id" AS message_id,
        m."conversationId" AS conversation_id,
        a."id" AS agent_id,
        a."name" AS agent_name,
        c."channel" AS channel,
        m."role" AS role,
        m."createdAt" AS created_at,
        ts_headline('simple', m."content", ${tsQuery}, 'StartSel=<mark>,StopSel=</mark>,MaxWords=25,MinWords=15') AS snippet,
        count(*) OVER() AS total_count
      FROM "message" m
      INNER JOIN "conversation" c ON c."id" = m."conversationId"
      INNER JOIN "ai_agent" a ON a."id" = c."agentId"
      WHERE a."organizationId" = ${params.organizationId}
        AND c."channel" <> 'playground'
        AND m."search_vector" @@ ${tsQuery}
        ${params.agentId ? sql`AND a."id" = ${params.agentId}` : sql``}
        ${params.channel ? sql`AND c."channel" = ${params.channel}` : sql``}
        ${params.dateFrom ? sql`AND m."createdAt" >= ${params.dateFrom}` : sql``}
        ${params.dateTo ? sql`AND m."createdAt" <= ${params.dateTo}` : sql``}
      ORDER BY ts_rank(m."search_vector", ${tsQuery}) DESC, m."createdAt" DESC, m."id" ASC
      LIMIT ${params.pageSize}
      OFFSET ${offset}
    `);

    const rows = result.rows;
    return {
      ok: true,
      results: rows.map((row) => ({
        messageId: row.message_id,
        conversationId: row.conversation_id,
        agentId: row.agent_id,
        agentName: row.agent_name,
        channel: row.channel,
        role: row.role,
        createdAt: new Date(row.created_at),
        snippet: row.snippet,
      })),
      totalCount: rows.length > 0 ? Number(rows[0].total_count) : 0,
    };
  } catch (error) {
    console.error("searchTranscripts: query failed", error);
    return { ok: false, error: "query_failed" };
  }
}
