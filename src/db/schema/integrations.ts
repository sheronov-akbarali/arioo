import { pgTable, text, timestamp, pgEnum, jsonb, uniqueIndex } from "drizzle-orm/pg-core";
import { organizations } from "./org";
import { channels } from "./channels";
import { telegramChannelConnections } from "./telegram-channel-connection";
import { aiAgents } from "./agents";

export const integrationConnectionMode = pgEnum("integration_connection_mode", [
  "oauth",
  "form",
  "wizard",
  "special",
]);

export const integrationStatus = pgEnum("integration_status", [
  "setup_needed",
  "verifying",
  "active",
  "need_attention",
  "archived",
]);

export const integrations = pgTable(
  "integration",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organizationId")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    providerId: text("providerId").notNull(),
    connectionMode: integrationConnectionMode("connectionMode").notNull(),
    status: integrationStatus("status").notNull().default("setup_needed"),
    credentialsEncrypted: text("credentialsEncrypted"),
    config: jsonb("config").$type<Record<string, unknown>>(),
    linkedChannelId: text("linkedChannelId").references(() => channels.id, {
      onDelete: "set null",
    }),
    linkedTelegramConnectionId: text("linkedTelegramConnectionId").references(
      () => telegramChannelConnections.id,
      { onDelete: "set null" }
    ),
    agentId: text("agentId").references(() => aiAgents.id, { onDelete: "set null" }),
    lastVerifiedAt: timestamp("lastVerifiedAt", { mode: "date" }),
    lastError: text("lastError"),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("integration_org_provider_idx").on(table.organizationId, table.providerId)]
);

export const integrationEventType = pgEnum("integration_event_type", [
  "created",
  "status_changed",
  "verified",
  "error",
  "reauth",
  "archived",
  "deleted",
]);

export const integrationEvents = pgTable("integration_event", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  integrationId: text("integrationId")
    .notNull()
    .references(() => integrations.id, { onDelete: "cascade" }),
  type: integrationEventType("type").notNull(),
  message: text("message"),
  createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
});
