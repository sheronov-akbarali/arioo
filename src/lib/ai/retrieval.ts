import "server-only";
import { cosineDistance, desc, eq, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { knowledgeChunks, knowledgeDocuments } from "@/db/schema/knowledge";

export async function retrieveRelevantChunks(
  agentId: string,
  queryEmbedding: number[],
  limit = 5,
): Promise<string[]> {
  const similarity = sql<number>`1 - (${cosineDistance(knowledgeChunks.embedding, queryEmbedding)})`;
  const rows = await db
    .select({ content: knowledgeChunks.content, similarity })
    .from(knowledgeChunks)
    .innerJoin(knowledgeDocuments, eq(knowledgeChunks.documentId, knowledgeDocuments.id))
    .where(eq(knowledgeDocuments.agentId, agentId))
    .orderBy((t) => desc(t.similarity))
    .limit(limit);
  return rows.map((row) => row.content);
}
