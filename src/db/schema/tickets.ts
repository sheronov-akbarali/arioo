import { pgTable, text, timestamp, uuid, pgEnum } from "drizzle-orm/pg-core";
import { organizations } from "./org";

export const ticketStatusEnum = pgEnum("ticket_status", ["open", "in_progress", "closed"]);

export const tickets = pgTable("tickets", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: text("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  subject: text("subject").notNull(),
  description: text("description"),
  status: ticketStatusEnum("status").default("open").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
