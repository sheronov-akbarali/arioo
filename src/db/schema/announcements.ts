import { pgTable, text, timestamp, uuid, pgEnum, boolean } from "drizzle-orm/pg-core";

export const announcementTypeEnum = pgEnum("announcement_type", ["info", "warning"]);

export const announcements = pgTable("announcements", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  content: text("content"),
  type: announcementTypeEnum("type").default("info").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
