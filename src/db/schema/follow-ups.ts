import { pgTable, text, timestamp, integer, pgEnum } from "drizzle-orm/pg-core";
import { organizations } from "./org";
import { aiAgents } from "./agents";
import { conversations } from "./conversations";

export const followUpStatusEnum = pgEnum("follow_up_status", [
  "pending",
  "sent",
  "cancelled",
  "failed",
]);

export const followUpSchedules = pgTable("follow_up_schedule", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  organizationId: text("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  conversationId: text("conversation_id")
    .notNull()
    .references(() => conversations.id, { onDelete: "cascade" }),
  agentId: text("agent_id").references(() => aiAgents.id, { onDelete: "set null" }),
  channel: text("channel").notNull(), // "telegram" | "whatsapp"
  externalChatId: text("external_chat_id").notNull(),
  triggerHours: integer("trigger_hours").notNull(), // 2 or 24
  status: followUpStatusEnum("status").notNull().default("pending"),
  scheduledFor: timestamp("scheduled_for").notNull(),
  sentAt: timestamp("sent_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
