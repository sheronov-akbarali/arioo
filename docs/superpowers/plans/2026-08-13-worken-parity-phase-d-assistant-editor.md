# Worken Parity Phase D — Assistant Editor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild `/assistants/:id` from a single flat form into a tabbed editor (AI / Chats / Calls / Knowledge bases) matching the scope of worken.ru's `/bots/:id` panel, with every setting persisted to real DB tables — action buttons that require infrastructure we don't have yet (SIP, TTS synthesis) stay disabled, but the settings themselves are real, saved forms.

**Architecture:** A shared `assistants/[agentId]/layout.tsx` renders the agent header (name, "no channels connected", disabled Connect button, Test link) and a client-side tab nav (`AssistantTabs`, same pattern as `SettingsTabs`). Each of the 4 tabs is its own route (`ai/`, `chats/`, `calls/`, `knowledge/`) with its own `page.tsx` + `actions.ts`, following the existing `updateAgentAction`/`uploadKnowledgeDocumentAction` server-action pattern (plain `formData` in, `void` out, `revalidatePath`). New settings live in 3 new 1:1-with-agent Drizzle tables (`agent_chat_settings`, `agent_call_policy`, `agent_knowledge_settings`) plus new columns on `ai_agent`, following the existing small-dedicated-table style (`approvals.ts`, `agents.ts`).

**Tech Stack:** Next.js 16 App Router, TypeScript, Drizzle ORM + Neon Postgres, Zod, next-intl (uz/ru/en), shadcn/ui (`Button`, `Input`, `Label`), `@base-ui/react` (via existing `Link`/`Tabs` primitives — note: this plan uses plain `<Link>` nav, not the `<Tabs>` component, to get real per-route URLs).

**Spec:** `docs/superpowers/specs/2026-08-13-worken-parity-phase-d-assistant-editor-design.md`

## Global Constraints

- Every user-visible string ships in `uz` (default), `ru`, `en` — verified by `messages/messages.test.ts`.
- Fields whose backend doesn't exist yet (SIP call policy actions, TTS playback, semantic-search retrieval wiring) are still real forms saved to the DB — only their **action buttons** (e.g. a future "Test call") are omitted or disabled, matching the pattern already used by `ToolsPanel` (`opacity-60` rows + "Tez orada" badge) and the `/integrations` page.
- Simplification (agreed during spec review): `stopWordRules` and `escalationTriggerWords`, which worken represents as dynamic add/remove rule lists, are implemented as a single newline-separated `<textarea>` parsed server-side into the `jsonb` array shape — avoids building a client-side dynamic-list component for a feature with no runtime consumer yet. The DB shape stays `{ word, action }[]` / `string[]` for forward compatibility.
- No new tool/library dependencies — no shadcn `Select`/`Checkbox`/`Switch` component exists in this repo (`src/components/ui/` has no `select.tsx`/`checkbox.tsx`); follow the existing pattern of raw `<select>` and `<input type="checkbox">` styled with the same Tailwind classes already used in `assistants/[agentId]/page.tsx`.
- Schema changes are applied with `npx drizzle-kit push` (no migration files are committed in this repo — confirmed via `docs/superpowers/plans/2026-08-07-ai-agent-core.md` and `2026-08-05-auth-cabinet.md`, both of which use `push`, and the absence of any `drizzle/` output directory).
- `assistants.detail.knowledgeLink` / `assistants.detail.chatLink` translation keys are removed (superseded by the shared layout's `test` link and the `knowledge` tab) — remove them from all 3 locale files in the same task that removes their last usage.

---

### Task 1: Database schema — new columns and tables

**Files:**
- Modify: `src/db/schema/agents.ts`
- Create: `src/db/schema/agent-chat-settings.ts`
- Create: `src/db/schema/agent-call-policy.ts`
- Create: `src/db/schema/agent-knowledge-settings.ts`
- Modify: `src/db/schema/index.ts`

**Interfaces:**
- Produces: `aiAgents` (extended), `agentChatSettings`, `agentCallPolicy`, `agentKnowledgeSettings` tables and their pgEnums — consumed by Task 2 (zod schemas), Task 3 (get-or-create helpers), and Tasks 5-8 (pages/actions).

- [ ] **Step 1: Extend `src/db/schema/agents.ts` with AI-core columns**

Replace the full file with:

```ts
import { pgTable, text, timestamp, pgEnum, boolean, integer, real } from "drizzle-orm/pg-core";
import { organizations } from "./org";

export const agentRole = pgEnum("agent_role", ["sales", "support", "hr", "marketing"]);
export const agentStatus = pgEnum("agent_status", ["draft", "active"]);
export const agentMemoryIsolation = pgEnum("agent_memory_isolation", ["user", "thread"]);
export const agentMemoryTemplateMode = pgEnum("agent_memory_template_mode", [
  "freeform",
  "schema",
]);
export const agentInterruptionMode = pgEnum("agent_interruption_mode", [
  "queue",
  "abort_restart",
  "drop_restart",
]);

export const aiAgents = pgTable("ai_agent", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  organizationId: text("organizationId")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  role: agentRole("role").notNull(),
  name: text("name").notNull(),
  systemPrompt: text("systemPrompt").notNull(),
  model: text("model").notNull(),
  status: agentStatus("status").notNull().default("draft"),
  createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
  // AI core settings (Worken parity Phase D)
  topP: real("topP"),
  temperature: real("temperature"),
  maxTokens: integer("maxTokens"),
  readOnlyMode: boolean("readOnlyMode").notNull().default(false),
  recentMessagesCount: integer("recentMessagesCount").notNull().default(20),
  autoTitleGeneration: boolean("autoTitleGeneration").notNull().default(true),
  semanticSearchEnabled: boolean("semanticSearchEnabled").notNull().default(false),
  memoryIsolation: agentMemoryIsolation("memoryIsolation").notNull().default("user"),
  memoryTemplateMode: agentMemoryTemplateMode("memoryTemplateMode")
    .notNull()
    .default("freeform"),
  memoryTemplate: text("memoryTemplate"),
  removeEmojis: boolean("removeEmojis").notNull().default(false),
  removeMarkdown: boolean("removeMarkdown").notNull().default(false),
  interruptionMode: agentInterruptionMode("interruptionMode").notNull().default("queue"),
  maxStepsWithoutTools: integer("maxStepsWithoutTools").notNull().default(1),
  maxStepsWithTools: integer("maxStepsWithTools").notNull().default(8),
});
```

- [ ] **Step 2: Create `src/db/schema/agent-chat-settings.ts`**

```ts
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
```

- [ ] **Step 3: Create `src/db/schema/agent-call-policy.ts`**

```ts
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
```

(`toolsMode` from the spec is dropped as a column — worken hard-codes it to `"as_in_ai"` with no other option yet, so it's rendered as static read-only text in Task 7's UI rather than stored.)

- [ ] **Step 4: Create `src/db/schema/agent-knowledge-settings.ts`**

```ts
import { pgTable, text, timestamp, pgEnum, integer, real } from "drizzle-orm/pg-core";
import { aiAgents } from "./agents";

export const agentKnowledgeAggregation = pgEnum("agent_knowledge_aggregation", [
  "merge",
  "priority",
]);

export const agentKnowledgeSettings = pgTable("agent_knowledge_settings", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  agentId: text("agentId")
    .notNull()
    .unique()
    .references(() => aiAgents.id, { onDelete: "cascade" }),
  embeddingModel: text("embeddingModel").notNull().default("text-embedding-3-small"),
  relevanceThreshold: real("relevanceThreshold").notNull().default(0.85),
  maxResults: integer("maxResults").notNull().default(10),
  maxContextTokens: integer("maxContextTokens").notNull().default(4000),
  aggregationStrategy: agentKnowledgeAggregation("aggregationStrategy")
    .notNull()
    .default("merge"),
  createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
});
```

- [ ] **Step 5: Register the new tables in `src/db/schema/index.ts`**

```ts
export * from "./org";
export * from "./agents";
export * from "./agent-chat-settings";
export * from "./agent-call-policy";
export * from "./agent-knowledge-settings";
export * from "./knowledge";
export * from "./conversations";
export * from "./approvals";
export * from "./billing";
export * from "./routines";
export * from "./products";
export * from "./referrals";
```

- [ ] **Step 6: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 7: Push schema to the database**

Run: `npx drizzle-kit push`
Expected: drizzle-kit reports additive changes only — new columns on `ai_agent`, and 3 new tables (`agent_chat_settings`, `agent_call_policy`, `agent_knowledge_settings`) with their enums. Confirm each prompt (all are `+ create` operations, no data loss).

- [ ] **Step 8: Commit**

```bash
git add src/db/schema/agents.ts src/db/schema/agent-chat-settings.ts src/db/schema/agent-call-policy.ts src/db/schema/agent-knowledge-settings.ts src/db/schema/index.ts
git commit -m "feat(db): add assistant editor settings tables (Phase D)"
```

---

### Task 2: Validation schemas (Zod)

**Files:**
- Create: `src/lib/agents/zod-helpers.ts`
- Create: `src/lib/agents/ai-core-schema.ts`
- Create: `src/lib/agents/chat-settings-schema.ts`
- Create: `src/lib/agents/call-policy-schema.ts`
- Create: `src/lib/agents/knowledge-settings-schema.ts`
- Test: `src/lib/agents/ai-core-schema.test.ts`
- Test: `src/lib/agents/chat-settings-schema.test.ts`
- Test: `src/lib/agents/call-policy-schema.test.ts`
- Test: `src/lib/agents/knowledge-settings-schema.test.ts`

**Interfaces:**
- Consumes: nothing from Task 1 directly (schemas validate plain objects, independent of Drizzle types).
- Produces: `parseAiCoreSettingsInput`, `parseChatSettingsInput`, `parseCallPolicyInput`, `parseKnowledgeSettingsInput` (each returning `{ success: true; data: T } | { success: false; error: string }`, same shape as existing `parseAgentInput` in `src/lib/agents/schema.ts`) — consumed by Tasks 5-8's `actions.ts` files.

- [ ] **Step 1: Write `src/lib/agents/zod-helpers.ts`**

```ts
import "server-only";
import { z } from "zod";

// FormData.get() returns "" or null for empty optional fields; z.coerce.number()
// turns "" into 0 instead of failing, which would silently store a wrong value
// for fields that mean "unset" (e.g. topP, maxAttempts). These helpers normalize
// "empty" to null before the underlying schema runs.
function emptyToNull(value: unknown): unknown {
  return value === "" || value === null || value === undefined ? null : value;
}

export function optionalNumber(min: number, max: number) {
  return z.preprocess(emptyToNull, z.coerce.number().min(min).max(max).nullable());
}

export function optionalText(maxLength: number) {
  return z.preprocess(emptyToNull, z.string().trim().max(maxLength).nullable());
}

export function optionalEnum<T extends [string, ...string[]]>(values: T) {
  return z.preprocess(emptyToNull, z.enum(values).nullable());
}
```

- [ ] **Step 2: Write the failing test for `ai-core-schema.ts`**

Create `src/lib/agents/ai-core-schema.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { parseAiCoreSettingsInput } from "./ai-core-schema";

const VALID_INPUT = {
  topP: "",
  temperature: "0.7",
  maxTokens: "2000",
  readOnlyMode: null,
  recentMessagesCount: "20",
  autoTitleGeneration: "on",
  semanticSearchEnabled: null,
  memoryIsolation: "user",
  memoryTemplateMode: "freeform",
  memoryTemplate: "",
  removeEmojis: null,
  removeMarkdown: null,
  interruptionMode: "queue",
  maxStepsWithoutTools: "1",
  maxStepsWithTools: "8",
};

describe("parseAiCoreSettingsInput", () => {
  it("accepts valid input and treats empty optional numbers as null", () => {
    const result = parseAiCoreSettingsInput(VALID_INPUT);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.topP).toBeNull();
      expect(result.data.temperature).toBe(0.7);
      expect(result.data.readOnlyMode).toBe(false);
      expect(result.data.autoTitleGeneration).toBe(true);
    }
  });

  it("rejects an unknown interruptionMode", () => {
    const result = parseAiCoreSettingsInput({ ...VALID_INPUT, interruptionMode: "bogus" });
    expect(result.success).toBe(false);
  });

  it("rejects temperature out of range", () => {
    const result = parseAiCoreSettingsInput({ ...VALID_INPUT, temperature: "5" });
    expect(result.success).toBe(false);
  });
});
```

- [ ] **Step 3: Run it to verify it fails**

Run: `npm run test -- src/lib/agents/ai-core-schema.test.ts`
Expected: FAIL — `Cannot find module './ai-core-schema'`.

- [ ] **Step 4: Write `src/lib/agents/ai-core-schema.ts`**

```ts
import "server-only";
import { z } from "zod";
import { optionalNumber, optionalText } from "./zod-helpers";

const aiCoreSettingsSchema = z.object({
  topP: optionalNumber(0, 1),
  temperature: optionalNumber(0, 2),
  maxTokens: optionalNumber(1, 100000),
  readOnlyMode: z.coerce.boolean(),
  recentMessagesCount: z.coerce.number().int().min(0).max(200),
  autoTitleGeneration: z.coerce.boolean(),
  semanticSearchEnabled: z.coerce.boolean(),
  memoryIsolation: z.enum(["user", "thread"]),
  memoryTemplateMode: z.enum(["freeform", "schema"]),
  memoryTemplate: optionalText(4000),
  removeEmojis: z.coerce.boolean(),
  removeMarkdown: z.coerce.boolean(),
  interruptionMode: z.enum(["queue", "abort_restart", "drop_restart"]),
  maxStepsWithoutTools: z.coerce.number().int().min(1).max(20),
  maxStepsWithTools: z.coerce.number().int().min(1).max(50),
});

export type AiCoreSettingsInput = z.infer<typeof aiCoreSettingsSchema>;

export function parseAiCoreSettingsInput(
  input: unknown,
): { success: true; data: AiCoreSettingsInput } | { success: false; error: string } {
  const result = aiCoreSettingsSchema.safeParse(input);
  if (!result.success) {
    return { success: false, error: result.error.issues[0]?.message ?? "Invalid input" };
  }
  return { success: true, data: result.data };
}
```

- [ ] **Step 5: Run it to verify it passes**

Run: `npm run test -- src/lib/agents/ai-core-schema.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 6: Write the failing test for `chat-settings-schema.ts`**

Create `src/lib/agents/chat-settings-schema.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { parseChatSettingsInput } from "./chat-settings-schema";

const VALID_INPUT = {
  description: "",
  greetingMessage: "Salom!",
  replyDelaySeconds: "0",
  timezone: "Asia/Tashkent",
  voiceReaction: "none",
  textReaction: "reply_text",
  ttsVoice: "alloy",
  ttsModel: "tts-1",
  voiceReactionText: "",
  limitsEnabled: null,
  limitType: "",
  limitValue: "",
  limitMessage: "",
  stopWordRules: [{ word: "spam", action: "block" }],
  operatorTrigger: "keep_going",
  pauseDurationMinutes: "5",
};

describe("parseChatSettingsInput", () => {
  it("accepts valid input", () => {
    const result = parseChatSettingsInput(VALID_INPUT);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.limitType).toBeNull();
      expect(result.data.stopWordRules).toEqual([{ word: "spam", action: "block" }]);
    }
  });

  it("rejects an unknown voiceReaction", () => {
    const result = parseChatSettingsInput({ ...VALID_INPUT, voiceReaction: "bogus" });
    expect(result.success).toBe(false);
  });

  it("rejects a negative replyDelaySeconds", () => {
    const result = parseChatSettingsInput({ ...VALID_INPUT, replyDelaySeconds: "-1" });
    expect(result.success).toBe(false);
  });
});
```

- [ ] **Step 7: Run it to verify it fails**

Run: `npm run test -- src/lib/agents/chat-settings-schema.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 8: Write `src/lib/agents/chat-settings-schema.ts`**

