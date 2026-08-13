import { pgTable, text, timestamp, pgEnum, boolean, integer, jsonb } from "drizzle-orm/pg-core";
import { aiAgents } from "./agents";

export const agentVoiceReaction = pgEnum("agent_voice_reaction", [
  "none",
  "reply_text",
  "reply_voice",
]);
export const agentTextReaction = pgEnum("agent_text_reaction", ["reply_text"]);
export const agentLimitType = pgEnum("agent_limit_type", ["messages", "tokens", "workens"]);
export const agentOperatorTrigger = pgEnum("agent_operator_trigger", ["keep_going", "pause"]);

export const agentChatSettings = pgTable("agent_chat_settings", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  agentId: text("agentId")
    .notNull()
    .unique()
    .references(() => aiAgents.id, { onDelete: "cascade" }),
  description: text("description"),
  greetingMessage: text("greetingMessage"),
  replyDelaySeconds: integer("replyDelaySeconds").notNull().default(0),
  timezone: text("timezone"),
  voiceReaction: agentVoiceReaction("voiceReaction").notNull().default("none"),
  textReaction: agentTextReaction("textReaction").notNull().default("reply_text"),
  ttsVoice: text("ttsVoice").notNull().default("alloy"),
  ttsModel: text("ttsModel").notNull().default("tts-1"),
  voiceReactionText: text("voiceReactionText"),
  limitsEnabled: boolean("limitsEnabled").notNull().default(false),
  limitType: agentLimitType("limitType"),
  limitValue: integer("limitValue"),
  limitMessage: text("limitMessage"),
  stopWordRules: jsonb("stopWordRules").notNull().default([]),
  operatorTrigger: agentOperatorTrigger("operatorTrigger").notNull().default("keep_going"),
  pauseDurationMinutes: integer("pauseDurationMinutes").notNull().default(5),
  createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
});
