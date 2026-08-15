import { pgTable, text, timestamp, index, uniqueIndex } from "drizzle-orm/pg-core";
import { organizations } from "./org";

export const siteAnalyticsSites = pgTable(
  "site_analytics_site",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organizationId")
      .notNull()
      .unique()
      .references(() => organizations.id, { onDelete: "cascade" }),
    domain: text("domain").notNull(),
    trackingKey: text("trackingKey").notNull(),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("site_analytics_site_tracking_key_idx").on(table.trackingKey)]
);

export const siteAnalyticsEvents = pgTable(
  "site_analytics_event",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    siteId: text("siteId")
      .notNull()
      .references(() => siteAnalyticsSites.id, { onDelete: "cascade" }),
    path: text("path").notNull(),
    referrerHost: text("referrerHost"),
    // SHA-256 of (daily salt + IP + User-Agent), truncated — never the raw IP.
    // Used only as a distinct-visitor counter for a given day.
    visitorHash: text("visitorHash").notNull(),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    index("site_analytics_event_site_created_idx").on(table.siteId, table.createdAt),
    index("site_analytics_event_site_visitor_idx").on(table.siteId, table.visitorHash),
  ]
);
