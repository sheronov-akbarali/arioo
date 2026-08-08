import { pgTable, text, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { organizations } from "./org";

// Every routine sits in "draft" today — there is no trigger/execution engine
// wired up yet (roadmap phase 5), so nothing here ever actually fires. The
// status exists so the UI is honest about that instead of implying it runs.
export const routineStatus = pgEnum("routine_status", ["draft"]);
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
