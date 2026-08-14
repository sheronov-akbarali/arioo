import { pgTable, text, timestamp, pgEnum, integer, real } from "drizzle-orm/pg-core";
import { aiAgents } from "./agents";

export const agentKnowledgeAggregation = pgEnum("agent_knowledge_aggregation", [
  "merge",
  "priority",
]);

export const agentKnowledgeSettings = pgTable("agent_knowledge_settings", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  agentId: text("agentId")
    .notNull()
    .unique()
    .references(() => aiAgents.id, { onDelete: "cascade" }),
  embeddingModel: text("embeddingModel").notNull().default("text-embedding-3-small"),
  relevanceThreshold: real("relevanceThreshold").notNull().default(0.85),
  maxResults: integer("maxResults").notNull().default(10),
  maxContextTokens: integer("maxContextTokens").notNull().default(4000),
  aggregationStrategy: agentKnowledgeAggregation("aggregationStrategy")
    .notNull()
    .default("merge"),
  createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
});
