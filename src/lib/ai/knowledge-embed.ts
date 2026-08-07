import "server-only";
import { embedMany } from "ai";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { knowledgeDocuments, knowledgeChunks } from "@/db/schema/knowledge";
import { EMBEDDING_MODEL } from "./gateway";

const CHUNK_SIZE = 800;
const CHUNK_OVERLAP = 100;

export function splitIntoChunks(text: string): string[] {
  const cleaned = text.replace(/\r\n/g, "\n").trim();
  if (!cleaned) return [];

  const chunks: string[] = [];
  let start = 0;
  while (start < cleaned.length) {
    const end = Math.min(start + CHUNK_SIZE, cleaned.length);
    const chunk = cleaned.slice(start, end).trim();
    if (chunk.length > 0) chunks.push(chunk);
    if (end === cleaned.length) break;
    start = end - CHUNK_OVERLAP;
  }
  return chunks;
}

export async function embedDocument(documentId: string, text: string): Promise<void> {
  const chunks = splitIntoChunks(text);
  if (chunks.length === 0) {
    await db
      .update(knowledgeDocuments)
      .set({ status: "error" })
      .where(eq(knowledgeDocuments.id, documentId));
    return;
  }

  try {
    const { embeddings } = await embedMany({ model: EMBEDDING_MODEL, values: chunks });
    await db.insert(knowledgeChunks).values(
      chunks.map((content, index) => ({
        documentId,
        content,
        embedding: embeddings[index]!,
      })),
    );
    await db
      .update(knowledgeDocuments)
      .set({ status: "ready" })
      .where(eq(knowledgeDocuments.id, documentId));
  } catch (error) {
    console.error(`Embedding failed for knowledge document ${documentId}`, error);
    await db
      .update(knowledgeDocuments)
      .set({ status: "error" })
      .where(eq(knowledgeDocuments.id, documentId));
  }
}
