import { pgTable, text, timestamp, boolean, pgEnum } from "drizzle-orm/pg-core";
import { organizations } from "./org";
import { aiAgents } from "./agents";

export const channelType = pgEnum("channel_type", ["telegram", "whatsapp", "widget"]);

export const channels = pgTable("channel", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  organizationId: text("organizationId")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  agentId: text("agentId")
    .notNull()
    .references(() => aiAgents.id, { onDelete: "cascade" }),
  type: channelType("type").notNull(),
  botToken: text("botToken"), // e.g. telegram bot token
  botUsername: text("botUsername"),
  isActive: boolean("isActive").notNull().default(true),
  createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
});
