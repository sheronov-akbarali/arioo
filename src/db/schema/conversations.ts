import { pgTable, text, timestamp, pgEnum, integer, doublePrecision } from "drizzle-orm/pg-core";
import { aiAgents } from "./agents";

export const conversationChannel = pgEnum("conversation_channel", ["playground"]);
export const messageRole = pgEnum("message_role", ["user", "assistant", "system"]);

export const conversations = pgTable("conversation", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  agentId: text("agentId")
    .notNull()
    .references(() => aiAgents.id, { onDelete: "cascade" }),
  channel: conversationChannel("channel").notNull().default("playground"),
  startedAt: timestamp("startedAt", { mode: "date" }).notNull().defaultNow(),
});

export const messages = pgTable("message", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  conversationId: text("conversationId")
    .notNull()
    .references(() => conversations.id, { onDelete: "cascade" }),
  role: messageRole("role").notNull(),
  content: text("content").notNull(),
  tokenCount: integer("tokenCount"),
  estimatedCostUsd: doublePrecision("estimatedCostUsd"),
  createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
});
