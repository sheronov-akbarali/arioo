import { pgTable, text, timestamp, boolean, pgEnum } from "drizzle-orm/pg-core";
import { organizations } from "./org";

export const notificationTypeEnum = pgEnum("notification_type", [
  "chat",
  "lead",
  "approval",
  "ticket",
  "system",
]);

export const notifications = pgTable("notification", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  organizationId: text("organizationId")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  type: notificationTypeEnum("type").notNull().default("system"),
  title: text("title").notNull(),
  body: text("body").notNull(),
  link: text("link"),
  isRead: boolean("isRead").notNull().default(false),
  createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
});
