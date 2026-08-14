import { pgTable, text, timestamp, uuid, pgEnum, integer } from "drizzle-orm/pg-core";

export const promocodeStatusEnum = pgEnum("promocode_status", ["active", "expired"]);

export const promocodes = pgTable("promocodes", {
  id: uuid("id").primaryKey().defaultRandom(),
  code: text("code").notNull().unique(),
  discount: text("discount").notNull(),
  usageCount: integer("usage_count").default(0).notNull(),
  status: promocodeStatusEnum("status").default("active").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
