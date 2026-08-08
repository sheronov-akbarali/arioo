import { pgTable, text, timestamp, integer, pgEnum } from "drizzle-orm/pg-core";
import { organizations } from "./org";

export const productType = pgEnum("product_type", [
  "item",
  "digital",
  "service",
  "affiliate_offer",
  "referral_offer",
  "lead_magnet",
]);
export const productStatus = pgEnum("product_status", ["draft", "active", "archived"]);

// Channels (Avito-style marketplace listing) and payment paths (Payme/Click)
// aren't wired up yet — a product here is a catalog entry only, not yet
// sellable through any real channel.
export const products = pgTable("product", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  organizationId: text("organizationId")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  type: productType("type").notNull(),
  status: productStatus("status").notNull().default("draft"),
  priceUZS: integer("priceUZS"),
  createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
});
