import { pgTable, text, timestamp, pgEnum } from "drizzle-orm/pg-core";

export const membershipRole = pgEnum("membership_role", [
  "owner",
  "admin",
  "member",
]);

export const inviteStatus = pgEnum("invite_status", [
  "pending",
  "accepted",
  "expired",
]);

export const organizations = pgTable("organization", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  industry: text("industry").notNull(),
  // Matches a PRICING_TIERS id (src/lib/pricing-data.ts) — no FK since pricing
  // tiers are static app config, not a DB table.
  plan: text("plan").notNull().default("freemium"),
  createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
});

export const memberships = pgTable("membership", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  // References a Clerk user id — Clerk owns the user store, so there is no
  // local `users` table to foreign-key against.
  userId: text("userId").notNull(),
  organizationId: text("organizationId")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  role: membershipRole("role").notNull(),
  createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
});

export const invites = pgTable("invite", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  organizationId: text("organizationId")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  email: text("email").notNull(),
  token: text("token").notNull().unique(),
  role: membershipRole("role").notNull(),
  status: inviteStatus("status").notNull().default("pending"),
  invitedByUserId: text("invitedByUserId").notNull(),
  createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
  expiresAt: timestamp("expiresAt", { mode: "date" }).notNull(),
});