```ts
import "server-only";
import { z } from "zod";
import { optionalEnum, optionalNumber, optionalText } from "./zod-helpers";

const stopWordRuleSchema = z.object({
  word: z.string().trim().min(1).max(100),
  action: z.enum(["block", "flag"]),
});

const chatSettingsSchema = z.object({
  description: optionalText(2000),
  greetingMessage: optionalText(2000),
  replyDelaySeconds: z.coerce.number().int().min(0).max(300),
  timezone: optionalText(100),
  voiceReaction: z.enum(["none", "reply_text", "reply_voice"]),
  textReaction: z.literal("reply_text"),
  ttsVoice: z.string().trim().min(1).max(50),
  ttsModel: z.string().trim().min(1).max(50),
  voiceReactionText: optionalText(100),
  limitsEnabled: z.coerce.boolean(),
  limitType: optionalEnum(["messages", "tokens", "workens"]),
  limitValue: optionalNumber(0, 1000000),
  limitMessage: optionalText(500),
  stopWordRules: z.array(stopWordRuleSchema).max(50),
  operatorTrigger: z.enum(["keep_going", "pause"]),
  pauseDurationMinutes: z.coerce.number().int().min(1).max(1440),
});

export type ChatSettingsInput = z.infer<typeof chatSettingsSchema>;

export function parseChatSettingsInput(
  input: unknown,
): { success: true; data: ChatSettingsInput } | { success: false; error: string } {
  const result = chatSettingsSchema.safeParse(input);
  if (!result.success) {
    return { success: false, error: result.error.issues[0]?.message ?? "Invalid input" };
  }
  return { success: true, data: result.data };
}
```

- [ ] **Step 9: Run it to verify it passes**

Run: `npm run test -- src/lib/agents/chat-settings-schema.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 10: Write the failing test for `call-policy-schema.ts`**

Create `src/lib/agents/call-policy-schema.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { parseCallPolicyInput } from "./call-policy-schema";

const VALID_INPUT = {
  enabled: null,
  direction: "off",
  windowTimezoneMode: "same_as_chat",
  windowStart: "10:00",
  windowEnd: "19:00",
  offWindowBehavior: "reject",
  requireExistingThread: "on",
  respectDnc: "on",
  maxAttempts: "3",
  attemptsPeriodDays: "7",
  recordingMode: "record_announce",
  disclosureScript: "",
  maxDurationMinutes: "20",
  maxParallelLines: "2",
  sipIntegrationRef: "",
  outboundDid: "",
  lineInstruction: "",
  callModel: "gpt-realtime",
  callVoice: "alloy",
  defaultMode: "supervised",
  maxActionsPerReply: "5",
  confirmationMode: "always",
  saveSummaryToThread: "on",
  syncCrm: null,
  escalationTarget: "",
  escalationTriggerWords: ["operator", "human"],
};

describe("parseCallPolicyInput", () => {
  it("accepts valid input", () => {
    const result = parseCallPolicyInput(VALID_INPUT);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.enabled).toBe(false);
      expect(result.data.escalationTriggerWords).toEqual(["operator", "human"]);
    }
  });

  it("rejects an unknown direction", () => {
    const result = parseCallPolicyInput({ ...VALID_INPUT, direction: "bogus" });
    expect(result.success).toBe(false);
  });

  it("rejects maxDurationMinutes above the cap", () => {
    const result = parseCallPolicyInput({ ...VALID_INPUT, maxDurationMinutes: "999" });
    expect(result.success).toBe(false);
  });
});
```

- [ ] **Step 11: Run it to verify it fails**

Run: `npm run test -- src/lib/agents/call-policy-schema.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 12: Write `src/lib/agents/call-policy-schema.ts`**

```ts
import "server-only";
import { z } from "zod";
import { optionalNumber, optionalText } from "./zod-helpers";

const callPolicySchema = z.object({
  enabled: z.coerce.boolean(),
  direction: z.enum(["inbound", "outbound", "both", "off"]),
  windowTimezoneMode: z.enum(["same_as_chat", "custom"]),
  windowStart: optionalText(5),
  windowEnd: optionalText(5),
  offWindowBehavior: z.enum(["reject", "voicemail_task"]),
  requireExistingThread: z.coerce.boolean(),
  respectDnc: z.coerce.boolean(),
  maxAttempts: optionalNumber(1, 100),
  attemptsPeriodDays: optionalNumber(1, 365),
  recordingMode: z.enum(["off", "record", "record_announce"]),
  disclosureScript: optionalText(1000),
  maxDurationMinutes: z.coerce.number().int().min(1).max(180),
  maxParallelLines: z.coerce.number().int().min(1).max(20),
  sipIntegrationRef: optionalText(200),
  outboundDid: optionalText(30),
  lineInstruction: optionalText(2000),
  callModel: z.string().trim().min(1).max(100),
  callVoice: z.string().trim().min(1).max(50),
  defaultMode: z.enum(["supervised", "autonomous"]),
  maxActionsPerReply: z.coerce.number().int().min(1).max(50),
  confirmationMode: z.enum(["always", "per_tool", "read_only"]),
  saveSummaryToThread: z.coerce.boolean(),
  syncCrm: z.coerce.boolean(),
  escalationTarget: optionalText(200),
  escalationTriggerWords: z.array(z.string().trim().min(1).max(50)).max(50),
});

export type CallPolicyInput = z.infer<typeof callPolicySchema>;

export function parseCallPolicyInput(
  input: unknown,
): { success: true; data: CallPolicyInput } | { success: false; error: string } {
  const result = callPolicySchema.safeParse(input);
  if (!result.success) {
    return { success: false, error: result.error.issues[0]?.message ?? "Invalid input" };
  }
  return { success: true, data: result.data };
}
```

- [ ] **Step 13: Run it to verify it passes**

Run: `npm run test -- src/lib/agents/call-policy-schema.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 14: Write the failing test for `knowledge-settings-schema.ts`**

Create `src/lib/agents/knowledge-settings-schema.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { parseKnowledgeSettingsInput } from "./knowledge-settings-schema";

const VALID_INPUT = {
  embeddingModel: "text-embedding-3-small",
  relevanceThreshold: "0.85",
  maxResults: "10",
  maxContextTokens: "4000",
  aggregationStrategy: "merge",
};

describe("parseKnowledgeSettingsInput", () => {
  it("accepts valid input", () => {
    const result = parseKnowledgeSettingsInput(VALID_INPUT);
    expect(result.success).toBe(true);
  });

  it("rejects relevanceThreshold above 1", () => {
    const result = parseKnowledgeSettingsInput({ ...VALID_INPUT, relevanceThreshold: "1.5" });
    expect(result.success).toBe(false);
  });

  it("rejects an unknown aggregationStrategy", () => {
    const result = parseKnowledgeSettingsInput({ ...VALID_INPUT, aggregationStrategy: "bogus" });
    expect(result.success).toBe(false);
  });
});
```

- [ ] **Step 15: Run it to verify it fails**

Run: `npm run test -- src/lib/agents/knowledge-settings-schema.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 16: Write `src/lib/agents/knowledge-settings-schema.ts`**

```ts
import "server-only";
import { z } from "zod";

const knowledgeSettingsSchema = z.object({
  embeddingModel: z.string().trim().min(1).max(100),
  relevanceThreshold: z.coerce.number().min(0).max(1),
  maxResults: z.coerce.number().int().min(1).max(50),
  maxContextTokens: z.coerce.number().int().min(100).max(8000),
  aggregationStrategy: z.enum(["merge", "priority"]),
});

export type KnowledgeSettingsInput = z.infer<typeof knowledgeSettingsSchema>;

export function parseKnowledgeSettingsInput(
  input: unknown,
): { success: true; data: KnowledgeSettingsInput } | { success: false; error: string } {
  const result = knowledgeSettingsSchema.safeParse(input);
  if (!result.success) {
    return { success: false, error: result.error.issues[0]?.message ?? "Invalid input" };
  }
  return { success: true, data: result.data };
}
```

- [ ] **Step 17: Run the full test suite for this task**

Run: `npm run test -- src/lib/agents/`
Expected: PASS — all 4 new test files plus the existing `schema.test.ts`.

- [ ] **Step 18: Commit**

```bash
git add src/lib/agents/zod-helpers.ts src/lib/agents/ai-core-schema.ts src/lib/agents/ai-core-schema.test.ts src/lib/agents/chat-settings-schema.ts src/lib/agents/chat-settings-schema.test.ts src/lib/agents/call-policy-schema.ts src/lib/agents/call-policy-schema.test.ts src/lib/agents/knowledge-settings-schema.ts src/lib/agents/knowledge-settings-schema.test.ts
git commit -m "feat(agents): add validation schemas for assistant editor tabs"
```

---

### Task 3: Get-or-create settings helpers

**Files:**
- Create: `src/lib/agents/settings.ts`

**Interfaces:**
- Consumes: `agentChatSettings`, `agentCallPolicy`, `agentKnowledgeSettings` (Task 1).
- Produces: `getOrCreateChatSettings(agentId: string)`, `getOrCreateCallPolicy(agentId: string)`, `getOrCreateKnowledgeSettings(agentId: string)` — each returns the full row (with defaults applied by Postgres on first insert). Consumed by Tasks 6, 7, 8.

- [ ] **Step 1: Write `src/lib/agents/settings.ts`**

