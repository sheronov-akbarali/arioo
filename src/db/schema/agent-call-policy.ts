import { pgTable, text, timestamp, pgEnum, boolean, integer, jsonb } from "drizzle-orm/pg-core";
import { aiAgents } from "./agents";

export const agentCallDirection = pgEnum("agent_call_direction", [
  "inbound",
  "outbound",
  "both",
  "off",
]);
export const agentCallWindowTz = pgEnum("agent_call_window_tz", ["same_as_chat", "custom"]);
export const agentOffWindowBehavior = pgEnum("agent_off_window_behavior", [
  "reject",
  "voicemail_task",
]);
export const agentRecordingMode = pgEnum("agent_recording_mode", [
  "off",
  "record",
  "record_announce",
]);
export const agentCallMode = pgEnum("agent_call_mode", ["supervised", "autonomous"]);
export const agentCallConfirmation = pgEnum("agent_call_confirmation", [
  "always",
  "per_tool",
  "read_only",
]);

export const agentCallPolicy = pgTable("agent_call_policy", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  agentId: text("agentId")
    .notNull()
    .unique()
    .references(() => aiAgents.id, { onDelete: "cascade" }),
  enabled: boolean("enabled").notNull().default(false),
  direction: agentCallDirection("direction").notNull().default("off"),
  windowTimezoneMode: agentCallWindowTz("windowTimezoneMode").notNull().default("same_as_chat"),
  windowStart: text("windowStart"),
  windowEnd: text("windowEnd"),
  offWindowBehavior: agentOffWindowBehavior("offWindowBehavior").notNull().default("reject"),
  requireExistingThread: boolean("requireExistingThread").notNull().default(true),
  respectDnc: boolean("respectDnc").notNull().default(true),
  maxAttempts: integer("maxAttempts"),
  attemptsPeriodDays: integer("attemptsPeriodDays"),
  recordingMode: agentRecordingMode("recordingMode").notNull().default("record_announce"),
  disclosureScript: text("disclosureScript"),
  maxDurationMinutes: integer("maxDurationMinutes").notNull().default(20),
  maxParallelLines: integer("maxParallelLines").notNull().default(2),
  sipIntegrationRef: text("sipIntegrationRef"),
  outboundDid: text("outboundDid"),
  lineInstruction: text("lineInstruction"),
  callModel: text("callModel").notNull().default("gpt-realtime"),
  callVoice: text("callVoice").notNull().default("alloy"),
  defaultMode: agentCallMode("defaultMode").notNull().default("supervised"),
  maxActionsPerReply: integer("maxActionsPerReply").notNull().default(5),
  confirmationMode: agentCallConfirmation("confirmationMode").notNull().default("always"),
  saveSummaryToThread: boolean("saveSummaryToThread").notNull().default(true),
  syncCrm: boolean("syncCrm").notNull().default(false),
  escalationTarget: text("escalationTarget"),
  escalationTriggerWords: jsonb("escalationTriggerWords").notNull().default([]),
  createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
});
