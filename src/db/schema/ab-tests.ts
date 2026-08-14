import { pgTable, text, timestamp, integer, pgEnum } from "drizzle-orm/pg-core";
import { aiAgents } from "./agents";
import { organizations } from "./org";

export const abTestStatusEnum = pgEnum("ab_test_status", [
  "running",
  "concluded",
  "cancelled",
]);

export const abTests = pgTable("ab_test", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  organizationId: text("organizationId")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  agentId: text("agentId")
    .notNull()
    .references(() => aiAgents.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  variantAPrompt: text("variantAPrompt").notNull(),
  variantBPrompt: text("variantBPrompt").notNull(),
  trafficSplit: integer("trafficSplit").notNull().default(50), // Percentage for variant A
  variantAConversations: integer("variantAConversations").notNull().default(0),
  variantBConversations: integer("variantBConversations").notNull().default(0),
  variantAConversions: integer("variantAConversions").notNull().default(0),
  variantBConversions: integer("variantBConversions").notNull().default(0),
  status: abTestStatusEnum("status").notNull().default("running"),
  winnerVariant: text("winnerVariant"), // 'A' | 'B'
  createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
  endedAt: timestamp("endedAt", { mode: "date" }),
});