```ts
import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { agentChatSettings } from "@/db/schema/agent-chat-settings";
import { agentCallPolicy } from "@/db/schema/agent-call-policy";
import { agentKnowledgeSettings } from "@/db/schema/agent-knowledge-settings";

export async function getOrCreateChatSettings(agentId: string) {
  const [existing] = await db
    .select()
    .from(agentChatSettings)
    .where(eq(agentChatSettings.agentId, agentId));
  if (existing) return existing;
  const [created] = await db.insert(agentChatSettings).values({ agentId }).returning();
  return created!;
}

export async function getOrCreateCallPolicy(agentId: string) {
  const [existing] = await db
    .select()
    .from(agentCallPolicy)
    .where(eq(agentCallPolicy.agentId, agentId));
  if (existing) return existing;
  const [created] = await db.insert(agentCallPolicy).values({ agentId }).returning();
  return created!;
}

export async function getOrCreateKnowledgeSettings(agentId: string) {
  const [existing] = await db
    .select()
    .from(agentKnowledgeSettings)
    .where(eq(agentKnowledgeSettings.agentId, agentId));
  if (existing) return existing;
  const [created] = await db.insert(agentKnowledgeSettings).values({ agentId }).returning();
  return created!;
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors. (No unit test — this is a thin DB-query helper with no local test DB in this repo, matching the untested style of `src/lib/ai/retrieval.ts` and `src/lib/auth/dal.ts`.)

- [ ] **Step 3: Commit**

```bash
git add src/lib/agents/settings.ts
git commit -m "feat(agents): add get-or-create helpers for editor settings rows"
```

---

### Task 4: Shared layout, tab nav, and index redirect

**Files:**
- Create: `src/components/dashboard/assistants/assistant-tabs.tsx`
- Create: `src/app/[locale]/(dashboard)/assistants/[agentId]/layout.tsx`
- Modify: `src/app/[locale]/(dashboard)/assistants/[agentId]/page.tsx` (becomes a redirect)
- Delete: `src/app/[locale]/(dashboard)/assistants/[agentId]/actions.ts` (logic moves to `ai/actions.ts` in Task 5)
- Modify: `messages/uz.json`, `messages/ru.json`, `messages/en.json`

**Interfaces:**
- Consumes: `requireAgent` (`src/lib/auth/dal.ts`).
- Produces: `<AssistantTabs agentId={string} />` component — consumed by `layout.tsx` only. `assistants.detail.tabs.*`, `assistants.detail.connect`, `assistants.detail.test`, `assistants.detail.noChannelsConnected` translation keys — consumed by `layout.tsx`.

- [ ] **Step 1: Add translation keys to `messages/uz.json`**

Inside `assistants.detail`, replace the flat structure (which currently has `nameLabel`, `roleLabel`, `systemPromptLabel`, `modelLabel`, `save`, `knowledgeLink`, `chatLink`, `roles`, `tools`) with:

```json
"detail": {
  "tabs": {
    "ai": "AI",
    "chats": "Chatlar",
    "calls": "Qo'ng'iroqlar",
    "knowledge": "Bilim bazalari"
  },
  "connect": "Ulash",
  "test": "Sinab ko'rish",
  "noChannelsConnected": "Kanallar ulanmagan"
}
```

(The `nameLabel`/`roleLabel`/etc. keys move to `assistants.detail.ai.*` in Task 5, which deletes them from here — don't duplicate them in this step.)

- [ ] **Step 2: Add the same structure to `messages/ru.json`**

```json
"detail": {
  "tabs": {
    "ai": "ИИ",
    "chats": "Чаты",
    "calls": "Звонки",
    "knowledge": "Базы знаний"
  },
  "connect": "Подключить",
  "test": "Протестировать",
  "noChannelsConnected": "Каналы не подключены"
}
```

- [ ] **Step 3: Add the same structure to `messages/en.json`**

```json
"detail": {
  "tabs": {
    "ai": "AI",
    "chats": "Chats",
    "calls": "Calls",
    "knowledge": "Knowledge bases"
  },
  "connect": "Connect",
  "test": "Test",
  "noChannelsConnected": "No channels connected"
}
```

- [ ] **Step 4: Write `src/components/dashboard/assistants/assistant-tabs.tsx`**

```tsx
"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

const TABS = ["ai", "chats", "calls", "knowledge"] as const;

export function AssistantTabs({ agentId }: { agentId: string }) {
  const t = useTranslations("assistants.detail.tabs");
  const pathname = usePathname();

  return (
    <nav className="flex flex-wrap gap-1 border-b border-border">
      {TABS.map((tab) => {
        const href = `/assistants/${agentId}/${tab}`;
        const active = pathname.startsWith(href);
        return (
          <Link
            key={tab}
            href={href}
            className={cn(
              "border-b-2 px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "border-brand text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {t(tab)}
          </Link>
        );
      })}
    </nav>
  );
}
```

- [ ] **Step 5: Write `src/app/[locale]/(dashboard)/assistants/[agentId]/layout.tsx`**

```tsx
import { getTranslations } from "next-intl/server";
import { requireAgent } from "@/lib/auth/dal";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { AssistantTabs } from "@/components/dashboard/assistants/assistant-tabs";

export default async function AssistantDetailLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string; agentId: string }>;
}) {
  const { locale, agentId } = await params;
  const { agent } = await requireAgent(locale, agentId);
  const t = await getTranslations("assistants.detail");

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">{agent.name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("noChannelsConnected")}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" disabled>
            {t("connect")}
          </Button>
          <Button
            nativeButton={false}
            render={<Link href={`/assistants/${agent.id}/chat`}>{t("test")}</Link>}
          />
        </div>
      </div>
      <AssistantTabs agentId={agent.id} />
      {children}
    </div>
  );
}
```

- [ ] **Step 6: Replace `src/app/[locale]/(dashboard)/assistants/[agentId]/page.tsx` with a redirect**

```tsx
import { redirect } from "next/navigation";

export default async function AssistantDetailIndexPage({
  params,
}: {
  params: Promise<{ locale: string; agentId: string }>;
}) {
  const { locale, agentId } = await params;
  redirect(`/${locale}/assistants/${agentId}/ai`);
}
```

- [ ] **Step 7: Delete the old root `actions.ts`**

```bash
rm "src/app/[locale]/(dashboard)/assistants/[agentId]/actions.ts"
```

(Its one export, `updateAgentAction`, is recreated with extended fields in `ai/actions.ts` in Task 5. Leave this deleted for now — `npx tsc --noEmit` in the next step will legitimately fail until Task 5 restores the route; that's expected and resolved by the very next task, not by this one.)

- [ ] **Step 8: Commit**

```bash
git add messages/uz.json messages/ru.json messages/en.json src/components/dashboard/assistants/assistant-tabs.tsx "src/app/[locale]/(dashboard)/assistants/[agentId]/layout.tsx" "src/app/[locale]/(dashboard)/assistants/[agentId]/page.tsx"
git rm "src/app/[locale]/(dashboard)/assistants/[agentId]/actions.ts"
git commit -m "feat(assistants): add tabbed layout shell for assistant editor"
```

---

### Task 5: `ai` tab — migrate existing form, add core settings

**Files:**
- Create: `src/app/[locale]/(dashboard)/assistants/[agentId]/ai/page.tsx`
- Create: `src/app/[locale]/(dashboard)/assistants/[agentId]/ai/actions.ts`
- Modify: `messages/uz.json`, `messages/ru.json`, `messages/en.json`

**Interfaces:**
- Consumes: `parseAgentInput` (`src/lib/agents/schema.ts`), `parseAiCoreSettingsInput` (Task 2), `requireAgent`, `AGENT_ROLES`, `listAvailableModels`, `<ToolsPanel/>`.
- Produces: nothing new for other tasks — this is a leaf route.

- [ ] **Step 1: Add `assistants.detail.ai` keys to `messages/uz.json`**

Inside `assistants.detail`, add (as a sibling of `tabs`/`connect`/`test`/`noChannelsConnected`):

```json
"ai": {
  "nameLabel": "Nomi",
  "roleLabel": "Rol",
  "systemPromptLabel": "Tizim prompti",
  "modelLabel": "Model",
  "save": "Saqlash",
  "roles": {
    "sales": "Sotuv",
    "support": "Qo'llab-quvvatlash",
    "hr": "HR",
    "marketing": "Marketing"
  },
  "tools": {
    "title": "Integratsiyalar (Tools)",
    "subtitle": "Assistent qaysi vositalardan foydalanishi mumkinligini tanlang",
    "comingSoon": "Tez orada",
    "groups": {
      "internalSystem": "Ichki tizim",
      "googleSheets": "Google Sheets/Drive",
      "github": "GitHub"
    },
    "descriptions": {
      "internalSystem": "Tashkilot va jamoa ma'lumotlarini boshqarish",
      "googleSheets": "Elektron jadval va fayllarni o'qish/yozish",
      "github": "Repozitoriyalar va kod bilan ishlash"
    }
  },
  "coreSettingsTitle": "Asosiy sozlamalar",
  "coreSettingsSubtitle": "Xotira, formatlash va suhbatni boshqarish sozlamalari",
  "topPLabel": "Top P",
  "temperatureLabel": "Temperature",
  "maxTokensLabel": "Maksimal token soni",
  "readOnlyModeLabel": "Faqat o'qish rejimi",
  "readOnlyModeHint": "Yoqilsa, assistent xotirani o'qiydi, lekin yangi xabar saqlamaydi",
  "recentMessagesCountLabel": "Kontekstga kiritiladigan so'nggi xabarlar soni",
  "autoTitleGenerationLabel": "Suhbat nomini avtomatik yaratish",
  "semanticSearchEnabledLabel": "Semantik qidiruv (RAG)",
  "memoryIsolationLabel": "Xotira izolyatsiyasi",
  "memoryIsolationOptions": {
    "user": "Foydalanuvchi bo'yicha",
    "thread": "Suhbat bo'yicha"
  },
  "memoryTemplateModeLabel": "Xotira shabloni turi",
  "memoryTemplateModeOptions": {
    "freeform": "Erkin matn",
    "schema": "Sxema (JSON)"
  },
  "memoryTemplateLabel": "Xotira shabloni",
  "responseFormattingTitle": "Javob formatlash",
  "removeEmojisLabel": "Emojilarni olib tashlash",
  "removeMarkdownLabel": "Markdown'ni olib tashlash",
  "interruptionTitle": "Suhbatni to'xtatib qo'yish",
  "interruptionModeLabel": "Rejim",
  "interruptionModeOptions": {
    "queue": "Navbat (standart)",
    "abort_restart": "To'xtatib qayta boshlash",
    "drop_restart": "Bekor qilib qayta boshlash"
  },
  "agentStepsTitle": "Agent qadamlari",
  "maxStepsWithoutToolsLabel": "Vositalarsiz maksimal qadam",
  "maxStepsWithToolsLabel": "Vositalar bilan maksimal qadam"
}
```

- [ ] **Step 2: Add the same structure to `messages/ru.json`**

```json
"ai": {
  "nameLabel": "Название",
  "roleLabel": "Роль",
  "systemPromptLabel": "Системный промпт",
  "modelLabel": "Модель",
  "save": "Сохранить",
  "roles": {
    "sales": "Продажи",
    "support": "Поддержка",
    "hr": "HR",
    "marketing": "Маркетинг"
  },
  "tools": {
    "title": "Интеграции (Tools)",
    "subtitle": "Выберите, какие инструменты может использовать ассистент",
    "comingSoon": "Скоро",
    "groups": {
      "internalSystem": "Внутренняя система",
      "googleSheets": "Google Sheets/Drive",
      "github": "GitHub"
    },
    "descriptions": {
      "internalSystem": "Управление данными организации и команды",
      "googleSheets": "Чтение и запись таблиц и файлов",
      "github": "Работа с репозиториями и кодом"
    }
  },
  "coreSettingsTitle": "Основные настройки",
  "coreSettingsSubtitle": "Настройки памяти, форматирования и управления диалогом",
  "topPLabel": "Top P",
  "temperatureLabel": "Temperature",
  "maxTokensLabel": "Максимум токенов",
  "readOnlyModeLabel": "Режим только для чтения",
  "readOnlyModeHint": "Ассистент читает память, но не сохраняет новые сообщения",
  "recentMessagesCountLabel": "Число последних сообщений в контексте",
  "autoTitleGenerationLabel": "Автогенерация названия диалога",
  "semanticSearchEnabledLabel": "Семантический поиск (RAG)",
  "memoryIsolationLabel": "Изоляция памяти",
  "memoryIsolationOptions": {
    "user": "По пользователю",
    "thread": "По диалогу"
  },
  "memoryTemplateModeLabel": "Тип шаблона памяти",
  "memoryTemplateModeOptions": {
    "freeform": "Свободный текст",
    "schema": "Схема (JSON)"
  },
  "memoryTemplateLabel": "Шаблон памяти",
  "responseFormattingTitle": "Форматирование ответов",
  "removeEmojisLabel": "Удалять эмодзи",
  "removeMarkdownLabel": "Удалять Markdown",
  "interruptionTitle": "Прерывание диалога",
  "interruptionModeLabel": "Режим",
  "interruptionModeOptions": {
    "queue": "Очередь (по умолчанию)",
    "abort_restart": "Прервать и перезапустить",
    "drop_restart": "Отменить и перезапустить"
  },
  "agentStepsTitle": "Шаги агента",
  "maxStepsWithoutToolsLabel": "Максимум шагов без инструментов",
  "maxStepsWithToolsLabel": "Максимум шагов с инструментами"
}
```

- [ ] **Step 3: Add the same structure to `messages/en.json`**

```json
"ai": {
  "nameLabel": "Name",
  "roleLabel": "Role",
  "systemPromptLabel": "System prompt",
  "modelLabel": "Model",
  "save": "Save",
  "roles": {
    "sales": "Sales",
    "support": "Support",
    "hr": "HR",
    "marketing": "Marketing"
  },
  "tools": {
    "title": "Integrations (Tools)",
    "subtitle": "Choose which tools the assistant can use",
    "comingSoon": "Coming soon",
    "groups": {
      "internalSystem": "Internal system",
      "googleSheets": "Google Sheets/Drive",
      "github": "GitHub"
    },
    "descriptions": {
      "internalSystem": "Manage organization and team data",
      "googleSheets": "Read and write spreadsheets and files",
      "github": "Work with repositories and code"
    }
  },
  "coreSettingsTitle": "Core settings",
  "coreSettingsSubtitle": "Memory, formatting, and conversation-control settings",
  "topPLabel": "Top P",
  "temperatureLabel": "Temperature",
  "maxTokensLabel": "Max tokens",
  "readOnlyModeLabel": "Read-only mode",
  "readOnlyModeHint": "The agent reads memory but won't save new messages",
  "recentMessagesCountLabel": "Recent messages included in context",
  "autoTitleGenerationLabel": "Auto-generate thread title",
  "semanticSearchEnabledLabel": "Semantic search (RAG)",
  "memoryIsolationLabel": "Memory isolation",
  "memoryIsolationOptions": {
    "user": "Per user",
    "thread": "Per thread"
  },
  "memoryTemplateModeLabel": "Memory template type",
  "memoryTemplateModeOptions": {
    "freeform": "Free-form text",
    "schema": "Schema (JSON)"
  },
  "memoryTemplateLabel": "Memory template",
  "responseFormattingTitle": "Response formatting",
  "removeEmojisLabel": "Remove emojis",
  "removeMarkdownLabel": "Remove Markdown",
  "interruptionTitle": "Agent interruption",
  "interruptionModeLabel": "Mode",
  "interruptionModeOptions": {
    "queue": "Queue (default)",
    "abort_restart": "Abort and restart",
    "drop_restart": "Drop and restart"
  },
  "agentStepsTitle": "Agent steps",
  "maxStepsWithoutToolsLabel": "Max steps without tools",
  "maxStepsWithToolsLabel": "Max steps with tools"
}
```

- [ ] **Step 4: Run the key-parity test**

Run: `npm run test -- messages/messages.test.ts`
Expected: FAIL until Tasks 6-8 add `chats`/`calls`/`knowledge` sections too, since `assistants.detail` now has `ai` in `uz`/`ru`/`en` but the old flat keys are gone everywhere consistently — actually this should PASS at this point, since all 3 files were edited identically. Expected: PASS.

- [ ] **Step 5: Write `src/app/[locale]/(dashboard)/assistants/[agentId]/ai/page.tsx`**

```tsx
import { getTranslations } from "next-intl/server";
import { requireAgent } from "@/lib/auth/dal";
import { AGENT_ROLES } from "@/lib/agents/schema";
import { listAvailableModels } from "@/lib/ai/gateway";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ToolsPanel } from "@/components/dashboard/tools-panel";
import { updateAiTabAction } from "./actions";

