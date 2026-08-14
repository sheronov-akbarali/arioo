import { pgTable, text, timestamp, pgEnum, integer, doublePrecision } from "drizzle-orm/pg-core";
import { aiAgents } from "./agents";

export const conversationChannel = pgEnum("conversation_channel", [
  "playground",
  "telegram",
  "whatsapp",
  "widget",
  "olx",
]);
export const messageRole = pgEnum("message_role", ["user", "assistant", "system"]);

export const conversations = pgTable("conversation", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  agentId: text("agentId")
    .notNull()
    .references(() => aiAgents.id, { onDelete: "cascade" }),
  channel: conversationChannel("channel").notNull().default("playground"),
  channelId: text("channelId"), // reference to channels.id
  externalChatId: text("externalChatId"), // e.g. telegram chat ID
  metadata: text("metadata"), // jsonified metadata
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
  externalMessageId: text("externalMessageId"),
  createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
});
