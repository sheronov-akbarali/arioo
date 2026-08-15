import { pgTable, text, timestamp, boolean, integer } from "drizzle-orm/pg-core";
import { agentRole } from "./agents";

export const agentTemplates = pgTable("agent_template", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  description: text("description").notNull(),
  industry: text("industry").notNull(),
  role: agentRole("role").notNull(),
  systemPrompt: text("systemPrompt").notNull(),
  sampleKnowledge: text("sampleKnowledge"),
  icon: text("icon").default("Bot"),
  isFeatured: boolean("isFeatured").notNull().default(false),
  downloadsCount: integer("downloadsCount").notNull().default(0),
  createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
});
