import { pgTable, text, timestamp, pgEnum, jsonb } from "drizzle-orm/pg-core";
import { aiAgents } from "./agents";
import { conversations } from "./conversations";

export const approvalStatus = pgEnum("approval_status", [
  "pending",
  "approved",
  "rejected",
  "auto_resolved",
  "expired",
]);

export const approvals = pgTable("approval", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  agentId: text("agentId")
    .notNull()
    .references(() => aiAgents.id, { onDelete: "cascade" }),
  conversationId: text("conversationId").references(() => conversations.id, {
    onDelete: "cascade",
  }),
  type: text("type").notNull(),
  payload: jsonb("payload").notNull(),
  status: approvalStatus("status").notNull().default("pending"),
  createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
  resolvedAt: timestamp("resolvedAt", { mode: "date" }),
  resolvedByUserId: text("resolvedByUserId"),
});
