import { pgTable, text, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { organizations } from "./org";

export const telegramConnectionStatus = pgEnum("telegram_connection_status", [
  "pending_code",
  "pending_password",
  "connected",
  "error",
]);

export const telegramChannelConnections = pgTable("telegram_channel_connection", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  organizationId: text("organizationId")
    .notNull()
    .unique()
    .references(() => organizations.id, { onDelete: "cascade" }),
  channelUsername: text("channelUsername").notNull(),
  channelTitle: text("channelTitle"),
  phoneMasked: text("phoneMasked"),
  phone: text("phone"),
  // Encrypted MTProto session string (AES-256-GCM, see session-crypto.ts).
  // Populated as soon as step 1 connects, then overwritten at each step.
  sessionSecretEncrypted: text("sessionSecretEncrypted"),
  // Needed to complete auth.SignIn; cleared once status becomes "connected" or "error".
  phoneCodeHash: text("phoneCodeHash"),
  status: telegramConnectionStatus("status").notNull().default("pending_code"),
  lastSyncedAt: timestamp("lastSyncedAt", { mode: "date" }),
  lastError: text("lastError"),
  createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
});
