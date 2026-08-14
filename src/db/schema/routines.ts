import { pgTable, text, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { organizations } from "./org";

export const routineStatus = pgEnum("routine_status", ["draft", "active", "paused"]);
export const routineTriggerType = pgEnum("routine_trigger_type", [
  "crm_event",
  "integration_event",
  "schedule",
]);

export const routines = pgTable("routine", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  organizationId: text("organizationId")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  triggerType: routineTriggerType("triggerType").notNull(),
  resource: text("resource").notNull(),
  status: routineStatus("status").notNull().default("draft"),
  createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
});
