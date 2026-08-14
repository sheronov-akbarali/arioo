import { pgTable, text, timestamp, integer, pgEnum, decimal } from "drizzle-orm/pg-core";
import { organizations } from "./org";
import { aiAgents } from "./agents";
import { channels } from "./channels";

export const crmDealStatusEnum = pgEnum("deal_status", [
  "new",
  "negotiating",
  "won",
  "lost",
]);

export const crmContacts = pgTable("crm_contact", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  organizationId: text("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  channelId: text("channel_id")
    .references(() => channels.id, { onDelete: "set null" }), // Qaysi kanaldan (Telegram, widget) keldi
  name: text("name").notNull(),
  phone: text("phone"),
  email: text("email"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

export const crmDeals = pgTable("crm_deal", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  organizationId: text("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  contactId: text("contact_id")
    .notNull()
    .references(() => crmContacts.id, { onDelete: "cascade" }),
  agentId: text("agent_id")
    .references(() => aiAgents.id, { onDelete: "set null" }), // Qaysi AI Agent ushbu deal ustida ishladi
  title: text("title").notNull(),
  value: decimal("value", { precision: 12, scale: 2 }), // summasi
  currency: text("currency").default("UZS"),
  status: crmDealStatusEnum("status").default("new").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});
