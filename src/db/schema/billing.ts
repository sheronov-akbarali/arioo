import { pgTable, text, timestamp, doublePrecision, pgEnum } from "drizzle-orm/pg-core";
import { organizations } from "./org";

export const creditTransactionType = pgEnum("credit_transaction_type", [
  "grant",
  "topup",
  "usage",
  "bonus",
]);

// One row per organization — lazily read with a zero-balance default
// (see src/lib/billing/queries.ts) rather than backfilled on every org,
// since no real top-up/checkout flow exists yet to populate it.
export const organizationCredits = pgTable("organization_credit", {
  organizationId: text("organizationId")
    .primaryKey()
    .references(() => organizations.id, { onDelete: "cascade" }),
  balance: doublePrecision("balance").notNull().default(0),
  bonusBalance: doublePrecision("bonusBalance").notNull().default(0),
  updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
});

export const creditTransactions = pgTable("credit_transaction", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  organizationId: text("organizationId")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  type: creditTransactionType("type").notNull(),
  // Positive = credited to the org, negative = debited (spend).
  amount: doublePrecision("amount").notNull(),
  description: text("description").notNull(),
  createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
});
