import { pgEnum, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { organizations } from "./org";

export const youtubeConnectionStatus = pgEnum("youtube_connection_status", [
  "connected",
  "error",
]);

export const youtubeChannelConnections = pgTable("youtube_channel_connection", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  organizationId: text("organizationId")
    .notNull()
    .unique()
    .references(() => organizations.id, { onDelete: "cascade" }),
  channelId: text("channelId").notNull(),
  channelTitle: text("channelTitle"),
  accessTokenEncrypted: text("accessTokenEncrypted").notNull(),
  refreshTokenEncrypted: text("refreshTokenEncrypted").notNull(),
  tokenExpiresAt: timestamp("tokenExpiresAt", { mode: "date" }).notNull(),
  status: youtubeConnectionStatus("status").notNull().default("connected"),
  lastSyncedAt: timestamp("lastSyncedAt", { mode: "date" }),
  lastError: text("lastError"),
  createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
});

export type YoutubeChannelConnection = typeof youtubeChannelConnections.$inferSelect;
export type NewYoutubeChannelConnection = typeof youtubeChannelConnections.$inferInsert;
