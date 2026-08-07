import { pgTable, text, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { organizations } from "./org";

export const agentRole = pgEnum("agent_role", ["sales", "support", "hr", "marketing"]);
export const agentStatus = pgEnum("agent_status", ["draft", "active"]);

export const aiAgents = pgTable("ai_agent", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  organizationId: text("organizationId")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  role: agentRole("role").notNull(),
  name: text("name").notNull(),
  systemPrompt: text("systemPrompt").notNull(),
  model: text("model").notNull(),
  status: agentStatus("status").notNull().default("draft"),
  createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
});
