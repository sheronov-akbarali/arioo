import { pgTable, text, timestamp, integer } from "drizzle-orm/pg-core";
import { organizations } from "./org";
import { aiAgents } from "./agents";

export const messageTemplates = pgTable("message_template", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  organizationId: text("organizationId")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  agentId: text("agentId").references(() => aiAgents.id, { onDelete: "set null" }),
  title: text("title").notNull(),
  body: text("body").notNull(),
  category: text("category").notNull().default("general"), // e.g. "pricing", "order_status", "hours", "greeting"
  usageCount: integer("usageCount").notNull().default(0),
  createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
});
