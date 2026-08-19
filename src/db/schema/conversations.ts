import { pgTable, text, timestamp, pgEnum, integer, doublePrecision, index } from "drizzle-orm/pg-core";
import { aiAgents } from "./agents";

export const conversationChannel = pgEnum("conversation_channel", [
  "playground",
  "telegram",
  "whatsapp",
  "widget",
]);
export const conversationSentiment = pgEnum("conversation_sentiment", [
  "positive",
  "neutral",
  "negative",
]);
export const messageRole = pgEnum("message_role", ["user", "assistant", "system"]);

export const conversations = pgTable(
  "conversation",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    agentId: text("agentId")
      .notNull()
      .references(() => aiAgents.id, { onDelete: "cascade" }),
    channel: conversationChannel("channel").notNull().default("playground"),
    channelId: text("channelId"), // reference to channels.id
    externalChatId: text("externalChatId"), // e.g. telegram chat ID
    sentiment: conversationSentiment("sentiment").notNull().default("neutral"),
    handoffFromAgentId: text("handoffFromAgentId"),
    handoffReason: text("handoffReason"),
    metadata: text("metadata"), // jsonified metadata
    startedAt: timestamp("startedAt", { mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    index("conversation_agent_id_idx").on(table.agentId),
    index("conversation_started_at_idx").on(table.startedAt),
  ],
);

// `search_vector` (a generated tsvector column) and its GIN index
// (`message_search_vector_idx`) exist only in
// scripts/sql/message-search-vector.sql, not here — this drizzle-orm
// version (^0.45.2) has no generated-column API, so they can't be declared
// in schema.ts. Don't run `drizzle-kit push`/`generate` against this table
// without accounting for that, or it will try to drop them.
export const messages = pgTable(
  "message",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    conversationId: text("conversationId")
      .notNull()
      .references(() => conversations.id, { onDelete: "cascade" }),
    role: messageRole("role").notNull(),
    content: text("content").notNull(),
    tokenCount: integer("tokenCount"),
    estimatedCostUsd: doublePrecision("estimatedCostUsd"),
    externalMessageId: text("externalMessageId"),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
  },
  (table) => [index("message_conversation_id_idx").on(table.conversationId)],
);
