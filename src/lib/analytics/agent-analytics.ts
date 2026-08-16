import "server-only";
import { and, eq, gte, sql } from "drizzle-orm";
import { generateObject } from "ai";
import { z } from "zod";
import { db } from "@/db/client";
import { messages, conversations } from "@/db/schema/conversations";
import { crmDeals } from "@/db/schema/crm";
import { resolveModel } from "@/lib/ai/gateway";

/** Real average time-to-first-reply, computed from consecutive user→assistant
 * message pairs (not a hardcoded "~1.1s"). Returns null if there's no data. */
export async function getAvgResponseSeconds(agentId: string): Promise<number | null> {
  const result = await db.execute<{ avg_seconds: string | null }>(sql`
    WITH ordered AS (
      SELECT
        m."role" AS role,
        m."createdAt" AS created_at,
        LAG(m."role") OVER (PARTITION BY m."conversationId" ORDER BY m."createdAt") AS prev_role,
        LAG(m."createdAt") OVER (PARTITION BY m."conversationId" ORDER BY m."createdAt") AS prev_created_at
      FROM "message" m
      INNER JOIN "conversation" c ON c."id" = m."conversationId"
      WHERE c."agentId" = ${agentId}
    )
    SELECT AVG(EXTRACT(EPOCH FROM (created_at - prev_created_at))) AS avg_seconds
    FROM ordered
    WHERE role = 'assistant' AND prev_role = 'user'
  `);
  const row = result.rows[0] as { avg_seconds: string | null } | undefined;
  if (!row?.avg_seconds) return null;
  return Number(row.avg_seconds);
}

/** Real conversion rate: won CRM deals attributed to this agent, divided by
 * the agent's total conversation count. */
export async function getConversionRate(
  agentId: string,
  totalConversations: number
): Promise<{ rate: number | null; wonDeals: number }> {
  const [row] = await db
    .select({ count: sql<number>`count(*)` })
    .from(crmDeals)
    .where(and(eq(crmDeals.agentId, agentId), eq(crmDeals.status, "won")));

  const wonDeals = Number(row?.count || 0);
  if (totalConversations === 0) return { rate: null, wonDeals };
  return { rate: Math.round((wonDeals / totalConversations) * 100), wonDeals };
}

export type TrendPoint = { date: string; label: string; value: number };

const DAY_LABEL = new Intl.DateTimeFormat("uz-UZ", { day: "2-digit", month: "2-digit" });

function fillTrend(rows: { day: Date; value: number }[], days: number): TrendPoint[] {
  const byDay = new Map(rows.map((r) => [new Date(r.day).toISOString().slice(0, 10), r.value]));
  const points: TrendPoint[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    points.push({ date: key, label: DAY_LABEL.format(d), value: byDay.get(key) ?? 0 });
  }
  return points;
}

export async function getDailyCostTrend(agentId: string, days = 14): Promise<TrendPoint[]> {
  const since = new Date();
  since.setDate(since.getDate() - days);

  const rows = await db
    .select({
      day: sql<Date>`date_trunc('day', ${messages.createdAt})`,
      value: sql<number>`coalesce(sum(${messages.estimatedCostUsd}), 0)`,
    })
    .from(messages)
    .innerJoin(conversations, eq(messages.conversationId, conversations.id))
    .where(and(eq(conversations.agentId, agentId), gte(messages.createdAt, since)))
    .groupBy(sql`date_trunc('day', ${messages.createdAt})`);

  return fillTrend(rows.map((r) => ({ day: r.day, value: Number(r.value) })), days);
}

export async function getDailyRevenueTrend(agentId: string, days = 14): Promise<TrendPoint[]> {
  const since = new Date();
  since.setDate(since.getDate() - days);

  const rows = await db
    .select({
      day: sql<Date>`date_trunc('day', ${crmDeals.updatedAt})`,
      value: sql<number>`coalesce(sum(${crmDeals.value}::numeric), 0)`,
    })
    .from(crmDeals)
    .where(and(eq(crmDeals.agentId, agentId), eq(crmDeals.status, "won"), gte(crmDeals.updatedAt, since)))
    .groupBy(sql`date_trunc('day', ${crmDeals.updatedAt})`);

  return fillTrend(rows.map((r) => ({ day: r.day, value: Number(r.value) })), days);
}

export type TopicCluster = { topic: string; count: number; percent: number };

const clusterSchema = z.object({
  topics: z
    .array(z.object({ label: z.string(), messageIndexes: z.array(z.number()) }))
    .max(6)
    .describe("Har bir mavzu uchun unga tegishli xabar indekslari"),
});

/** Real AI-based clustering of the agent's recent customer questions — not a
 * static hardcoded topic list. Samples the last N user messages for cost
 * control and clusters them via a single structured-output call. */
export async function getTopCustomerTopics(agentId: string, model: string): Promise<TopicCluster[]> {
  const rows = await db
    .select({ content: messages.content })
    .from(messages)
    .innerJoin(conversations, eq(messages.conversationId, conversations.id))
    .where(and(eq(conversations.agentId, agentId), eq(messages.role, "user")))
    .orderBy(sql`${messages.createdAt} desc`)
    .limit(150);

  if (rows.length < 5) return [];

  const sample = rows.map((r, i) => `${i}: ${r.content.slice(0, 200)}`).join("\n");

  try {
    const { object } = await generateObject({
      model: resolveModel(model),
      schema: clusterSchema,
      prompt: `Quyida mijozlarning AI xodimga yozgan xabarlari ro'yxati (raqam: matn). Ularni mavzu bo'yicha
guruhlarga (klasterlarga) ajrating (masalan "narxlar", "yetkazib berish", "kafolat" kabi qisqa o'zbekcha nomlar
bilan, ko'pi bilan 6 ta guruh), va har bir guruhga tegishli xabar raqamlarini ko'rsating. Har bir xabar faqat bitta
guruhga tegishli bo'lsin.\n\n${sample}`,
    });

    const total = rows.length;
    return object.topics
      .map((t) => ({ topic: t.label, count: t.messageIndexes.length, percent: Math.round((t.messageIndexes.length / total) * 100) }))
      .filter((t) => t.count > 0)
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);
  } catch (error) {
    console.warn("Topic clustering failed:", error);
    return [];
  }
}