export default async function AssistantAiTabPage({
  params,
}: {
  params: Promise<{ locale: string; agentId: string }>;
}) {
  const { locale, agentId } = await params;
  const { agent } = await requireAgent(locale, agentId);
  const t = await getTranslations("assistants.detail.ai");
  const models = await listAvailableModels();
  const action = updateAiTabAction.bind(null, locale, agent.id);

  return (
    <div className="flex flex-col gap-8">
      <form action={action} className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="name">{t("nameLabel")}</Label>
          <Input id="name" name="name" required defaultValue={agent.name} minLength={2} maxLength={100} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="role">{t("roleLabel")}</Label>
          <select
            id="role"
            name="role"
            required
            defaultValue={agent.role}
            className="border-input rounded-md border px-3 py-2"
          >
            {AGENT_ROLES.map((role) => (
              <option key={role} value={role}>
                {t(`roles.${role}`)}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="systemPrompt">{t("systemPromptLabel")}</Label>
          <textarea
            id="systemPrompt"
            name="systemPrompt"
            required
            minLength={10}
            maxLength={4000}
            rows={6}
            defaultValue={agent.systemPrompt}
            className="border-input rounded-md border px-3 py-2"
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="model">{t("modelLabel")}</Label>
          <select
            id="model"
            name="model"
            required
            defaultValue={agent.model}
            className="border-input rounded-md border px-3 py-2"
          >
            {models.map((model) => (
              <option key={model.id} value={model.id}>
                {model.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-3 rounded-2xl border border-border p-5">
          <div>
            <h2 className="font-medium">{t("coreSettingsTitle")}</h2>
            <p className="text-sm text-muted-foreground">{t("coreSettingsSubtitle")}</p>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="topP">{t("topPLabel")}</Label>
              <Input id="topP" name="topP" type="number" step="0.01" min={0} max={1} defaultValue={agent.topP ?? ""} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="temperature">{t("temperatureLabel")}</Label>
              <Input id="temperature" name="temperature" type="number" step="0.01" min={0} max={2} defaultValue={agent.temperature ?? ""} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="maxTokens">{t("maxTokensLabel")}</Label>
              <Input id="maxTokens" name="maxTokens" type="number" min={1} max={100000} defaultValue={agent.maxTokens ?? ""} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="recentMessagesCount">{t("recentMessagesCountLabel")}</Label>
              <Input id="recentMessagesCount" name="recentMessagesCount" type="number" min={0} max={200} defaultValue={agent.recentMessagesCount} />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="readOnlyMode" defaultChecked={agent.readOnlyMode} className="size-4 rounded border-input" />
            {t("readOnlyModeLabel")}
          </label>
          <p className="text-xs text-muted-foreground">{t("readOnlyModeHint")}</p>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="autoTitleGeneration" defaultChecked={agent.autoTitleGeneration} className="size-4 rounded border-input" />
            {t("autoTitleGenerationLabel")}
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="semanticSearchEnabled" defaultChecked={agent.semanticSearchEnabled} className="size-4 rounded border-input" />
            {t("semanticSearchEnabledLabel")}
          </label>
          <div className="flex flex-col gap-2">
            <Label htmlFor="memoryIsolation">{t("memoryIsolationLabel")}</Label>
            <select id="memoryIsolation" name="memoryIsolation" defaultValue={agent.memoryIsolation} className="border-input rounded-md border px-3 py-2">
              <option value="user">{t("memoryIsolationOptions.user")}</option>
              <option value="thread">{t("memoryIsolationOptions.thread")}</option>
            </select>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="memoryTemplateMode">{t("memoryTemplateModeLabel")}</Label>
            <select id="memoryTemplateMode" name="memoryTemplateMode" defaultValue={agent.memoryTemplateMode} className="border-input rounded-md border px-3 py-2">
              <option value="freeform">{t("memoryTemplateModeOptions.freeform")}</option>
              <option value="schema">{t("memoryTemplateModeOptions.schema")}</option>
            </select>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="memoryTemplate">{t("memoryTemplateLabel")}</Label>
            <textarea id="memoryTemplate" name="memoryTemplate" rows={3} maxLength={4000} defaultValue={agent.memoryTemplate ?? ""} className="border-input rounded-md border px-3 py-2" />
          </div>
        </div>

        <div className="flex flex-col gap-3 rounded-2xl border border-border p-5">
          <h2 className="font-medium">{t("responseFormattingTitle")}</h2>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="removeEmojis" defaultChecked={agent.removeEmojis} className="size-4 rounded border-input" />
            {t("removeEmojisLabel")}
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="removeMarkdown" defaultChecked={agent.removeMarkdown} className="size-4 rounded border-input" />
            {t("removeMarkdownLabel")}
          </label>
        </div>

        <div className="flex flex-col gap-3 rounded-2xl border border-border p-5">
          <h2 className="font-medium">{t("interruptionTitle")}</h2>
          <div className="flex flex-col gap-2">
            <Label htmlFor="interruptionMode">{t("interruptionModeLabel")}</Label>
            <select id="interruptionMode" name="interruptionMode" defaultValue={agent.interruptionMode} className="border-input rounded-md border px-3 py-2">
              <option value="queue">{t("interruptionModeOptions.queue")}</option>
              <option value="abort_restart">{t("interruptionModeOptions.abort_restart")}</option>
              <option value="drop_restart">{t("interruptionModeOptions.drop_restart")}</option>
            </select>
          </div>
        </div>

        <div className="flex flex-col gap-3 rounded-2xl border border-border p-5">
          <h2 className="font-medium">{t("agentStepsTitle")}</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="maxStepsWithoutTools">{t("maxStepsWithoutToolsLabel")}</Label>
              <Input id="maxStepsWithoutTools" name="maxStepsWithoutTools" type="number" min={1} max={20} defaultValue={agent.maxStepsWithoutTools} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="maxStepsWithTools">{t("maxStepsWithToolsLabel")}</Label>
              <Input id="maxStepsWithTools" name="maxStepsWithTools" type="number" min={1} max={50} defaultValue={agent.maxStepsWithTools} />
            </div>
          </div>
        </div>

        <Button type="submit">{t("save")}</Button>
      </form>
      <ToolsPanel />
    </div>
  );
}
```

- [ ] **Step 6: Write `src/app/[locale]/(dashboard)/assistants/[agentId]/ai/actions.ts`**

```ts
"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { aiAgents } from "@/db/schema/agents";
import { requireAgent } from "@/lib/auth/dal";
import { parseAgentInput } from "@/lib/agents/schema";
import { parseAiCoreSettingsInput } from "@/lib/agents/ai-core-schema";

export async function updateAiTabAction(
  locale: string,
  agentId: string,
  formData: FormData,
): Promise<void> {
  const { agent } = await requireAgent(locale, agentId);

  const parsedBasic = parseAgentInput({
    name: formData.get("name"),
    role: formData.get("role"),
    systemPrompt: formData.get("systemPrompt"),
    model: formData.get("model"),
  });
  const parsedCore = parseAiCoreSettingsInput({
    topP: formData.get("topP"),
    temperature: formData.get("temperature"),
    maxTokens: formData.get("maxTokens"),
    readOnlyMode: formData.get("readOnlyMode"),
    recentMessagesCount: formData.get("recentMessagesCount"),
    autoTitleGeneration: formData.get("autoTitleGeneration"),
    semanticSearchEnabled: formData.get("semanticSearchEnabled"),
    memoryIsolation: formData.get("memoryIsolation"),
    memoryTemplateMode: formData.get("memoryTemplateMode"),
    memoryTemplate: formData.get("memoryTemplate"),
    removeEmojis: formData.get("removeEmojis"),
    removeMarkdown: formData.get("removeMarkdown"),
    interruptionMode: formData.get("interruptionMode"),
    maxStepsWithoutTools: formData.get("maxStepsWithoutTools"),
    maxStepsWithTools: formData.get("maxStepsWithTools"),
  });
  if (!parsedBasic.success || !parsedCore.success) return;

  await db
    .update(aiAgents)
    .set({ ...parsedBasic.data, ...parsedCore.data })
    .where(eq(aiAgents.id, agent.id));
  revalidatePath(`/${locale}/assistants/${agent.id}/ai`);
}
```

- [ ] **Step 7: Type-check and lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: no errors.

- [ ] **Step 8: Run the full test suite**

Run: `npm run test`
Expected: PASS.

- [ ] **Step 9: Manual verification**

Run: `npm run dev`, open `/uz/assistants/<id>/ai` (requires auth — note if unreachable). Fill in a few core-settings fields, save, reload, confirm values persisted.

- [ ] **Step 10: Commit**

```bash
git add messages/uz.json messages/ru.json messages/en.json "src/app/[locale]/(dashboard)/assistants/[agentId]/ai"
git commit -m "feat(assistants): build AI tab with core settings"
```

---

### Task 6: `chats` tab (new)

**Files:**
- Create: `src/app/[locale]/(dashboard)/assistants/[agentId]/chats/page.tsx`
- Create: `src/app/[locale]/(dashboard)/assistants/[agentId]/chats/actions.ts`
- Modify: `messages/uz.json`, `messages/ru.json`, `messages/en.json`

**Interfaces:**
- Consumes: `getOrCreateChatSettings` (Task 3), `parseChatSettingsInput` (Task 2), `requireAgent`.
- Produces: nothing new for other tasks — leaf route.

- [ ] **Step 1: Add `assistants.detail.chats` keys to `messages/uz.json`**

```json
"chats": {
  "profileTitle": "Assistent profili",
  "profileSubtitle": "Nom va tavsif kiriting, keyinroq ro'yxatlarda ko'rinadi",
  "descriptionLabel": "Tavsif",
  "basicSettingsTitle": "Asosiy sozlamalar",
  "greetingMessageLabel": "Salomlashish xabari",
  "replyDelaySecondsLabel": "Javob berishdan oldingi kechikish (soniya)",
  "timezoneLabel": "Vaqt zonasi",
  "voiceListeningTitle": "Ovoz va tinglash",
  "voiceReactionLabel": "Ovozli xabarlarga reaktsiya",
  "voiceReactionOptions": {
    "none": "Reaksiya yo'q",
    "reply_text": "Matn bilan javob",
    "reply_voice": "Ovoz bilan javob"
  },
  "ttsVoiceLabel": "TTS ovozi",
  "ttsModelLabel": "TTS modeli",
  "voiceReactionTextLabel": "Ovozli reaksiya matni",
  "limitsTitle": "Limitlar va cheklovlar",
  "limitsEnabledLabel": "Limitni yoqish",
  "limitTypeLabel": "Limit turi",
  "limitTypeOptions": {
    "none": "Tanlanmagan",
    "messages": "Xabarlar",
    "tokens": "Tokenlar",
    "workens": "Workenlar"
  },
  "limitValueLabel": "Limit qiymati",
  "limitMessageLabel": "Limitga yetganda ko'rsatiladigan xabar",
  "stopWordsLabel": "Stop-so'zlar (har birini alohida qatorga yozing)",
  "triggersTitle": "Triggerlar",
  "operatorTriggerLabel": "Operator xabariga reaktsiya",
  "operatorTriggerOptions": {
    "keep_going": "Suhbatni davom ettirish",
    "pause": "To'xtatib turish"
  },
  "pauseDurationMinutesLabel": "To'xtatib turish davomiyligi (daqiqa)",
  "save": "Saqlash"
}
```

- [ ] **Step 2: Add the same structure to `messages/ru.json`**

```json
"chats": {
  "profileTitle": "Профиль ассистента",
  "profileSubtitle": "Укажите имя и описание, которые будут видны в списках",
  "descriptionLabel": "Описание",
  "basicSettingsTitle": "Основные настройки",
  "greetingMessageLabel": "Приветственное сообщение",
  "replyDelaySecondsLabel": "Задержка перед ответом (сек)",
  "timezoneLabel": "Часовой пояс",
  "voiceListeningTitle": "Голос и прослушивание",
  "voiceReactionLabel": "Реакция на голосовые сообщения",
  "voiceReactionOptions": {
    "none": "Без реакции",
    "reply_text": "Ответ текстом",
    "reply_voice": "Ответ голосом"
  },
  "ttsVoiceLabel": "Голос TTS",
  "ttsModelLabel": "Модель TTS",
  "voiceReactionTextLabel": "Текст голосовой реакции",
  "limitsTitle": "Лимиты и ограничения",
  "limitsEnabledLabel": "Включить лимит",
  "limitTypeLabel": "Тип лимита",
  "limitTypeOptions": {
    "none": "Не выбрано",
    "messages": "Сообщения",
    "tokens": "Токены",
    "workens": "Worken'ы"
  },
  "limitValueLabel": "Значение лимита",
  "limitMessageLabel": "Сообщение при достижении лимита",
  "stopWordsLabel": "Стоп-слова (по одному на строку)",
  "triggersTitle": "Триггеры",
  "operatorTriggerLabel": "Реакция на сообщение оператора",
  "operatorTriggerOptions": {
    "keep_going": "Продолжить диалог",
    "pause": "Приостановить"
  },
  "pauseDurationMinutesLabel": "Длительность паузы (мин)",
  "save": "Сохранить"
}
```

- [ ] **Step 3: Add the same structure to `messages/en.json`**

```json
"chats": {
  "profileTitle": "Assistant profile",
  "profileSubtitle": "Name and description shown in lists",
  "descriptionLabel": "Description",
  "basicSettingsTitle": "Basic settings",
  "greetingMessageLabel": "Greeting message",
  "replyDelaySecondsLabel": "Delay before replying (sec)",
  "timezoneLabel": "Time zone",
  "voiceListeningTitle": "Voice and listening",
  "voiceReactionLabel": "Reaction to voice messages",
  "voiceReactionOptions": {
    "none": "Do not react",
    "reply_text": "Reply with text",
    "reply_voice": "Reply with voice"
  },
  "ttsVoiceLabel": "TTS voice",
  "ttsModelLabel": "TTS model",
  "voiceReactionTextLabel": "Voice reaction text",
  "limitsTitle": "Limits and restrictions",
  "limitsEnabledLabel": "Enable limit",
  "limitTypeLabel": "Limit type",
  "limitTypeOptions": {
    "none": "Not selected",
    "messages": "Messages",
    "tokens": "Tokens",
    "workens": "Workens"
  },
  "limitValueLabel": "Limit value",
  "limitMessageLabel": "Message shown when the limit is reached",
  "stopWordsLabel": "Stop words (one per line)",
  "triggersTitle": "Triggers",
  "operatorTriggerLabel": "Reaction to an operator message",
  "operatorTriggerOptions": {
    "keep_going": "Keep the conversation going",
    "pause": "Pause"
  },
  "pauseDurationMinutesLabel": "Pause duration (min)",
  "save": "Save"
}
```

- [ ] **Step 4: Write `src/app/[locale]/(dashboard)/assistants/[agentId]/chats/page.tsx`**

```tsx
import { getTranslations } from "next-intl/server";
import { requireAgent } from "@/lib/auth/dal";
import { getOrCreateChatSettings } from "@/lib/agents/settings";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { updateChatSettingsAction } from "./actions";

type StopWordRule = { word: string; action: "block" | "flag" };

export default async function AssistantChatsTabPage({
  params,
}: {
  params: Promise<{ locale: string; agentId: string }>;
}) {
  const { locale, agentId } = await params;
  const { agent } = await requireAgent(locale, agentId);
  const settings = await getOrCreateChatSettings(agent.id);
  const t = await getTranslations("assistants.detail.chats");
  const action = updateChatSettingsAction.bind(null, locale, agent.id);
  const stopWordsText = (settings.stopWordRules as StopWordRule[]).map((rule) => rule.word).join("\n");

  return (
    <form action={action} className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 rounded-2xl border border-border p-5">
        <div>
          <h2 className="font-medium">{t("profileTitle")}</h2>
          <p className="text-sm text-muted-foreground">{t("profileSubtitle")}</p>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="description">{t("descriptionLabel")}</Label>
          <textarea id="description" name="description" rows={2} maxLength={2000} defaultValue={settings.description ?? ""} className="border-input rounded-md border px-3 py-2" />
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-border p-5">
        <h2 className="font-medium">{t("basicSettingsTitle")}</h2>
        <div className="flex flex-col gap-2">
          <Label htmlFor="greetingMessage">{t("greetingMessageLabel")}</Label>
          <textarea id="greetingMessage" name="greetingMessage" rows={2} maxLength={2000} defaultValue={settings.greetingMessage ?? ""} className="border-input rounded-md border px-3 py-2" />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor="replyDelaySeconds">{t("replyDelaySecondsLabel")}</Label>
            <Input id="replyDelaySeconds" name="replyDelaySeconds" type="number" min={0} max={300} defaultValue={settings.replyDelaySeconds} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="timezone">{t("timezoneLabel")}</Label>
            <Input id="timezone" name="timezone" placeholder="Asia/Tashkent" defaultValue={settings.timezone ?? ""} />
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-border p-5">
        <h2 className="font-medium">{t("voiceListeningTitle")}</h2>
        <div className="flex flex-col gap-2">
          <Label htmlFor="voiceReaction">{t("voiceReactionLabel")}</Label>
          <select id="voiceReaction" name="voiceReaction" defaultValue={settings.voiceReaction} className="border-input rounded-md border px-3 py-2">
            <option value="none">{t("voiceReactionOptions.none")}</option>
            <option value="reply_text">{t("voiceReactionOptions.reply_text")}</option>
            <option value="reply_voice">{t("voiceReactionOptions.reply_voice")}</option>
          </select>
        </div>
        <input type="hidden" name="textReaction" value="reply_text" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor="ttsVoice">{t("ttsVoiceLabel")}</Label>
            <Input id="ttsVoice" name="ttsVoice" defaultValue={settings.ttsVoice} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="ttsModel">{t("ttsModelLabel")}</Label>
            <Input id="ttsModel" name="ttsModel" defaultValue={settings.ttsModel} />
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="voiceReactionText">{t("voiceReactionTextLabel")}</Label>
          <Input id="voiceReactionText" name="voiceReactionText" maxLength={100} defaultValue={settings.voiceReactionText ?? ""} />
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-border p-5">
        <h2 className="font-medium">{t("limitsTitle")}</h2>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="limitsEnabled" defaultChecked={settings.limitsEnabled} className="size-4 rounded border-input" />
          {t("limitsEnabledLabel")}
        </label>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor="limitType">{t("limitTypeLabel")}</Label>
            <select id="limitType" name="limitType" defaultValue={settings.limitType ?? ""} className="border-input rounded-md border px-3 py-2">
              <option value="">{t("limitTypeOptions.none")}</option>
              <option value="messages">{t("limitTypeOptions.messages")}</option>
              <option value="tokens">{t("limitTypeOptions.tokens")}</option>
              <option value="workens">{t("limitTypeOptions.workens")}</option>
            </select>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="limitValue">{t("limitValueLabel")}</Label>
            <Input id="limitValue" name="limitValue" type="number" min={0} defaultValue={settings.limitValue ?? ""} />
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="limitMessage">{t("limitMessageLabel")}</Label>
          <Input id="limitMessage" name="limitMessage" maxLength={500} defaultValue={settings.limitMessage ?? ""} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="stopWords">{t("stopWordsLabel")}</Label>
          <textarea id="stopWords" name="stopWords" rows={4} defaultValue={stopWordsText} className="border-input rounded-md border px-3 py-2" />
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-border p-5">
        <h2 className="font-medium">{t("triggersTitle")}</h2>
        <div className="flex flex-col gap-2">
          <Label htmlFor="operatorTrigger">{t("operatorTriggerLabel")}</Label>
          <select id="operatorTrigger" name="operatorTrigger" defaultValue={settings.operatorTrigger} className="border-input rounded-md border px-3 py-2">
            <option value="keep_going">{t("operatorTriggerOptions.keep_going")}</option>
            <option value="pause">{t("operatorTriggerOptions.pause")}</option>
          </select>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="pauseDurationMinutes">{t("pauseDurationMinutesLabel")}</Label>
          <Input id="pauseDurationMinutes" name="pauseDurationMinutes" type="number" min={1} max={1440} defaultValue={settings.pauseDurationMinutes} />
        </div>
      </div>

      <Button type="submit">{t("save")}</Button>
    </form>
  );
}
```

- [ ] **Step 5: Write `src/app/[locale]/(dashboard)/assistants/[agentId]/chats/actions.ts`**

```ts
"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { agentChatSettings } from "@/db/schema/agent-chat-settings";
import { requireAgent } from "@/lib/auth/dal";
import { getOrCreateChatSettings } from "@/lib/agents/settings";
import { parseChatSettingsInput } from "@/lib/agents/chat-settings-schema";

export async function updateChatSettingsAction(
  locale: string,
  agentId: string,
  formData: FormData,
): Promise<void> {
  const { agent } = await requireAgent(locale, agentId);
  const existing = await getOrCreateChatSettings(agent.id);

  const stopWordRules = String(formData.get("stopWords") ?? "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 50)
    .map((word) => ({ word, action: "block" as const }));

  const parsed = parseChatSettingsInput({
    description: formData.get("description"),
    greetingMessage: formData.get("greetingMessage"),
    replyDelaySeconds: formData.get("replyDelaySeconds"),
    timezone: formData.get("timezone"),
    voiceReaction: formData.get("voiceReaction"),
    textReaction: formData.get("textReaction"),
    ttsVoice: formData.get("ttsVoice"),
    ttsModel: formData.get("ttsModel"),
    voiceReactionText: formData.get("voiceReactionText"),
    limitsEnabled: formData.get("limitsEnabled"),
    limitType: formData.get("limitType"),
    limitValue: formData.get("limitValue"),
    limitMessage: formData.get("limitMessage"),
    stopWordRules,
    operatorTrigger: formData.get("operatorTrigger"),
    pauseDurationMinutes: formData.get("pauseDurationMinutes"),
  });
  if (!parsed.success) return;

  await db
    .update(agentChatSettings)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(eq(agentChatSettings.id, existing.id));
  revalidatePath(`/${locale}/assistants/${agent.id}/chats`);
}
```

- [ ] **Step 6: Type-check, lint, test**

Run: `npx tsc --noEmit && npm run lint && npm run test`
Expected: no errors, all tests pass.

- [ ] **Step 7: Manual verification**

Run: `npm run dev`, open `/uz/assistants/<id>/chats`, fill in greeting/limits/stop words, save, reload, confirm persisted (including that stop words round-trip through the textarea correctly).

- [ ] **Step 8: Commit**

```bash
git add messages/uz.json messages/ru.json messages/en.json "src/app/[locale]/(dashboard)/assistants/[agentId]/chats"
git commit -m "feat(assistants): build Chats tab"
```

---

### Task 7: `calls` tab (new)

**Files:**
- Create: `src/app/[locale]/(dashboard)/assistants/[agentId]/calls/page.tsx`
- Create: `src/app/[locale]/(dashboard)/assistants/[agentId]/calls/actions.ts`
- Modify: `messages/uz.json`, `messages/ru.json`, `messages/en.json`

**Interfaces:**
- Consumes: `getOrCreateCallPolicy` (Task 3), `parseCallPolicyInput` (Task 2), `requireAgent`.
- Produces: nothing new for other tasks — leaf route.

- [ ] **Step 1: Add `assistants.detail.calls` keys to `messages/uz.json`**

```json
"calls": {
  "policyTitle": "Qo'ng'iroqlar siyosati",
  "policySubtitle": "Yo'nalish, oyna va yozib olish qoidalari — viruts liniyaga chiqishidan oldin qo'llaniladi",
  "enabledLabel": "Qo'ng'iroqlarni yoqish",
  "directionLabel": "Yo'nalish",
  "directionOptions": {
    "off": "O'chirilgan",
    "inbound": "Kiruvchi",
    "outbound": "Chiquvchi",
    "both": "Ikkalasi"
  },
  "windowTitle": "Qo'ng'iroq oynasi",
  "windowTimezoneModeLabel": "Vaqt zonasi",
  "windowTimezoneModeOptions": {
    "same_as_chat": "Chat sozlamalari bilan bir xil",
    "custom": "Alohida"
  },
  "windowStartLabel": "Boshlanish (SS:DD)",
  "windowEndLabel": "Tugash (SS:DD)",
  "offWindowBehaviorLabel": "Oyna tashqarisida",
  "offWindowBehaviorOptions": {
    "reject": "Rad etish",
    "voicemail_task": "Ovozli xabar/vazifa"
  },
  "audienceTitle": "Auditoriya va chastota",
  "requireExistingThreadLabel": "Faqat mavjud suhbat bo'yicha chiquvchi qo'ng'iroq",
  "respectDncLabel": "\"Qo'ng'iroq qilmang\" (DNC) ro'yxatini hisobga olish",
  "maxAttemptsLabel": "Davr uchun maksimal urinish",
  "attemptsPeriodDaysLabel": "Davr (kun)",
  "recordingTitle": "Yozib olish va limitlar",
  "recordingModeLabel": "Yozib olish rejimi",
  "recordingModeOptions": {
    "off": "O'chirilgan",
    "record": "Yozib olish",
    "record_announce": "Yozib olish + ogohlantirish"
  },
  "disclosureScriptLabel": "Ogohlantirish matni",
  "maxDurationMinutesLabel": "Maksimal davomiylik (daqiqa)",
  "maxParallelLinesLabel": "Parallel liniyalar soni",
  "channelTitle": "Kanal va raqamlar",
  "channelHint": "Konnektorning o'zi Integratsiyalar bo'limida sozlanadi. Bu yerda faqat raqam biriktiriladi.",
  "sipIntegrationRefLabel": "SIP konnektor",
  "sipIntegrationRefPlaceholder": "Konnektor tanlanmagan",
  "outboundDidLabel": "Chiquvchi raqam (DID)",
  "lineScriptTitle": "Liniyadagi ssenariy",
  "lineScriptHint": "Asosiy AI ko'rsatmasiga faqat qo'ng'iroq vaqtida qo'shiladi",
  "lineInstructionLabel": "Qo'ng'iroq uchun qo'shimcha ko'rsatma",
  "callModelLabel": "Qo'ng'iroq modeli",
  "callVoiceLabel": "Liniyadagi ovoz",
  "defaultModeLabel": "Standart rejim",
  "defaultModeOptions": {
    "supervised": "Nazorat остида (operator aralashishi mumkin)",
    "autonomous": "Mustaqil"
  },
  "maxActionsPerReplyLabel": "Bitta javobga maksimal harakat",
  "toolsModeTitle": "Liniyadagi vositalar",
  "toolsModeHint": "Vositalar to'plami AI bo'limidan olinadi, bu yerda faqat tasdiqlash rejimi qattiqlashtiriladi",
  "confirmationModeLabel": "O'zgarish kiritadigan harakatlar uchun tasdiqlash",
  "confirmationModeOptions": {
    "always": "Har doim tasdiqlash bilan",
    "per_tool": "Chatlardagi kabi",
    "read_only": "Faqat o'qish"
  },
  "afterCallTitle": "Qo'ng'iroqdan keyin",
  "saveSummaryToThreadLabel": "Xulosa va transkriptni suhbatga saqlash",
  "syncCrmLabel": "CRM bilan sinxronlash",
  "escalationTitle": "Eskalatsiya",
  "escalationTargetLabel": "Qayerga uzatish",
  "escalationTriggerWordsLabel": "Uzatish uchun trigger so'zlar (har birini alohida qatorga yozing)",
  "save": "Saqlash"
}
```

- [ ] **Step 2: Add the same structure to `messages/ru.json`**

```json
"calls": {
  "policyTitle": "Политика звонков",
  "policySubtitle": "Направление, окно и правила записи — применяются до выхода виртса на линию",
  "enabledLabel": "Включить звонки",
  "directionLabel": "Направление",
  "directionOptions": {
    "off": "Выкл",
    "inbound": "Входящие",
    "outbound": "Исходящие",
    "both": "Оба"
  },
  "windowTitle": "Окно звонков",
  "windowTimezoneModeLabel": "Часовой пояс",
  "windowTimezoneModeOptions": {
    "same_as_chat": "Как в настройках чата",
    "custom": "Отдельный"
  },
  "windowStartLabel": "Начало (ЧЧ:ММ)",
  "windowEndLabel": "Конец (ЧЧ:ММ)",
  "offWindowBehaviorLabel": "Вне окна",
  "offWindowBehaviorOptions": {
    "reject": "Отклонять",
    "voicemail_task": "Голосовое + задача"
  },
  "audienceTitle": "Аудитория и частота",
  "requireExistingThreadLabel": "Исходящие только при наличии диалога",
  "respectDncLabel": "Учитывать список \"Не звонить\" (DNC)",
  "maxAttemptsLabel": "Максимум попыток за период",
  "attemptsPeriodDaysLabel": "Период (дней)",
  "recordingTitle": "Запись и лимиты",
  "recordingModeLabel": "Режим записи",
  "recordingModeOptions": {
    "off": "Выкл",
    "record": "Запись",
    "record_announce": "Запись + уведомление"
  },
  "disclosureScriptLabel": "Текст уведомления",
  "maxDurationMinutesLabel": "Максимальная длительность (мин)",
  "maxParallelLinesLabel": "Параллельных линий",
  "channelTitle": "Канал и номера",
  "channelHint": "Сам коннектор настраивается в разделе Интеграции. Здесь только привязка номера.",
  "sipIntegrationRefLabel": "SIP-коннектор",
  "sipIntegrationRefPlaceholder": "Коннектор не выбран",
  "outboundDidLabel": "Исходящий номер (DID)",
  "lineScriptTitle": "Сценарий на линии",
  "lineScriptHint": "Добавляется к основной инструкции AI только на время звонка",
  "lineInstructionLabel": "Дополнительная инструкция для звонка",
  "callModelLabel": "Модель для звонков",
  "callVoiceLabel": "Голос на линии",
  "defaultModeLabel": "Режим по умолчанию",
  "defaultModeOptions": {
    "supervised": "Supervised (оператор может вмешаться)",
    "autonomous": "Автономный"
  },
  "maxActionsPerReplyLabel": "Максимум действий на реплику",
  "toolsModeTitle": "Инструменты на линии",
  "toolsModeHint": "Набор инструментов берётся из раздела AI, здесь можно только ужесточить подтверждение",
  "confirmationModeLabel": "Подтверждение для действий с изменениями",
  "confirmationModeOptions": {
    "always": "Всегда с подтверждением",
    "per_tool": "Как в чатах",
    "read_only": "Только чтение"
  },
  "afterCallTitle": "После звонка",
  "saveSummaryToThreadLabel": "Сохранять итог и расшифровку в диалог",
  "syncCrmLabel": "Синхронизация с CRM",
  "escalationTitle": "Эскалация",
  "escalationTargetLabel": "Куда переводить",
  "escalationTriggerWordsLabel": "Слова-триггеры для перевода (по одному на строку)",
  "save": "Сохранить"
}
```

- [ ] **Step 3: Add the same structure to `messages/en.json`**

```json
"calls": {
  "policyTitle": "Call policy",
  "policySubtitle": "Direction, window, and recording rules — applied before the agent goes live",
  "enabledLabel": "Enable calls",
  "directionLabel": "Direction",
  "directionOptions": {
    "off": "Off",
    "inbound": "Inbound",
    "outbound": "Outbound",
    "both": "Both"
  },
  "windowTitle": "Call window",
  "windowTimezoneModeLabel": "Time zone",
  "windowTimezoneModeOptions": {
    "same_as_chat": "Same as chat settings",
    "custom": "Custom"
  },
  "windowStartLabel": "Start (HH:MM)",
  "windowEndLabel": "End (HH:MM)",
  "offWindowBehaviorLabel": "Outside the window",
  "offWindowBehaviorOptions": {
    "reject": "Reject",
    "voicemail_task": "Voicemail + task"
  },
  "audienceTitle": "Audience and frequency",
  "requireExistingThreadLabel": "Outbound only with an existing thread",
  "respectDncLabel": "Respect the Do-Not-Call (DNC) list",
  "maxAttemptsLabel": "Max attempts per period",
  "attemptsPeriodDaysLabel": "Period (days)",
  "recordingTitle": "Recording and limits",
  "recordingModeLabel": "Recording mode",
  "recordingModeOptions": {
    "off": "Off",
    "record": "Record",
    "record_announce": "Record + announce"
  },
  "disclosureScriptLabel": "Disclosure script",
  "maxDurationMinutesLabel": "Max duration (minutes)",
  "maxParallelLinesLabel": "Parallel lines",
  "channelTitle": "Channel and numbers",
  "channelHint": "The connector itself is configured under Integrations. Here you only attach a number.",
  "sipIntegrationRefLabel": "SIP connector",
  "sipIntegrationRefPlaceholder": "No connector selected",
  "outboundDidLabel": "Outbound number (DID)",
  "lineScriptTitle": "On-call script",
  "lineScriptHint": "Added to the main AI instruction only for the duration of the call",
  "lineInstructionLabel": "Additional call instruction",
  "callModelLabel": "Call model",
  "callVoiceLabel": "On-call voice",
  "defaultModeLabel": "Default mode",
  "defaultModeOptions": {
    "supervised": "Supervised (operator can step in)",
    "autonomous": "Autonomous"
  },
  "maxActionsPerReplyLabel": "Max actions per reply",
  "toolsModeTitle": "Tools on call",
  "toolsModeHint": "The tool set comes from the AI tab — here you can only tighten confirmation",
  "confirmationModeLabel": "Confirmation for actions with side effects",
  "confirmationModeOptions": {
    "always": "Always confirm",
    "per_tool": "Same as chats",
    "read_only": "Read-only"
  },
  "afterCallTitle": "After the call",
  "saveSummaryToThreadLabel": "Save summary and transcript to the thread",
  "syncCrmLabel": "Sync with CRM",
  "escalationTitle": "Escalation",
  "escalationTargetLabel": "Escalation target",
  "escalationTriggerWordsLabel": "Trigger words for escalation (one per line)",
  "save": "Save"
}
```

- [ ] **Step 4: Write `src/app/[locale]/(dashboard)/assistants/[agentId]/calls/page.tsx`**

```tsx
import { getTranslations } from "next-intl/server";
import { requireAgent } from "@/lib/auth/dal";
import { getOrCreateCallPolicy } from "@/lib/agents/settings";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { updateCallPolicyAction } from "./actions";

export default async function AssistantCallsTabPage({
  params,
}: {
  params: Promise<{ locale: string; agentId: string }>;
}) {
  const { locale, agentId } = await params;
  const { agent } = await requireAgent(locale, agentId);
  const policy = await getOrCreateCallPolicy(agent.id);
  const t = await getTranslations("assistants.detail.calls");
  const action = updateCallPolicyAction.bind(null, locale, agent.id);
  const escalationWordsText = (policy.escalationTriggerWords as string[]).join("\n");

  return (
    <form action={action} className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 rounded-2xl border border-border p-5">
        <div>
          <h2 className="font-medium">{t("policyTitle")}</h2>
          <p className="text-sm text-muted-foreground">{t("policySubtitle")}</p>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="enabled" defaultChecked={policy.enabled} className="size-4 rounded border-input" />
          {t("enabledLabel")}
        </label>
        <div className="flex flex-col gap-2">
          <Label htmlFor="direction">{t("directionLabel")}</Label>
          <select id="direction" name="direction" defaultValue={policy.direction} className="border-input rounded-md border px-3 py-2">
            <option value="off">{t("directionOptions.off")}</option>
            <option value="inbound">{t("directionOptions.inbound")}</option>
            <option value="outbound">{t("directionOptions.outbound")}</option>
            <option value="both">{t("directionOptions.both")}</option>
          </select>
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-border p-5">
        <h2 className="font-medium">{t("windowTitle")}</h2>
        <div className="flex flex-col gap-2">
          <Label htmlFor="windowTimezoneMode">{t("windowTimezoneModeLabel")}</Label>
          <select id="windowTimezoneMode" name="windowTimezoneMode" defaultValue={policy.windowTimezoneMode} className="border-input rounded-md border px-3 py-2">
            <option value="same_as_chat">{t("windowTimezoneModeOptions.same_as_chat")}</option>
            <option value="custom">{t("windowTimezoneModeOptions.custom")}</option>
          </select>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor="windowStart">{t("windowStartLabel")}</Label>
            <Input id="windowStart" name="windowStart" placeholder="10:00" maxLength={5} defaultValue={policy.windowStart ?? ""} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="windowEnd">{t("windowEndLabel")}</Label>
            <Input id="windowEnd" name="windowEnd" placeholder="19:00" maxLength={5} defaultValue={policy.windowEnd ?? ""} />
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="offWindowBehavior">{t("offWindowBehaviorLabel")}</Label>
          <select id="offWindowBehavior" name="offWindowBehavior" defaultValue={policy.offWindowBehavior} className="border-input rounded-md border px-3 py-2">
            <option value="reject">{t("offWindowBehaviorOptions.reject")}</option>
            <option value="voicemail_task">{t("offWindowBehaviorOptions.voicemail_task")}</option>
          </select>
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-border p-5">
        <h2 className="font-medium">{t("audienceTitle")}</h2>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="requireExistingThread" defaultChecked={policy.requireExistingThread} className="size-4 rounded border-input" />
          {t("requireExistingThreadLabel")}
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="respectDnc" defaultChecked={policy.respectDnc} className="size-4 rounded border-input" />
          {t("respectDncLabel")}
        </label>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor="maxAttempts">{t("maxAttemptsLabel")}</Label>
            <Input id="maxAttempts" name="maxAttempts" type="number" min={1} max={100} defaultValue={policy.maxAttempts ?? ""} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="attemptsPeriodDays">{t("attemptsPeriodDaysLabel")}</Label>
            <Input id="attemptsPeriodDays" name="attemptsPeriodDays" type="number" min={1} max={365} defaultValue={policy.attemptsPeriodDays ?? ""} />
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-border p-5">
        <h2 className="font-medium">{t("recordingTitle")}</h2>
        <div className="flex flex-col gap-2">
          <Label htmlFor="recordingMode">{t("recordingModeLabel")}</Label>
          <select id="recordingMode" name="recordingMode" defaultValue={policy.recordingMode} className="border-input rounded-md border px-3 py-2">
            <option value="off">{t("recordingModeOptions.off")}</option>
            <option value="record">{t("recordingModeOptions.record")}</option>
            <option value="record_announce">{t("recordingModeOptions.record_announce")}</option>
          </select>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="disclosureScript">{t("disclosureScriptLabel")}</Label>
          <textarea id="disclosureScript" name="disclosureScript" rows={2} maxLength={1000} defaultValue={policy.disclosureScript ?? ""} className="border-input rounded-md border px-3 py-2" />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor="maxDurationMinutes">{t("maxDurationMinutesLabel")}</Label>
            <Input id="maxDurationMinutes" name="maxDurationMinutes" type="number" min={1} max={180} defaultValue={policy.maxDurationMinutes} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="maxParallelLines">{t("maxParallelLinesLabel")}</Label>
            <Input id="maxParallelLines" name="maxParallelLines" type="number" min={1} max={20} defaultValue={policy.maxParallelLines} />
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-border p-5">
        <h2 className="font-medium">{t("channelTitle")}</h2>
        <p className="text-sm text-muted-foreground">{t("channelHint")}</p>
        <div className="flex flex-col gap-2">
          <Label htmlFor="sipIntegrationRef">{t("sipIntegrationRefLabel")}</Label>
          <Input id="sipIntegrationRef" name="sipIntegrationRef" placeholder={t("sipIntegrationRefPlaceholder")} disabled defaultValue={policy.sipIntegrationRef ?? ""} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="outboundDid">{t("outboundDidLabel")}</Label>
          <Input id="outboundDid" name="outboundDid" maxLength={30} defaultValue={policy.outboundDid ?? ""} />
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-border p-5">
        <h2 className="font-medium">{t("lineScriptTitle")}</h2>
        <p className="text-sm text-muted-foreground">{t("lineScriptHint")}</p>
        <div className="flex flex-col gap-2">
          <Label htmlFor="lineInstruction">{t("lineInstructionLabel")}</Label>
          <textarea id="lineInstruction" name="lineInstruction" rows={3} maxLength={2000} defaultValue={policy.lineInstruction ?? ""} className="border-input rounded-md border px-3 py-2" />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor="callModel">{t("callModelLabel")}</Label>
            <Input id="callModel" name="callModel" defaultValue={policy.callModel} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="callVoice">{t("callVoiceLabel")}</Label>
            <Input id="callVoice" name="callVoice" defaultValue={policy.callVoice} />
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="defaultMode">{t("defaultModeLabel")}</Label>
          <select id="defaultMode" name="defaultMode" defaultValue={policy.defaultMode} className="border-input rounded-md border px-3 py-2">
            <option value="supervised">{t("defaultModeOptions.supervised")}</option>
            <option value="autonomous">{t("defaultModeOptions.autonomous")}</option>
          </select>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="maxActionsPerReply">{t("maxActionsPerReplyLabel")}</Label>
          <Input id="maxActionsPerReply" name="maxActionsPerReply" type="number" min={1} max={50} defaultValue={policy.maxActionsPerReply} />
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-border p-5">
        <h2 className="font-medium">{t("toolsModeTitle")}</h2>
        <p className="text-sm text-muted-foreground">{t("toolsModeHint")}</p>
        <div className="flex flex-col gap-2">
          <Label htmlFor="confirmationMode">{t("confirmationModeLabel")}</Label>
          <select id="confirmationMode" name="confirmationMode" defaultValue={policy.confirmationMode} className="border-input rounded-md border px-3 py-2">
            <option value="always">{t("confirmationModeOptions.always")}</option>
            <option value="per_tool">{t("confirmationModeOptions.per_tool")}</option>
            <option value="read_only">{t("confirmationModeOptions.read_only")}</option>
          </select>
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-border p-5">
        <h2 className="font-medium">{t("afterCallTitle")}</h2>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="saveSummaryToThread" defaultChecked={policy.saveSummaryToThread} className="size-4 rounded border-input" />
          {t("saveSummaryToThreadLabel")}
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="syncCrm" defaultChecked={policy.syncCrm} className="size-4 rounded border-input" />
          {t("syncCrmLabel")}
        </label>
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-border p-5">
        <h2 className="font-medium">{t("escalationTitle")}</h2>
        <div className="flex flex-col gap-2">
          <Label htmlFor="escalationTarget">{t("escalationTargetLabel")}</Label>
          <Input id="escalationTarget" name="escalationTarget" maxLength={200} defaultValue={policy.escalationTarget ?? ""} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="escalationTriggerWords">{t("escalationTriggerWordsLabel")}</Label>
          <textarea id="escalationTriggerWords" name="escalationTriggerWords" rows={3} defaultValue={escalationWordsText} className="border-input rounded-md border px-3 py-2" />
        </div>
      </div>

      <Button type="submit">{t("save")}</Button>
    </form>
  );
}
```

- [ ] **Step 5: Write `src/app/[locale]/(dashboard)/assistants/[agentId]/calls/actions.ts`**

```ts
"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { agentCallPolicy } from "@/db/schema/agent-call-policy";
import { requireAgent } from "@/lib/auth/dal";
import { getOrCreateCallPolicy } from "@/lib/agents/settings";
import { parseCallPolicyInput } from "@/lib/agents/call-policy-schema";

export async function updateCallPolicyAction(
  locale: string,
  agentId: string,
  formData: FormData,
): Promise<void> {
  const { agent } = await requireAgent(locale, agentId);
  const existing = await getOrCreateCallPolicy(agent.id);

  const escalationTriggerWords = String(formData.get("escalationTriggerWords") ?? "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 50);

  const parsed = parseCallPolicyInput({
    enabled: formData.get("enabled"),
    direction: formData.get("direction"),
    windowTimezoneMode: formData.get("windowTimezoneMode"),
    windowStart: formData.get("windowStart"),
    windowEnd: formData.get("windowEnd"),
    offWindowBehavior: formData.get("offWindowBehavior"),
    requireExistingThread: formData.get("requireExistingThread"),
    respectDnc: formData.get("respectDnc"),
    maxAttempts: formData.get("maxAttempts"),
    attemptsPeriodDays: formData.get("attemptsPeriodDays"),
    recordingMode: formData.get("recordingMode"),
    disclosureScript: formData.get("disclosureScript"),
    maxDurationMinutes: formData.get("maxDurationMinutes"),
    maxParallelLines: formData.get("maxParallelLines"),
    sipIntegrationRef: formData.get("sipIntegrationRef"),
    outboundDid: formData.get("outboundDid"),
    lineInstruction: formData.get("lineInstruction"),
    callModel: formData.get("callModel"),
    callVoice: formData.get("callVoice"),
    defaultMode: formData.get("defaultMode"),
    maxActionsPerReply: formData.get("maxActionsPerReply"),
    confirmationMode: formData.get("confirmationMode"),
    saveSummaryToThread: formData.get("saveSummaryToThread"),
    syncCrm: formData.get("syncCrm"),
    escalationTarget: formData.get("escalationTarget"),
    escalationTriggerWords,
  });
  if (!parsed.success) return;

  await db
    .update(agentCallPolicy)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(eq(agentCallPolicy.id, existing.id));
  revalidatePath(`/${locale}/assistants/${agent.id}/calls`);
}
```

- [ ] **Step 6: Type-check, lint, test**

Run: `npx tsc --noEmit && npm run lint && npm run test`
Expected: no errors, all tests pass.

- [ ] **Step 7: Manual verification**

Run: `npm run dev`, open `/uz/assistants/<id>/calls`, fill in a few fields across sections, save, reload, confirm persisted. Confirm the `sipIntegrationRef` input renders `disabled` (no SIP provider yet).

- [ ] **Step 8: Commit**

```bash
git add messages/uz.json messages/ru.json messages/en.json "src/app/[locale]/(dashboard)/assistants/[agentId]/calls"
git commit -m "feat(assistants): build Calls tab"
```

---

### Task 8: `knowledge` tab — move existing content, add settings

**Files:**
- Modify: `src/app/[locale]/(dashboard)/assistants/[agentId]/knowledge/page.tsx`
- Modify: `src/app/[locale]/(dashboard)/assistants/[agentId]/knowledge/actions.ts`
- Modify: `messages/uz.json`, `messages/ru.json`, `messages/en.json`

**Interfaces:**
- Consumes: `getOrCreateKnowledgeSettings` (Task 3), `parseKnowledgeSettingsInput` (Task 2), existing `uploadKnowledgeDocumentAction`.
- Produces: nothing new for other tasks — leaf route. (The route path `assistants/[agentId]/knowledge` is unchanged; it already sits correctly inside the new `layout.tsx` tab structure since it was already a sibling of `ai/`/`chats/`/`calls/` under `[agentId]/`.)

- [ ] **Step 1: Add `assistants.knowledge.settings` keys to `messages/uz.json`**

Inside the existing top-level `assistants.knowledge` object, add:

```json
"settingsTitle": "Asosiy sozlamalar",
"settingsSubtitle": "Embedding modeli va barcha bilim bazalari uchun standart qiymatlar",
"embeddingModelLabel": "Embedding modeli",
"relevanceThresholdLabel": "Standart moslik chegarasi (0-1)",
"maxResultsLabel": "Standart maksimal natijalar soni",
"searchContextTitle": "Qidiruv va kontekst",
"maxContextTokensLabel": "RAG konteksti uchun maksimal token soni",
"aggregationStrategyLabel": "Natijalarni birlashtirish strategiyasi",
"aggregationStrategyOptions": {
  "merge": "Birlashtirish (barcha bazalar natijalari qo'shiladi)",
  "priority": "Ustuvorlik (bazalar tartibi bo'yicha)"
},
"saveSettings": "Sozlamalarni saqlash"
```

- [ ] **Step 2: Add the same keys to `messages/ru.json`**

```json
"settingsTitle": "Основные настройки",
"settingsSubtitle": "Модель эмбеддинга и значения по умолчанию для всех баз знаний",
"embeddingModelLabel": "Модель эмбеддинга",
"relevanceThresholdLabel": "Порог релевантности по умолчанию (0-1)",
"maxResultsLabel": "Максимум результатов по умолчанию",
"searchContextTitle": "Поиск и контекст",
"maxContextTokensLabel": "Максимум токенов для RAG-контекста",
"aggregationStrategyLabel": "Стратегия объединения результатов",
"aggregationStrategyOptions": {
  "merge": "Объединение (результаты всех баз суммируются)",
  "priority": "Приоритет (по порядку баз)"
},
"saveSettings": "Сохранить настройки"
```

- [ ] **Step 3: Add the same keys to `messages/en.json`**

```json
"settingsTitle": "Basic settings",
"settingsSubtitle": "Embedding model and default values for all knowledge bases",
"embeddingModelLabel": "Embedding model",
"relevanceThresholdLabel": "Default relevance threshold (0-1)",
"maxResultsLabel": "Default maximum number of results",
"searchContextTitle": "Search and context",
"maxContextTokensLabel": "Maximum tokens for RAG context",
"aggregationStrategyLabel": "Result aggregation strategy",
"aggregationStrategyOptions": {
  "merge": "Merge (combines results from all stores)",
  "priority": "Priority (uses stores in order)"
},
"saveSettings": "Save settings"
```

- [ ] **Step 4: Run the key-parity test**

Run: `npm run test -- messages/messages.test.ts`
Expected: PASS.

- [ ] **Step 5: Rewrite `src/app/[locale]/(dashboard)/assistants/[agentId]/knowledge/page.tsx`**

```tsx
import { desc, eq } from "drizzle-orm";
import { getTranslations } from "next-intl/server";
import { db } from "@/db/client";
import { knowledgeDocuments } from "@/db/schema/knowledge";
import { requireAgent } from "@/lib/auth/dal";
import { getOrCreateKnowledgeSettings } from "@/lib/agents/settings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { uploadKnowledgeDocumentAction, updateKnowledgeSettingsAction } from "./actions";

export default async function KnowledgeBasePage({
  params,
}: {
  params: Promise<{ locale: string; agentId: string }>;
}) {
  const { locale, agentId } = await params;
  const { agent } = await requireAgent(locale, agentId);
  const t = await getTranslations("assistants.knowledge");
  const uploadAction = uploadKnowledgeDocumentAction.bind(null, locale, agent.id);
  const settingsAction = updateKnowledgeSettingsAction.bind(null, locale, agent.id);

  const [documents, settings] = await Promise.all([
    db
      .select()
      .from(knowledgeDocuments)
      .where(eq(knowledgeDocuments.agentId, agent.id))
      .orderBy(desc(knowledgeDocuments.createdAt)),
    getOrCreateKnowledgeSettings(agent.id),
  ]);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-6">
        <h1 className="text-xl font-semibold">{t("title")}</h1>
        <form action={uploadAction} className="flex items-center gap-2">
          <input type="file" name="file" accept=".txt,.md" required />
          <Button type="submit">{t("upload")}</Button>
        </form>
        {documents.length === 0 ? (
          <p className="text-muted-foreground">{t("empty")}</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {documents.map((document) => (
              <li key={document.id} className="flex items-center justify-between rounded-lg border p-3">
                <span>{document.filename}</span>
                <span className="text-muted-foreground text-sm">{t(`status.${document.status}`)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <form action={settingsAction} className="flex flex-col gap-6">
        <div className="flex flex-col gap-3 rounded-2xl border border-border p-5">
          <div>
            <h2 className="font-medium">{t("settingsTitle")}</h2>
            <p className="text-sm text-muted-foreground">{t("settingsSubtitle")}</p>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="embeddingModel">{t("embeddingModelLabel")}</Label>
            <Input id="embeddingModel" name="embeddingModel" defaultValue={settings.embeddingModel} />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="relevanceThreshold">{t("relevanceThresholdLabel")}</Label>
              <Input id="relevanceThreshold" name="relevanceThreshold" type="number" step="0.01" min={0} max={1} defaultValue={settings.relevanceThreshold} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="maxResults">{t("maxResultsLabel")}</Label>
              <Input id="maxResults" name="maxResults" type="number" min={1} max={50} defaultValue={settings.maxResults} />
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3 rounded-2xl border border-border p-5">
          <h2 className="font-medium">{t("searchContextTitle")}</h2>
          <div className="flex flex-col gap-2">
            <Label htmlFor="maxContextTokens">{t("maxContextTokensLabel")}</Label>
            <Input id="maxContextTokens" name="maxContextTokens" type="number" min={100} max={8000} defaultValue={settings.maxContextTokens} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="aggregationStrategy">{t("aggregationStrategyLabel")}</Label>
            <select id="aggregationStrategy" name="aggregationStrategy" defaultValue={settings.aggregationStrategy} className="border-input rounded-md border px-3 py-2">
              <option value="merge">{t("aggregationStrategyOptions.merge")}</option>
              <option value="priority">{t("aggregationStrategyOptions.priority")}</option>
            </select>
          </div>
        </div>

        <Button type="submit">{t("saveSettings")}</Button>
      </form>
    </div>
  );
}
```

- [ ] **Step 6: Add `updateKnowledgeSettingsAction` to `src/app/[locale]/(dashboard)/assistants/[agentId]/knowledge/actions.ts`**

Append to the existing file (keep `uploadKnowledgeDocumentAction` unchanged):

```ts
import { agentKnowledgeSettings } from "@/db/schema/agent-knowledge-settings";
import { getOrCreateKnowledgeSettings } from "@/lib/agents/settings";
import { parseKnowledgeSettingsInput } from "@/lib/agents/knowledge-settings-schema";

export async function updateKnowledgeSettingsAction(
  locale: string,
  agentId: string,
  formData: FormData,
): Promise<void> {
  const { agent } = await requireAgent(locale, agentId);
  const existing = await getOrCreateKnowledgeSettings(agent.id);

  const parsed = parseKnowledgeSettingsInput({
    embeddingModel: formData.get("embeddingModel"),
    relevanceThreshold: formData.get("relevanceThreshold"),
    maxResults: formData.get("maxResults"),
    maxContextTokens: formData.get("maxContextTokens"),
    aggregationStrategy: formData.get("aggregationStrategy"),
  });
  if (!parsed.success) return;

  await db
    .update(agentKnowledgeSettings)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(eq(agentKnowledgeSettings.id, existing.id));
  revalidatePath(`/${locale}/assistants/${agent.id}/knowledge`);
}
```

(`db`, `eq`, and `revalidatePath` are already imported at the top of the existing file — add the 3 new imports shown above alongside them, don't duplicate.)

- [ ] **Step 7: Type-check, lint, test**

Run: `npx tsc --noEmit && npm run lint && npm run test`
Expected: no errors, all tests pass.

- [ ] **Step 8: Manual verification**

Run: `npm run dev`, open `/uz/assistants/<id>/knowledge`, confirm the existing upload/list UI still works, then fill in the new settings form, save, reload, confirm persisted.

- [ ] **Step 9: Commit**

```bash
git add messages/uz.json messages/ru.json messages/en.json "src/app/[locale]/(dashboard)/assistants/[agentId]/knowledge"
git commit -m "feat(assistants): extend Knowledge bases tab with RAG settings"
```

---

### Task 9: E2E test, full verification, roadmap update

**Files:**
- Modify: `tests/e2e/assistants.spec.ts`
- Modify: `CLAUDE.md`

**Interfaces:**
- Consumes: nothing new.
- Produces: nothing — terminal task.

- [ ] **Step 1: Add tab-route redirect coverage to `tests/e2e/assistants.spec.ts`**

Replace the file with:

```ts
import { test, expect } from "@playwright/test";

test.describe("assistants (unauthenticated)", () => {
  test("redirects to sign-in from /assistants", async ({ page }) => {
    await page.goto("/uz/assistants");
    await expect(page).toHaveURL(/\/uz\/sign-in/);
  });

  test("redirects to sign-in from /approvals", async ({ page }) => {
    await page.goto("/uz/approvals");
    await expect(page).toHaveURL(/\/uz\/sign-in/);
  });

  test("redirects to sign-in from an assistant's ai tab", async ({ page }) => {
    await page.goto("/uz/assistants/some-agent-id/ai");
    await expect(page).toHaveURL(/\/uz\/sign-in/);
  });

  test("redirects to sign-in from an assistant's calls tab", async ({ page }) => {
    await page.goto("/uz/assistants/some-agent-id/calls");
    await expect(page).toHaveURL(/\/uz\/sign-in/);
  });
});
```

(Full authenticated tab-navigation-and-save coverage needs a signed-in Clerk session, which this repo's e2e suite doesn't set up for any existing route — consistent with the existing 2 tests, which only check the unauthenticated redirect. Deeper coverage is a pre-existing gap across the whole e2e suite, not something this task should newly solve.)

- [ ] **Step 2: Run e2e tests**

Run: `npm run test:e2e -- tests/e2e/assistants.spec.ts`
Expected: PASS (4 tests).

- [ ] **Step 3: Run the full verification suite**

Run: `npx tsc --noEmit && npm run lint && npm run test && npm run build`
Expected: no errors; build succeeds.

- [ ] **Step 4: Update `CLAUDE.md` roadmap**

In the "worken.ru bilan to'liq (birga-bir) parity dasturi" section, change:

```
- [ ] **D — `/assistants/:id` (Assistant tahrirlash) to'liq qurilishi**: AI/Chats/
      Calls/Knowledge-bases — 20+ sozlama bloki + haqiqiy SIP qo'ng'iroq siyosati UI'si
```

to:

```
- [x] **D — `/assistants/:id` (Assistant tahrirlash) to'liq qurilishi**: AI/Chats/
      Calls/Knowledge-bases tablari, 20+ sozlama bloki DB'ga saqlanadi. SIP/CRM/TTS
      talab qiladigan harakat tugmalari (masalan SIP konnektor tanlash) tashqi
      provayder ulanguncha disabled — spec/plan:
      `docs/superpowers/specs/2026-08-13-worken-parity-phase-d-assistant-editor-design.md`,
      `docs/superpowers/plans/2026-08-13-worken-parity-phase-d-assistant-editor.md`
```

- [ ] **Step 5: Commit**

```bash
git add tests/e2e/assistants.spec.ts CLAUDE.md
git commit -m "test(assistants): add tab-route redirect coverage; mark Phase D complete"
```

---

## Self-Review Notes

- **Spec coverage:** all 4 tabs, all listed setting blocks, the layout/header, and the route restructure from the spec are each covered by a task. The one deliberate deviation (`toolsMode` column dropped, `stopWordRules`/`escalationTriggerWords` simplified to textareas) is called out in Global Constraints, matching the spec's "simplification" allowance.
- **Type consistency:** `getOrCreateChatSettings`/`getOrCreateCallPolicy`/`getOrCreateKnowledgeSettings` (Task 3) are used with matching names in Tasks 6-8; `parseAiCoreSettingsInput`/`parseChatSettingsInput`/`parseCallPolicyInput`/`parseKnowledgeSettingsInput` (Task 2) are used with matching names and field lists in Tasks 5-8's `actions.ts` files.
- **Placeholder scan:** no TBD/TODO; every step has literal code or an exact translation-key block.
