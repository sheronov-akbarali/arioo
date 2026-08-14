import { pgTable, text, timestamp, pgEnum, boolean, integer, real } from "drizzle-orm/pg-core";
import { organizations } from "./org";

export const agentRole = pgEnum("agent_role", ["sales", "support", "hr", "marketing"]);
export const agentStatus = pgEnum("agent_status", ["draft", "active"]);
export const agentMemoryIsolation = pgEnum("agent_memory_isolation", ["user", "thread"]);
export const agentMemoryTemplateMode = pgEnum("agent_memory_template_mode", [
  "freeform",
  "schema",
]);
export const agentInterruptionMode = pgEnum("agent_interruption_mode", [
  "queue",
  "abort_restart",
  "drop_restart",
]);

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
  // AI core settings (Worken parity Phase D)
  topP: real("topP"),
  temperature: real("temperature"),
  maxTokens: integer("maxTokens"),
  readOnlyMode: boolean("readOnlyMode").notNull().default(false),
  recentMessagesCount: integer("recentMessagesCount").notNull().default(20),
  autoTitleGeneration: boolean("autoTitleGeneration").notNull().default(true),
  semanticSearchEnabled: boolean("semanticSearchEnabled").notNull().default(false),
  memoryIsolation: agentMemoryIsolation("memoryIsolation").notNull().default("user"),
  memoryTemplateMode: agentMemoryTemplateMode("memoryTemplateMode")
    .notNull()
    .default("freeform"),
  memoryTemplate: text("memoryTemplate"),
  removeEmojis: boolean("removeEmojis").notNull().default(false),
  removeMarkdown: boolean("removeMarkdown").notNull().default(false),
  interruptionMode: agentInterruptionMode("interruptionMode").notNull().default("queue"),
  maxStepsWithoutTools: integer("maxStepsWithoutTools").notNull().default(1),
  maxStepsWithTools: integer("maxStepsWithTools").notNull().default(8),
});
