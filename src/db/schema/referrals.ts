import { pgTable, text, timestamp, doublePrecision } from "drizzle-orm/pg-core";
import { organizations } from "./org";

// One row per organization, lazily read with zero defaults (same pattern as
// organization_credit in billing.ts) — no signup flow writes to this yet.
export const organizationReferrals = pgTable("organization_referral", {
  organizationId: text("organizationId")
    .primaryKey()
    .references(() => organizations.id, { onDelete: "cascade" }),
  code: text("code").notNull().unique(),
  balance: doublePrecision("balance").notNull().default(0),
  ratePercent: doublePrecision("ratePercent").notNull().default(5),
  updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
});

export const referralOperations = pgTable("referral_operation", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  organizationId: text("organizationId")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  description: text("description").notNull(),
  amount: doublePrecision("amount").notNull(),
  createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
});
