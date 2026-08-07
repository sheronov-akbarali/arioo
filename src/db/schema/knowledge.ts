import { pgTable, text, timestamp, pgEnum, vector, index } from "drizzle-orm/pg-core";
import { aiAgents } from "./agents";

export const documentStatus = pgEnum("knowledge_document_status", [
  "processing",
  "ready",
  "error",
]);

export const knowledgeDocuments = pgTable("knowledge_document", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  agentId: text("agentId")
    .notNull()
    .references(() => aiAgents.id, { onDelete: "cascade" }),
  blobUrl: text("blobUrl").notNull(),
  filename: text("filename").notNull(),
  mimeType: text("mimeType").notNull(),
  status: documentStatus("status").notNull().default("processing"),
  createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
});

export const knowledgeChunks = pgTable(
  "knowledge_chunk",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    documentId: text("documentId")
      .notNull()
      .references(() => knowledgeDocuments.id, { onDelete: "cascade" }),
    content: text("content").notNull(),
    // text-embedding-3-small produces 1536-dim vectors (src/lib/ai/gateway.ts).
    embedding: vector("embedding", { dimensions: 1536 }).notNull(),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    index("knowledge_chunk_embedding_idx").using(
      "hnsw",
      table.embedding.op("vector_cosine_ops"),
    ),
  ],
);
