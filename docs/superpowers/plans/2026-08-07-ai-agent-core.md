# AI agent yadrosi (Phase 3) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a signed-in user create an AI agent (rol + tizim prompti + model), upload
knowledge-base files, test it in an internal playground chat with retrieval, and route
low-confidence actions through a human-in-the-loop approvals queue.

**Architecture:** New Drizzle tables (`ai_agent`, `knowledge_document`, `knowledge_chunk`
with pgvector, `conversation`/`message`, `approval`) under `src/db/schema/`. New
`(dashboard)/assistants` and `(dashboard)/approvals` route trees reusing the existing
`requireOrganization()` auth pattern from `src/lib/auth/dal.ts`. Chat streams through a
Next.js Route Handler using the AI SDK (`streamText` + `useChat`), routed through Vercel
AI Gateway via plain `"provider/model"` strings — no provider SDKs, no manual API keys.

**Tech Stack:** `ai@7`, `@ai-sdk/react`, `@ai-sdk/gateway` (already installed), `@vercel/blob`
(already installed, private store `tayanchai-knowledge` already provisioned —
`BLOB_READ_WRITE_TOKEN` is in `.env.local`), Neon Postgres `pgvector` extension (already
enabled on the dev database), Drizzle ORM, Clerk (`auth()`/`currentUser()`), zod, vitest.

## Global Constraints

- All user-visible text ships in `uz` (default), `ru`, `en` — every task that adds UI
  must add matching keys to `messages/uz.json`, `messages/ru.json`, `messages/en.json`.
- Server-only modules (`src/lib/**`, `src/db/**` except `schema/*.ts` type files) start
  with `import "server-only";` — follow the existing pattern in `src/lib/auth/dal.ts`.
- New DB tables follow the existing style in `src/db/schema/org.ts`: `text("id")
  .primaryKey().$defaultFn(() => crypto.randomUUID())`, `timestamp(..., { mode: "date"
  }).notNull().defaultNow()`, FKs via `.references(() => table.column, { onDelete:
  "cascade" })`.
- Server actions are bound with `locale` as the first argument from the calling page,
  exactly like `src/app/[locale]/(auth)/onboarding/actions.ts` does — `const action =
  someAction.bind(null, locale)`.
- Auth/org context in Server Components comes from `requireOrganization(locale)` /
  `verifySession(locale)` in `src/lib/auth/dal.ts` — never call Clerk's `auth()` directly
  in a page; always go through the existing `dal.ts` helpers (add new ones there if a
  new shape is needed).
- Zod input validation follows `src/lib/org/schema.ts`'s `parse*Input` return-shape
  convention: `{ success: true; data } | { success: false; error }`.
- Knowledge-base file uploads are scoped to **`.txt` and `.md` only** in this phase —
  reliable text extraction without adding a PDF/DOCX parsing dependency. This is a
  scope reduction from the spec's "pdf/docx/txt" list, made during implementation; PDF
  support is a follow-up, not silently dropped from the roadmap.
- Cost estimation is a lightweight per-message figure (tokens × live AI Gateway
  pricing), not the Phase 2b credit/billing currency system.
- Run `npx tsc --noEmit`, `npx eslint .`, and `npx vitest run` after every task; all
  three must be clean before moving to the next task.

---

### Task 1: Database schema — agents, knowledge base, conversations, approvals

**Files:**
- Create: `src/db/schema/agents.ts`
- Create: `src/db/schema/knowledge.ts`
- Create: `src/db/schema/conversations.ts`
- Create: `src/db/schema/approvals.ts`
- Modify: `src/db/schema/index.ts`

**Interfaces:**
- Produces: `aiAgents`, `agentRole` (enum: `sales`/`support`/`hr`/`marketing`),
  `agentStatus` (enum: `draft`/`active`) from `agents.ts`; `knowledgeDocuments`,
  `documentStatus` (enum: `processing`/`ready`/`error`), `knowledgeChunks` from
  `knowledge.ts`; `conversations`, `conversationChannel` (enum: `playground`),
  `messages`, `messageRole` (enum: `user`/`assistant`/`system`) from
  `conversations.ts`; `approvals`, `approvalStatus` (enum: `pending`/`approved`/
  `rejected`/`auto_resolved`/`expired`) from `approvals.ts`. All later tasks import
  these directly, e.g. `import { aiAgents } from "@/db/schema/agents"`.

- [ ] **Step 1: Write `src/db/schema/agents.ts`**

```ts
import { pgTable, text, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { organizations } from "./org";

export const agentRole = pgEnum("agent_role", ["sales", "support", "hr", "marketing"]);
export const agentStatus = pgEnum("agent_status", ["draft", "active"]);

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
});
```

- [ ] **Step 2: Write `src/db/schema/knowledge.ts`**

```ts
import { pgTable, text, timestamp, pgEnum, vector, index } from "drizzle-orm/pg-core";
import { aiAgents } from "./agents";

export const documentStatus = pgEnum("knowledge_document_status", [
  "processing",
  "ready",
  "error",
]);

export const knowledgeDocuments = pgTable("knowledge_document", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  agentId: text("agentId")
    .notNull()
    .references(() => aiAgents.id, { onDelete: "cascade" }),
  blobUrl: text("blobUrl").notNull(),
  filename: text("filename").notNull(),
  mimeType: text("mimeType").notNull(),
  status: documentStatus("status").notNull().default("processing"),
  createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
});

export const knowledgeChunks = pgTable(
  "knowledge_chunk",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    documentId: text("documentId")
      .notNull()
      .references(() => knowledgeDocuments.id, { onDelete: "cascade" }),
    content: text("content").notNull(),
    // text-embedding-3-small (Task 3's EMBEDDING_MODEL) produces 1536-dim vectors.
    embedding: vector("embedding", { dimensions: 1536 }).notNull(),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    index("knowledge_chunk_embedding_idx").using(
      "hnsw",
      table.embedding.op("vector_cosine_ops"),
    ),
  ],
);
```

- [ ] **Step 3: Write `src/db/schema/conversations.ts`**

```ts
import { pgTable, text, timestamp, pgEnum, integer, doublePrecision } from "drizzle-orm/pg-core";
import { aiAgents } from "./agents";

export const conversationChannel = pgEnum("conversation_channel", ["playground"]);
export const messageRole = pgEnum("message_role", ["user", "assistant", "system"]);

export const conversations = pgTable("conversation", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  agentId: text("agentId")
    .notNull()
    .references(() => aiAgents.id, { onDelete: "cascade" }),
  channel: conversationChannel("channel").notNull().default("playground"),
  startedAt: timestamp("startedAt", { mode: "date" }).notNull().defaultNow(),
});

export const messages = pgTable("message", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  conversationId: text("conversationId")
    .notNull()
    .references(() => conversations.id, { onDelete: "cascade" }),
  role: messageRole("role").notNull(),
  content: text("content").notNull(),
  tokenCount: integer("tokenCount"),
  estimatedCostUsd: doublePrecision("estimatedCostUsd"),
  createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
});
```

- [ ] **Step 4: Write `src/db/schema/approvals.ts`**

```ts
import { pgTable, text, timestamp, pgEnum, jsonb } from "drizzle-orm/pg-core";
import { aiAgents } from "./agents";
import { conversations } from "./conversations";

export const approvalStatus = pgEnum("approval_status", [
  "pending",
  "approved",
  "rejected",
  "auto_resolved",
  "expired",
]);

export const approvals = pgTable("approval", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  agentId: text("agentId")
    .notNull()
    .references(() => aiAgents.id, { onDelete: "cascade" }),
  conversationId: text("conversationId").references(() => conversations.id, {
    onDelete: "cascade",
  }),
  type: text("type").notNull(),
  payload: jsonb("payload").notNull(),
  status: approvalStatus("status").notNull().default("pending"),
  createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
  resolvedAt: timestamp("resolvedAt", { mode: "date" }),
  resolvedByUserId: text("resolvedByUserId"),
});
```

- [ ] **Step 5: Update `src/db/schema/index.ts`**

```ts
export * from "./org";
export * from "./agents";
export * from "./knowledge";
export * from "./conversations";
export * from "./approvals";
```

- [ ] **Step 6: Push schema to the dev database**

```bash
export DATABASE_URL=$(node -e "require('dotenv').config({path:'.env.local'}); console.log(process.env.DATABASE_URL)" | tail -1)
npx drizzle-kit push
```
When prompted about the new `knowledge_chunk_embedding_idx` index or enum creation,
accept (these are additive — no existing data is touched).

- [ ] **Step 7: Verify the tables exist**

```bash
node -e "
const { neon } = require('@neondatabase/serverless');
const sql = neon(process.env.DATABASE_URL);
sql\`SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename\`
  .then(r => console.log(r))
  .catch(e => { console.error(e); process.exit(1); });
"
```
Expected: includes `ai_agent`, `knowledge_document`, `knowledge_chunk`, `conversation`,
`message`, `approval` alongside the existing `organization`/`membership`/`invite`.

- [ ] **Step 8: Typecheck and commit**

```bash
npx tsc --noEmit
git add src/db/schema/
git commit -m "feat(db): add ai_agent, knowledge base, conversation, and approval tables"
```

---

### Task 2: Agent input validation and industry role templates

**Files:**
- Create: `src/lib/agents/schema.ts`
- Create: `src/lib/agents/schema.test.ts`
- Create: `src/lib/agents/templates.ts`

**Interfaces:**
- Consumes: nothing new.
- Produces: `AGENT_ROLES` (readonly tuple), `AgentInput` type, `parseAgentInput(input:
  unknown): { success: true; data: AgentInput } | { success: false; error: string }`
  from `schema.ts` — Task 4's wizard action calls this. `getSystemPromptTemplate(role:
  (typeof AGENT_ROLES)[number], organizationName: string): string` from `templates.ts` —
  Task 5's wizard page calls this to prefill the system-prompt textarea.

- [ ] **Step 1: Write the failing test for `parseAgentInput`**

```ts
// src/lib/agents/schema.test.ts
import { describe, expect, it } from "vitest";
import { parseAgentInput } from "./schema";

describe("parseAgentInput", () => {
  it("accepts a valid agent", () => {
    const result = parseAgentInput({
      name: "Sotuv boti",
      role: "sales",
      systemPrompt: "Siz TayanchAI mijozlariga yordam beruvchi sotuv assistentisiz.",
      model: "anthropic/claude-sonnet-4.5",
    });
    expect(result.success).toBe(true);
  });

  it("rejects an unknown role", () => {
    const result = parseAgentInput({
      name: "Bot",
      role: "not-a-real-role",
      systemPrompt: "Yetarlicha uzun tizim prompti bu yerda.",
      model: "anthropic/claude-sonnet-4.5",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a too-short system prompt", () => {
    const result = parseAgentInput({
      name: "Bot",
      role: "sales",
      systemPrompt: "qisqa",
      model: "anthropic/claude-sonnet-4.5",
    });
    expect(result.success).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/agents/schema.test.ts`
Expected: FAIL — `Cannot find module './schema'`

- [ ] **Step 3: Write `src/lib/agents/schema.ts`**

```ts
import "server-only";
import { z } from "zod";

export const AGENT_ROLES = ["sales", "support", "hr", "marketing"] as const;

const agentSchema = z.object({
  name: z.string().trim().min(2).max(100),
  role: z.enum(AGENT_ROLES),
  systemPrompt: z.string().trim().min(10).max(4000),
  model: z.string().trim().min(1),
});

export type AgentInput = z.infer<typeof agentSchema>;

export function parseAgentInput(
  input: unknown,
): { success: true; data: AgentInput } | { success: false; error: string } {
  const result = agentSchema.safeParse(input);
  if (!result.success) {
    return { success: false, error: result.error.issues[0]?.message ?? "Invalid input" };
  }
  return { success: true, data: result.data };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/agents/schema.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: Write `src/lib/agents/templates.ts`**

```ts
import "server-only";
import type { AGENT_ROLES } from "./schema";

type AgentRole = (typeof AGENT_ROLES)[number];

const ROLE_TEMPLATES: Record<AgentRole, (orgName: string) => string> = {
  sales: (orgName) =>
    `Siz ${orgName} kompaniyasining sotuv assistentisiz. Mijozlarning savollariga ` +
    `mahsulot/xizmatlar haqida javob bering, ehtiyojlarini aniqlang va keyingi qadam ` +
    `sifatida konsultatsiya yoki xarid taklif qiling. Ishonchli bo'lmagan holatlarda ` +
    `insonga topshiring.`,
  support: (orgName) =>
    `Siz ${orgName} kompaniyasining qo'llab-quvvatlash assistentisiz. Mijozlarning ` +
    `muammolarini tinglang, bilim bazasidan foydalanib yechim taklif qiling. Agar ` +
    `masala murakkab yoki bilim bazasida yo'q bo'lsa, insonga topshiring.`,
  hr: (orgName) =>
    `Siz ${orgName} kompaniyasining HR assistentisiz. Nomzodlarning arizalarini qayta ` +
    `ishlang, savollariga javob bering va birlamchi skrining savollarini bering. ` +
    `Yakuniy qarorlarni doim insonga qoldiring.`,
  marketing: (orgName) =>
    `Siz ${orgName} kompaniyasining marketing assistentisiz. Lidlar bilan muloqot ` +
    `qiling, kompaniya haqida savollarga javob bering va qiziqish bildirganlarni ` +
    `sotuv jamoasiga yo'naltiring.`,
};

export function getSystemPromptTemplate(role: AgentRole, organizationName: string): string {
  return ROLE_TEMPLATES[role](organizationName);
}
```

- [ ] **Step 6: Typecheck, lint, and commit**

```bash
npx tsc --noEmit && npx eslint src/lib/agents/
git add src/lib/agents/
git commit -m "feat(agents): add agent input validation and role prompt templates"
```

---

### Task 3: AI Gateway model list and cost estimation

**Files:**
- Create: `src/lib/ai/gateway.ts`
- Create: `src/lib/ai/gateway.test.ts`

**Interfaces:**
- Produces: `GatewayModel` type (`{ id: string; name: string; pricing?: { input:
  string; output: string } }`), `listAvailableModels(): Promise<GatewayModel[]>`,
  `estimateCostUsd(models: GatewayModel[], modelId: string, usage: { inputTokens?:
  number; outputTokens?: number }): number | null`, `DEFAULT_MODEL: string`,
  `EMBEDDING_MODEL: string`. Task 5 (wizard) calls `listAvailableModels()` and
  `DEFAULT_MODEL`. Task 6 (knowledge embed) and Task 7 (chat route) call
  `EMBEDDING_MODEL`. Task 7 also calls `listAvailableModels()` + `estimateCostUsd()`.

- [ ] **Step 1: Write the failing test for `estimateCostUsd`**

```ts
// src/lib/ai/gateway.test.ts
import { describe, expect, it } from "vitest";
import { estimateCostUsd, type GatewayModel } from "./gateway";

describe("estimateCostUsd", () => {
  const models: GatewayModel[] = [
    { id: "anthropic/claude-sonnet-4.5", name: "Claude Sonnet 4.5", pricing: { input: "0.000003", output: "0.000015" } },
    { id: "openai/gpt-5.4", name: "GPT-5.4" },
  ];

  it("computes cost from input/output token pricing", () => {
    const cost = estimateCostUsd(models, "anthropic/claude-sonnet-4.5", {
      inputTokens: 1000,
      outputTokens: 500,
    });
    expect(cost).toBeCloseTo(1000 * 0.000003 + 500 * 0.000015, 10);
  });

  it("returns null when the model has no pricing info", () => {
    const cost = estimateCostUsd(models, "openai/gpt-5.4", { inputTokens: 100, outputTokens: 50 });
    expect(cost).toBeNull();
  });

  it("returns null for an unknown model id", () => {
    const cost = estimateCostUsd(models, "unknown/model", { inputTokens: 100, outputTokens: 50 });
    expect(cost).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/ai/gateway.test.ts`
Expected: FAIL — `Cannot find module './gateway'`

- [ ] **Step 3: Write `src/lib/ai/gateway.ts`**

```ts
import "server-only";
import { gateway } from "ai";

export type GatewayModel = {
  id: string;
  name: string;
  pricing?: { input: string; output: string };
};

const FALLBACK_MODELS: GatewayModel[] = [
  { id: "anthropic/claude-sonnet-4.5", name: "Claude Sonnet 4.5" },
  { id: "openai/gpt-5.4", name: "GPT-5.4" },
];

export const DEFAULT_MODEL = "anthropic/claude-sonnet-4.5";
export const EMBEDDING_MODEL = "openai/text-embedding-3-small";

export async function listAvailableModels(): Promise<GatewayModel[]> {
  try {
    const { models } = await gateway.getAvailableModels();
    return models.map((model) => ({
      id: model.id,
      name: model.name,
      pricing: model.pricing
        ? { input: model.pricing.input, output: model.pricing.output }
        : undefined,
    }));
  } catch (error) {
    console.error("Failed to fetch AI Gateway models, using fallback list", error);
    return FALLBACK_MODELS;
  }
}

export function estimateCostUsd(
  models: GatewayModel[],
  modelId: string,
  usage: { inputTokens?: number; outputTokens?: number },
): number | null {
  const model = models.find((candidate) => candidate.id === modelId);
  if (!model?.pricing) return null;
  const inputCost = (usage.inputTokens ?? 0) * Number(model.pricing.input);
  const outputCost = (usage.outputTokens ?? 0) * Number(model.pricing.output);
  return inputCost + outputCost;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/ai/gateway.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: Typecheck, lint, and commit**

```bash
npx tsc --noEmit && npx eslint src/lib/ai/
git add src/lib/ai/gateway.ts src/lib/ai/gateway.test.ts
git commit -m "feat(ai): add AI Gateway model list and cost estimation helper"
```

---

### Task 4: Knowledge base chunking and embedding pipeline

**Files:**
- Create: `src/lib/ai/knowledge-embed.ts`
- Create: `src/lib/ai/knowledge-embed.test.ts`

**Interfaces:**
- Consumes: `EMBEDDING_MODEL` from `src/lib/ai/gateway.ts` (Task 3); `knowledgeDocuments`,
  `knowledgeChunks` from `src/db/schema/knowledge.ts` (Task 1); `db` from
  `src/db/client.ts`.
- Produces: `splitIntoChunks(text: string): string[]` (pure, unit-tested directly);
  `embedDocument(documentId: string, text: string): Promise<void>` — Task 8's upload
  action calls this after inserting the `knowledge_document` row.

- [ ] **Step 1: Write the failing test for `splitIntoChunks`**

```ts
// src/lib/ai/knowledge-embed.test.ts
import { describe, expect, it } from "vitest";
import { splitIntoChunks } from "./knowledge-embed";

describe("splitIntoChunks", () => {
  it("returns an empty array for blank input", () => {
    expect(splitIntoChunks("   \n  ")).toEqual([]);
  });

  it("returns a single chunk for short text", () => {
    const chunks = splitIntoChunks("Qisqa matn.");
    expect(chunks).toEqual(["Qisqa matn."]);
  });

  it("splits long text into multiple overlapping chunks", () => {
    const longText = "a".repeat(2000);
    const chunks = splitIntoChunks(longText);
    expect(chunks.length).toBeGreaterThan(1);
    for (const chunk of chunks) {
      expect(chunk.length).toBeLessThanOrEqual(800);
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/ai/knowledge-embed.test.ts`
Expected: FAIL — `Cannot find module './knowledge-embed'`

- [ ] **Step 3: Write `src/lib/ai/knowledge-embed.ts`**

```ts
import "server-only";
import { embedMany } from "ai";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { knowledgeDocuments, knowledgeChunks } from "@/db/schema/knowledge";
import { EMBEDDING_MODEL } from "./gateway";

const CHUNK_SIZE = 800;
const CHUNK_OVERLAP = 100;

export function splitIntoChunks(text: string): string[] {
  const cleaned = text.replace(/\r\n/g, "\n").trim();
  if (!cleaned) return [];

  const chunks: string[] = [];
  let start = 0;
  while (start < cleaned.length) {
    const end = Math.min(start + CHUNK_SIZE, cleaned.length);
    const chunk = cleaned.slice(start, end).trim();
    if (chunk.length > 0) chunks.push(chunk);
    if (end === cleaned.length) break;
    start = end - CHUNK_OVERLAP;
  }
  return chunks;
}

export async function embedDocument(documentId: string, text: string): Promise<void> {
  const chunks = splitIntoChunks(text);
  if (chunks.length === 0) {
    await db
      .update(knowledgeDocuments)
      .set({ status: "error" })
      .where(eq(knowledgeDocuments.id, documentId));
    return;
  }

  try {
    const { embeddings } = await embedMany({ model: EMBEDDING_MODEL, values: chunks });
    await db.insert(knowledgeChunks).values(
      chunks.map((content, index) => ({
        documentId,
        content,
        embedding: embeddings[index]!,
      })),
    );
    await db
      .update(knowledgeDocuments)
      .set({ status: "ready" })
      .where(eq(knowledgeDocuments.id, documentId));
  } catch (error) {
    console.error(`Embedding failed for knowledge document ${documentId}`, error);
    await db
      .update(knowledgeDocuments)
      .set({ status: "error" })
      .where(eq(knowledgeDocuments.id, documentId));
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/ai/knowledge-embed.test.ts`
Expected: PASS (3 tests) — `embedDocument` isn't exercised by this test (it hits the
real network), which is intentional; Task 8 covers it with an integration-style check.

- [ ] **Step 5: Write `src/lib/ai/retrieval.ts`**

```ts
import "server-only";
import { cosineDistance, desc, eq, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { knowledgeChunks, knowledgeDocuments } from "@/db/schema/knowledge";

export async function retrieveRelevantChunks(
  agentId: string,
  queryEmbedding: number[],
  limit = 5,
): Promise<string[]> {
  const similarity = sql<number>`1 - (${cosineDistance(knowledgeChunks.embedding, queryEmbedding)})`;
  const rows = await db
    .select({ content: knowledgeChunks.content, similarity })
    .from(knowledgeChunks)
    .innerJoin(knowledgeDocuments, eq(knowledgeChunks.documentId, knowledgeDocuments.id))
    .where(eq(knowledgeDocuments.agentId, agentId))
    .orderBy((t) => desc(t.similarity))
    .limit(limit);
  return rows.map((row) => row.content);
}
```

- [ ] **Step 6: Typecheck, lint, and commit**

```bash
npx tsc --noEmit && npx eslint src/lib/ai/
git add src/lib/ai/knowledge-embed.ts src/lib/ai/knowledge-embed.test.ts src/lib/ai/retrieval.ts
git commit -m "feat(ai): add knowledge chunking, embedding pipeline, and retrieval"
```

---

### Task 5: Agent list, create action, and DAL helper

**Files:**
- Create: `src/app/[locale]/(dashboard)/assistants/page.tsx`
- Create: `src/app/[locale]/(dashboard)/assistants/actions.ts`
- Modify: `src/lib/auth/dal.ts`
- Modify: `messages/uz.json`, `messages/ru.json`, `messages/en.json`

**Interfaces:**
- Consumes: `requireOrganization` from `src/lib/auth/dal.ts` (existing); `aiAgents` from
  `src/db/schema/agents.ts` (Task 1); `parseAgentInput`, `AGENT_ROLES` from
  `src/lib/agents/schema.ts` (Task 2); `DEFAULT_MODEL` from `src/lib/ai/gateway.ts`
  (Task 3).
- Produces: `requireAgent(locale: string, agentId: string): Promise<{ user, organization,
  membership, agent }>` added to `dal.ts` — Tasks 6, 7, 8, 9 all use this to load an
  agent scoped to the caller's organization (returns 404 via `notFound()` if the agent
  doesn't belong to the org). `createAgentAction(locale: string, formData: FormData):
  Promise<void>` in `assistants/actions.ts` — Task 6's wizard page binds and calls this.

- [ ] **Step 1: Add `requireAgent` to `src/lib/auth/dal.ts`**

Append to the existing file (keep all current exports untouched):

```ts
import { notFound } from "next/navigation";
import { aiAgents } from "@/db/schema/agents";

export async function requireAgent(locale: string, agentId: string) {
  const context = await requireOrganization(locale);
  const [agent] = await db
    .select()
    .from(aiAgents)
    .where(eq(aiAgents.id, agentId));

  if (!agent || agent.organizationId !== context.organization.id) {
    notFound();
  }
  return { ...context, agent: agent! };
}
```

Add `import { eq } from "drizzle-orm";` and `import { aiAgents } from "@/db/schema/agents";`
to the existing import block at the top of the file alongside the current imports (don't
duplicate `eq` if drizzle-orm is already imported — check the existing import line first).

- [ ] **Step 2: Write `src/app/[locale]/(dashboard)/assistants/actions.ts`**

```ts
"use server";

import { redirect } from "next/navigation";
import { db } from "@/db/client";
import { aiAgents } from "@/db/schema/agents";
import { requireOrganization } from "@/lib/auth/dal";
import { parseAgentInput } from "@/lib/agents/schema";

export async function createAgentAction(locale: string, formData: FormData): Promise<void> {
  const { organization } = await requireOrganization(locale);
  const parsed = parseAgentInput({
    name: formData.get("name"),
    role: formData.get("role"),
    systemPrompt: formData.get("systemPrompt"),
    model: formData.get("model"),
  });
  if (!parsed.success) {
    redirect(`/${locale}/assistants/new?error=${encodeURIComponent(parsed.error)}`);
  }

  const [agent] = await db
    .insert(aiAgents)
    .values({ ...parsed.data, organizationId: organization.id })
    .returning();

  redirect(`/${locale}/assistants/${agent!.id}`);
}
```

- [ ] **Step 3: Write `src/app/[locale]/(dashboard)/assistants/page.tsx`**

```tsx
import { eq } from "drizzle-orm";
import { getTranslations } from "next-intl/server";
import { db } from "@/db/client";
import { aiAgents } from "@/db/schema/agents";
import { requireOrganization } from "@/lib/auth/dal";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";

export default async function AssistantsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const { organization } = await requireOrganization(locale);
  const t = await getTranslations("assistants");

  const agents = await db
    .select()
    .from(aiAgents)
    .where(eq(aiAgents.organizationId, organization.id));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">{t("title")}</h1>
        <Button nativeButton={false} render={<Link href="/assistants/new">{t("create")}</Link>} />
      </div>
      {agents.length === 0 ? (
        <p className="text-muted-foreground">{t("empty")}</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {agents.map((agent) => (
            <Card key={agent.id}>
              <CardHeader>
                <CardTitle>
                  <Link href={`/assistants/${agent.id}`}>{agent.name}</Link>
                </CardTitle>
                <p className="text-muted-foreground text-sm">{t(`roles.${agent.role}`)}</p>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Add translations**

Add to `messages/uz.json` (top level, alongside `settings`/`dashboard`):

```json
"assistants": {
  "title": "AI Xodimlar",
  "create": "Yaratish",
  "empty": "Hali AI xodim yo'q.",
  "roles": {
    "sales": "Sotuv",
    "support": "Qo'llab-quvvatlash",
    "hr": "HR",
    "marketing": "Marketing"
  }
}
```

Add to `messages/ru.json`:

```json
"assistants": {
  "title": "AI сотрудники",
  "create": "Создать",
  "empty": "Пока нет AI сотрудников.",
  "roles": {
    "sales": "Продажи",
    "support": "Поддержка",
    "hr": "HR",
    "marketing": "Маркетинг"
  }
}
```

Add to `messages/en.json`:

```json
"assistants": {
  "title": "AI Employees",
  "create": "Create",
  "empty": "No AI employees yet.",
  "roles": {
    "sales": "Sales",
    "support": "Support",
    "hr": "HR",
    "marketing": "Marketing"
  }
}
```

Insert each block as a new top-level key using `Edit`, matching the existing indentation
in each file (2 spaces) — insert alphabetically isn't required, just keep valid JSON.

- [ ] **Step 5: Typecheck and verify empty state manually**

```bash
npx tsc --noEmit
```
Then start the dev server (`npm run dev`), sign in, and visit `/uz/assistants` — expect
"Hali AI xodim yo'q." and a "Yaratish" button (the button's target, `/assistants/new`,
doesn't exist until Task 6 — a 404 there is expected for now).

- [ ] **Step 6: Commit**

```bash
git add src/app/\[locale\]/\(dashboard\)/assistants/ src/lib/auth/dal.ts messages/
git commit -m "feat(assistants): add agent list page, create action, and requireAgent helper"
```

---

### Task 6: Agent creation wizard

**Files:**
- Create: `src/app/[locale]/(dashboard)/assistants/new/page.tsx`
- Modify: `messages/uz.json`, `messages/ru.json`, `messages/en.json`

**Interfaces:**
- Consumes: `requireOrganization` (`dal.ts`), `AGENT_ROLES` (`src/lib/agents/schema.ts`),
  `getSystemPromptTemplate` (`src/lib/agents/templates.ts`), `listAvailableModels`,
  `DEFAULT_MODEL` (`src/lib/ai/gateway.ts`), `createAgentAction`
  (`assistants/actions.ts`, Task 5).
- Produces: nothing new consumed by later tasks (leaf page).

- [ ] **Step 1: Write `src/app/[locale]/(dashboard)/assistants/new/page.tsx`**

```tsx
import { getTranslations } from "next-intl/server";
import { requireOrganization } from "@/lib/auth/dal";
import { AGENT_ROLES } from "@/lib/agents/schema";
import { getSystemPromptTemplate } from "@/lib/agents/templates";
import { listAvailableModels, DEFAULT_MODEL } from "@/lib/ai/gateway";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createAgentAction } from "../actions";

export default async function NewAssistantPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { locale } = await params;
  const { error } = await searchParams;
  const { organization } = await requireOrganization(locale);
  const t = await getTranslations("assistants.new");
  const models = await listAvailableModels();
  const action = createAgentAction.bind(null, locale);
  const defaultRole = AGENT_ROLES[0];

  return (
    <main className="mx-auto flex max-w-lg flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold">{t("title")}</h1>
        <p className="text-muted-foreground">{t("subtitle")}</p>
      </div>
      {error && <p className="text-destructive text-sm">{error}</p>}
      <form action={action} className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="name">{t("nameLabel")}</Label>
          <Input id="name" name="name" required minLength={2} maxLength={100} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="role">{t("roleLabel")}</Label>
          <select
            id="role"
            name="role"
            required
            defaultValue={defaultRole}
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
            defaultValue={getSystemPromptTemplate(defaultRole, organization.name)}
            className="border-input rounded-md border px-3 py-2"
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="model">{t("modelLabel")}</Label>
          <select
            id="model"
            name="model"
            required
            defaultValue={DEFAULT_MODEL}
            className="border-input rounded-md border px-3 py-2"
          >
            {models.map((model) => (
              <option key={model.id} value={model.id}>
                {model.name}
              </option>
            ))}
          </select>
        </div>
        <Button type="submit">{t("submit")}</Button>
      </form>
    </main>
  );
}
```

Note: the system-prompt textarea's `defaultValue` is fixed to `defaultRole`'s template
on first render — switching the role `<select>` client-side won't re-template the
textarea in this phase (that would require a client component). Users can freely edit
the textarea regardless. This is an accepted scope reduction, not a bug.

- [ ] **Step 2: Add translations**

Add under the `assistants` key added in Task 5 (as a nested `new` object) in all three
`messages/*.json` files:

`messages/uz.json`:
```json
"new": {
  "title": "Yangi AI xodim",
  "subtitle": "Rol, tizim prompti va modelni tanlang",
  "nameLabel": "Nomi",
  "roleLabel": "Rol",
  "systemPromptLabel": "Tizim prompti",
  "modelLabel": "Model",
  "submit": "Yaratish",
  "roles": {
    "sales": "Sotuv",
    "support": "Qo'llab-quvvatlash",
    "hr": "HR",
    "marketing": "Marketing"
  }
}
```

`messages/ru.json`:
```json
"new": {
  "title": "Новый AI сотрудник",
  "subtitle": "Выберите роль, системный промпт и модель",
  "nameLabel": "Название",
  "roleLabel": "Роль",
  "systemPromptLabel": "Системный промпт",
  "modelLabel": "Модель",
  "submit": "Создать",
  "roles": {
    "sales": "Продажи",
    "support": "Поддержка",
    "hr": "HR",
    "marketing": "Маркетинг"
  }
}
```

`messages/en.json`:
```json
"new": {
  "title": "New AI employee",
  "subtitle": "Choose a role, system prompt, and model",
  "nameLabel": "Name",
  "roleLabel": "Role",
  "systemPromptLabel": "System prompt",
  "modelLabel": "Model",
  "submit": "Create",
  "roles": {
    "sales": "Sales",
    "support": "Support",
    "hr": "HR",
    "marketing": "Marketing"
  }
}
```

- [ ] **Step 3: Manual verification**

Start the dev server, sign in, go to `/uz/assistants/new`, fill the form, submit.
Expected: redirected to `/uz/assistants/<id>` (404 is fine — Task 7 adds that page next).
Confirm a row now exists: query `select * from ai_agent` via the same `node -e` pattern
used in Task 1 Step 7.

- [ ] **Step 4: Typecheck, lint, and commit**

```bash
npx tsc --noEmit && npx eslint src/app/\[locale\]/\(dashboard\)/assistants/
git add src/app/\[locale\]/\(dashboard\)/assistants/new/ messages/
git commit -m "feat(assistants): add agent creation wizard"
```

---

### Task 7: Agent settings page with placeholder Tools panel

**Files:**
- Create: `src/app/[locale]/(dashboard)/assistants/[agentId]/page.tsx`
- Create: `src/app/[locale]/(dashboard)/assistants/[agentId]/actions.ts`
- Create: `src/components/dashboard/tools-panel.tsx`
- Modify: `messages/uz.json`, `messages/ru.json`, `messages/en.json`

**Interfaces:**
- Consumes: `requireAgent` from `src/lib/auth/dal.ts` (Task 5); `parseAgentInput` from
  `src/lib/agents/schema.ts` (Task 2); `listAvailableModels` from `src/lib/ai/gateway.ts`
  (Task 3).
- Produces: `<ToolsPanel />` component (no props) — reused as-is, no other task depends
  on it structurally.

- [ ] **Step 1: Write `src/components/dashboard/tools-panel.tsx`**

```tsx
import { getTranslations } from "next-intl/server";
import { Badge } from "@/components/ui/badge";

const TOOL_GROUPS = ["internalSystem", "googleSheets", "github"] as const;

export async function ToolsPanel() {
  const t = await getTranslations("assistants.detail.tools");
  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-sm font-medium text-muted-foreground">{t("title")}</h2>
      <div className="flex flex-col gap-2">
        {TOOL_GROUPS.map((group) => (
          <div
            key={group}
            className="flex items-center justify-between rounded-lg border border-dashed p-3 opacity-60"
          >
            <span>{t(`groups.${group}`)}</span>
            <Badge variant="secondary">{t("comingSoon")}</Badge>
          </div>
        ))}
      </div>
    </div>
  );
}
```

`Badge`'s `variant` prop accepts `"default" | "secondary" | "destructive" | "outline" |
"ghost" | "link"` (see `src/components/ui/badge.tsx`) — `"secondary"` above is valid.

- [ ] **Step 2: Write `src/app/[locale]/(dashboard)/assistants/[agentId]/actions.ts`**

```ts
"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { aiAgents } from "@/db/schema/agents";
import { requireAgent } from "@/lib/auth/dal";
import { parseAgentInput } from "@/lib/agents/schema";

export async function updateAgentAction(
  locale: string,
  agentId: string,
  formData: FormData,
): Promise<void> {
  const { agent } = await requireAgent(locale, agentId);
  const parsed = parseAgentInput({
    name: formData.get("name"),
    role: formData.get("role"),
    systemPrompt: formData.get("systemPrompt"),
    model: formData.get("model"),
  });
  if (!parsed.success) return;

  await db.update(aiAgents).set(parsed.data).where(eq(aiAgents.id, agent.id));
  revalidatePath(`/${locale}/assistants/${agent.id}`);
}
```

- [ ] **Step 3: Write `src/app/[locale]/(dashboard)/assistants/[agentId]/page.tsx`**

```tsx
import { getTranslations } from "next-intl/server";
import { requireAgent } from "@/lib/auth/dal";
import { AGENT_ROLES } from "@/lib/agents/schema";
import { listAvailableModels } from "@/lib/ai/gateway";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ToolsPanel } from "@/components/dashboard/tools-panel";
import { updateAgentAction } from "./actions";

export default async function AssistantDetailPage({
  params,
}: {
  params: Promise<{ locale: string; agentId: string }>;
}) {
  const { locale, agentId } = await params;
  const { agent } = await requireAgent(locale, agentId);
  const t = await getTranslations("assistants.detail");
  const models = await listAvailableModels();
  const action = updateAgentAction.bind(null, locale, agent.id);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">{agent.name}</h1>
        <Button
          variant="outline"
          nativeButton={false}
          render={<Link href={`/assistants/${agent.id}/knowledge`}>{t("knowledgeLink")}</Link>}
        />
        <Button nativeButton={false} render={<Link href={`/assistants/${agent.id}/chat`}>{t("chatLink")}</Link>} />
      </div>
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
        <Button type="submit">{t("save")}</Button>
      </form>
      <ToolsPanel />
    </div>
  );
}
```

- [ ] **Step 4: Add translations**

Add nested under `assistants` (as `detail`) in all three files.

`messages/uz.json`:
```json
"detail": {
  "nameLabel": "Nomi",
  "roleLabel": "Rol",
  "systemPromptLabel": "Tizim prompti",
  "modelLabel": "Model",
  "save": "Saqlash",
  "knowledgeLink": "Bilim bazasi",
  "chatLink": "Sinash",
  "roles": {
    "sales": "Sotuv",
    "support": "Qo'llab-quvvatlash",
    "hr": "HR",
    "marketing": "Marketing"
  },
  "tools": {
    "title": "Integratsiyalar (Tools)",
    "comingSoon": "Tez orada",
    "groups": {
      "internalSystem": "Ichki tizim",
      "googleSheets": "Google Sheets/Drive",
      "github": "GitHub"
    }
  }
}
```

`messages/ru.json`:
```json
"detail": {
  "nameLabel": "Название",
  "roleLabel": "Роль",
  "systemPromptLabel": "Системный промпт",
  "modelLabel": "Модель",
  "save": "Сохранить",
  "knowledgeLink": "База знаний",
  "chatLink": "Проверить",
  "roles": {
    "sales": "Продажи",
    "support": "Поддержка",
    "hr": "HR",
    "marketing": "Маркетинг"
  },
  "tools": {
    "title": "Интеграции (Tools)",
    "comingSoon": "Скоро",
    "groups": {
      "internalSystem": "Внутренняя система",
      "googleSheets": "Google Sheets/Drive",
      "github": "GitHub"
    }
  }
}
```

`messages/en.json`:
```json
"detail": {
  "nameLabel": "Name",
  "roleLabel": "Role",
  "systemPromptLabel": "System prompt",
  "modelLabel": "Model",
  "save": "Save",
  "knowledgeLink": "Knowledge base",
  "chatLink": "Try it",
  "roles": {
    "sales": "Sales",
    "support": "Support",
    "hr": "HR",
    "marketing": "Marketing"
  },
  "tools": {
    "title": "Integrations (Tools)",
    "comingSoon": "Coming soon",
    "groups": {
      "internalSystem": "Internal system",
      "googleSheets": "Google Sheets/Drive",
      "github": "GitHub"
    }
  }
}
```

- [ ] **Step 5: Manual verification**

Visit `/uz/assistants/<id>` for the agent created in Task 6. Expect the form prefilled
with its data, the Tools panel showing 3 disabled rows, and Save persisting an edit
(reload the page to confirm the new name/prompt/model stuck).

- [ ] **Step 6: Typecheck, lint, and commit**

```bash
npx tsc --noEmit && npx eslint src/app/\[locale\]/\(dashboard\)/assistants/ src/components/dashboard/tools-panel.tsx
git add src/app/\[locale\]/\(dashboard\)/assistants/\[agentId\]/page.tsx src/app/\[locale\]/\(dashboard\)/assistants/\[agentId\]/actions.ts src/components/dashboard/tools-panel.tsx messages/
git commit -m "feat(assistants): add agent settings page and placeholder Tools panel"
```

---

### Task 8: Knowledge base upload and file list

**Files:**
- Create: `src/app/[locale]/(dashboard)/assistants/[agentId]/knowledge/page.tsx`
- Create: `src/app/[locale]/(dashboard)/assistants/[agentId]/knowledge/actions.ts`
- Modify: `messages/uz.json`, `messages/ru.json`, `messages/en.json`

**Interfaces:**
- Consumes: `requireAgent` (`dal.ts`, Task 5); `embedDocument` (`src/lib/ai/
  knowledge-embed.ts`, Task 4); `knowledgeDocuments` (`src/db/schema/knowledge.ts`,
  Task 1); `put` from `@vercel/blob`.
- Produces: nothing consumed by later tasks (leaf page).

- [ ] **Step 1: Write `src/app/[locale]/(dashboard)/assistants/[agentId]/knowledge/actions.ts`**

```ts
"use server";

import { revalidatePath } from "next/cache";
import { put } from "@vercel/blob";
import { db } from "@/db/client";
import { knowledgeDocuments } from "@/db/schema/knowledge";
import { requireAgent } from "@/lib/auth/dal";
import { embedDocument } from "@/lib/ai/knowledge-embed";

const ALLOWED_EXTENSIONS = [".txt", ".md"];

export async function uploadKnowledgeDocumentAction(
  locale: string,
  agentId: string,
  formData: FormData,
): Promise<void> {
  const { agent } = await requireAgent(locale, agentId);
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return;

  const hasAllowedExtension = ALLOWED_EXTENSIONS.some((ext) =>
    file.name.toLowerCase().endsWith(ext),
  );
  if (!hasAllowedExtension) return;

  const text = await file.text();
  const blob = await put(`knowledge/${agent.id}/${crypto.randomUUID()}-${file.name}`, file, {
    access: "private",
  });

  const [document] = await db
    .insert(knowledgeDocuments)
    .values({
      agentId: agent.id,
      blobUrl: blob.url,
      filename: file.name,
      mimeType: file.type || "text/plain",
      status: "processing",
    })
    .returning();

  await embedDocument(document!.id, text);
  revalidatePath(`/${locale}/assistants/${agent.id}/knowledge`);
}
```

- [ ] **Step 2: Write `src/app/[locale]/(dashboard)/assistants/[agentId]/knowledge/page.tsx`**

```tsx
import { desc, eq } from "drizzle-orm";
import { getTranslations } from "next-intl/server";
import { db } from "@/db/client";
import { knowledgeDocuments } from "@/db/schema/knowledge";
import { requireAgent } from "@/lib/auth/dal";
import { Button } from "@/components/ui/button";
import { uploadKnowledgeDocumentAction } from "./actions";

export default async function KnowledgeBasePage({
  params,
}: {
  params: Promise<{ locale: string; agentId: string }>;
}) {
  const { locale, agentId } = await params;
  const { agent } = await requireAgent(locale, agentId);
  const t = await getTranslations("assistants.knowledge");
  const action = uploadKnowledgeDocumentAction.bind(null, locale, agent.id);

  const documents = await db
    .select()
    .from(knowledgeDocuments)
    .where(eq(knowledgeDocuments.agentId, agent.id))
    .orderBy(desc(knowledgeDocuments.createdAt));

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold">{t("title")}</h1>
      <form action={action} className="flex items-center gap-2">
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
  );
}
```

- [ ] **Step 3: Add translations**

Add nested under `assistants` (as `knowledge`) in all three files.

`messages/uz.json`:
```json
"knowledge": {
  "title": "Bilim bazasi",
  "upload": "Yuklash",
  "empty": "Hali fayl yuklanmagan.",
  "status": {
    "processing": "Qayta ishlanmoqda",
    "ready": "Tayyor",
    "error": "Xato"
  }
}
```

`messages/ru.json`:
```json
"knowledge": {
  "title": "База знаний",
  "upload": "Загрузить",
  "empty": "Файлы ещё не загружены.",
  "status": {
    "processing": "Обрабатывается",
    "ready": "Готово",
    "error": "Ошибка"
  }
}
```

`messages/en.json`:
```json
"knowledge": {
  "title": "Knowledge base",
  "upload": "Upload",
  "empty": "No files uploaded yet.",
  "status": {
    "processing": "Processing",
    "ready": "Ready",
    "error": "Error"
  }
}
```

- [ ] **Step 4: Manual verification**

Visit `/uz/assistants/<id>/knowledge`, upload a small `.txt` file with a couple of
sentences. Expect the page to revalidate and show the file with status "Tayyor" (allow
a few seconds for the embedding call). Verify chunks landed in the DB:

```bash
node -e "
const { neon } = require('@neondatabase/serverless');
const sql = neon(process.env.DATABASE_URL);
sql\`SELECT count(*) FROM knowledge_chunk\`.then(r => console.log(r));
"
```
Expected: count > 0.

- [ ] **Step 5: Typecheck, lint, and commit**

```bash
npx tsc --noEmit && npx eslint src/app/\[locale\]/\(dashboard\)/assistants/
git add src/app/\[locale\]/\(dashboard\)/assistants/\[agentId\]/knowledge/ messages/
git commit -m "feat(assistants): add knowledge base upload and file list"
```

---

### Task 9: Playground chat route handler and UI

**Files:**
- Create: `src/app/api/agents/[agentId]/chat/route.ts`
- Create: `src/components/dashboard/playground-chat.tsx`
- Create: `src/app/[locale]/(dashboard)/assistants/[agentId]/chat/page.tsx`
- Modify: `messages/uz.json`, `messages/ru.json`, `messages/en.json`

**Interfaces:**
- Consumes: `retrieveRelevantChunks` (`src/lib/ai/retrieval.ts`, Task 4);
  `listAvailableModels`, `estimateCostUsd`, `EMBEDDING_MODEL` (`src/lib/ai/gateway.ts`,
  Task 3); `requireAgent` (`dal.ts`, Task 5); `aiAgents`, `conversations`, `messages`
  (schema, Task 1); Clerk's `auth()` from `@clerk/nextjs/server` (already used
  elsewhere in the codebase, e.g. `src/lib/auth/dal.ts`).
- Produces: `POST /api/agents/[agentId]/chat` endpoint consumed by
  `<PlaygroundChat agentId conversationId />` client component, which the chat page
  renders.

- [ ] **Step 1: Write `src/app/api/agents/[agentId]/chat/route.ts`**

```ts
import {
  streamText,
  embed,
  convertToModelMessages,
  createUIMessageStreamResponse,
  toUIMessageStream,
  type UIMessage,
} from "ai";
import { eq } from "drizzle-orm";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db/client";
import { aiAgents } from "@/db/schema/agents";
import { messages as messagesTable } from "@/db/schema/conversations";
import { retrieveRelevantChunks } from "@/lib/ai/retrieval";
import { listAvailableModels, estimateCostUsd, EMBEDDING_MODEL } from "@/lib/ai/gateway";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ agentId: string }> },
) {
  const { userId } = await auth();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const { agentId } = await params;
  const [agent] = await db.select().from(aiAgents).where(eq(aiAgents.id, agentId));
  if (!agent) return new Response("Not found", { status: 404 });

  const body = (await req.json()) as { messages: UIMessage[]; conversationId: string };
  const { messages: uiMessages, conversationId } = body;

  const lastUserMessage = uiMessages.at(-1);
  const lastUserText =
    lastUserMessage?.parts
      .filter((part): part is { type: "text"; text: string } => part.type === "text")
      .map((part) => part.text)
      .join("\n") ?? "";

  let context = "";
  if (lastUserText) {
    const { embedding } = await embed({ model: EMBEDDING_MODEL, value: lastUserText });
    const chunks = await retrieveRelevantChunks(agentId, embedding);
    if (chunks.length > 0) {
      context = `\n\nBilim bazasidan tegishli ma'lumot:\n${chunks.join("\n---\n")}`;
    }
  }

  if (lastUserText) {
    await db.insert(messagesTable).values({
      conversationId,
      role: "user",
      content: lastUserText,
    });
  }

  const result = streamText({
    model: agent.model,
    system: agent.systemPrompt + context,
    messages: await convertToModelMessages(uiMessages),
    onEnd: async ({ text, usage }) => {
      const models = await listAvailableModels();
      const cost = estimateCostUsd(models, agent.model, {
        inputTokens: usage.inputTokens,
        outputTokens: usage.outputTokens,
      });
      await db.insert(messagesTable).values({
        conversationId,
        role: "assistant",
        content: text,
        tokenCount: usage.totalTokens ?? null,
        estimatedCostUsd: cost,
      });
    },
  });

  return createUIMessageStreamResponse({
    stream: toUIMessageStream({ stream: result.stream }),
  });
}
```

- [ ] **Step 2: Write `src/components/dashboard/playground-chat.tsx`**

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function PlaygroundChat({
  agentId,
  conversationId,
}: {
  agentId: string;
  conversationId: string;
}) {
  const t = useTranslations("assistants.chat");
  const router = useRouter();
  const [input, setInput] = useState("");
  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({
      api: `/api/agents/${agentId}/chat`,
      body: { conversationId },
    }),
    onFinish: () => router.refresh(),
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3">
        {messages.map((message) => (
          <div key={message.id} className="whitespace-pre-wrap">
            <span className="font-medium">
              {message.role === "user" ? t("you") : t("assistant")}:{" "}
            </span>
            {message.parts.map((part, i) =>
              part.type === "text" ? <span key={`${message.id}-${i}`}>{part.text}</span> : null,
            )}
          </div>
        ))}
      </div>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (!input.trim()) return;
          sendMessage({ text: input });
          setInput("");
        }}
        className="flex gap-2"
      >
        <Input
          value={input}
          onChange={(event) => setInput(event.currentTarget.value)}
          placeholder={t("placeholder")}
        />
        <Button type="submit" disabled={status === "streaming"}>
          {t("send")}
        </Button>
      </form>
    </div>
  );
}
```

- [ ] **Step 3: Write `src/app/[locale]/(dashboard)/assistants/[agentId]/chat/page.tsx`**

```tsx
import { desc, eq, sum } from "drizzle-orm";
import { getTranslations } from "next-intl/server";
import { db } from "@/db/client";
import { conversations, messages as messagesTable } from "@/db/schema/conversations";
import { requireAgent } from "@/lib/auth/dal";
import { PlaygroundChat } from "@/components/dashboard/playground-chat";

export default async function AssistantChatPage({
  params,
}: {
  params: Promise<{ locale: string; agentId: string }>;
}) {
  const { locale, agentId } = await params;
  const { agent } = await requireAgent(locale, agentId);
  const t = await getTranslations("assistants.chat");

  let [conversation] = await db
    .select()
    .from(conversations)
    .where(eq(conversations.agentId, agent.id))
    .orderBy(desc(conversations.startedAt))
    .limit(1);

  if (!conversation) {
    [conversation] = await db.insert(conversations).values({ agentId: agent.id }).returning();
  }

  const [costRow] = await db
    .select({
      totalTokens: sum(messagesTable.tokenCount),
      totalCost: sum(messagesTable.estimatedCostUsd),
    })
    .from(messagesTable)
    .where(eq(messagesTable.conversationId, conversation!.id));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">{t("title", { name: agent.name })}</h1>
        <p className="text-muted-foreground text-sm">
          {t("cost", {
            tokens: costRow?.totalTokens ?? "0",
            cost: costRow?.totalCost ? Number(costRow.totalCost).toFixed(4) : "0",
          })}
        </p>
      </div>
      <PlaygroundChat agentId={agent.id} conversationId={conversation!.id} />
    </div>
  );
}
```

Every playground visit reuses the agent's single most recent conversation rather than
starting a new one each time — simpler than a conversation picker, and sufficient for
an internal test surface. If no conversation exists yet, one is created.

- [ ] **Step 4: Add translations**

Add nested under `assistants` (as `chat`) in all three files.

`messages/uz.json`:
```json
"chat": {
  "title": "{name} bilan sinov suhbati",
  "cost": "{tokens} token ≈ ${cost}",
  "you": "Siz",
  "assistant": "Assistent",
  "placeholder": "Xabar yozing...",
  "send": "Yuborish"
}
```

`messages/ru.json`:
```json
"chat": {
  "title": "Тестовый чат с {name}",
  "cost": "{tokens} токенов ≈ ${cost}",
  "you": "Вы",
  "assistant": "Ассистент",
  "placeholder": "Напишите сообщение...",
  "send": "Отправить"
}
```

`messages/en.json`:
```json
"chat": {
  "title": "Test chat with {name}",
  "cost": "{tokens} tokens ≈ ${cost}",
  "you": "You",
  "assistant": "Assistant",
  "placeholder": "Type a message...",
  "send": "Send"
}
```

- [ ] **Step 5: Manual verification**

Visit `/uz/assistants/<id>/chat`, send a message referencing content from the `.txt`
file uploaded in Task 8. Expect a streamed response, and after it finishes, the token/
cost line at the top should update (via `router.refresh()`) to a non-zero value. Send a
second message and confirm the conversation history persists across the exchange.

- [ ] **Step 6: Typecheck, lint, and commit**

```bash
npx tsc --noEmit && npx eslint src/app/api/agents/ src/components/dashboard/playground-chat.tsx src/app/\[locale\]/\(dashboard\)/assistants/
git add src/app/api/agents/ src/components/dashboard/playground-chat.tsx src/app/\[locale\]/\(dashboard\)/assistants/\[agentId\]/chat/ messages/
git commit -m "feat(assistants): add playground chat route and streaming UI"
```

---

### Task 10: Approvals queue

**Files:**
- Create: `src/lib/approvals/transitions.ts`
- Create: `src/lib/approvals/transitions.test.ts`
- Create: `src/app/[locale]/(dashboard)/approvals/page.tsx`
- Create: `src/app/[locale]/(dashboard)/approvals/actions.ts`
- Modify: `messages/uz.json`, `messages/ru.json`, `messages/en.json`

**Interfaces:**
- Consumes: `requireOrganization` (`dal.ts`); `approvals`, `aiAgents` (schema, Task 1).
- Produces: `canResolve(status: ApprovalStatus): boolean` (pure, exported for the
  action's guard and unit-tested directly) from `transitions.ts`. No later task depends
  on this — it's the final feature task in this plan.

- [ ] **Step 1: Write the failing test for `canResolve`**

```ts
// src/lib/approvals/transitions.test.ts
import { describe, expect, it } from "vitest";
import { canResolve } from "./transitions";

describe("canResolve", () => {
  it("allows resolving a pending approval", () => {
    expect(canResolve("pending")).toBe(true);
  });

  it("rejects resolving an already-approved approval", () => {
    expect(canResolve("approved")).toBe(false);
  });

  it("rejects resolving an expired approval", () => {
    expect(canResolve("expired")).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/approvals/transitions.test.ts`
Expected: FAIL — `Cannot find module './transitions'`

- [ ] **Step 3: Write `src/lib/approvals/transitions.ts`**

```ts
import "server-only";

export type ApprovalStatus = "pending" | "approved" | "rejected" | "auto_resolved" | "expired";

export function canResolve(status: ApprovalStatus): boolean {
  return status === "pending";
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/approvals/transitions.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: Write `src/app/[locale]/(dashboard)/approvals/actions.ts`**

```ts
"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db/client";
import { approvals } from "@/db/schema/approvals";
import { aiAgents } from "@/db/schema/agents";
import { requireOrganization } from "@/lib/auth/dal";
import { canResolve } from "@/lib/approvals/transitions";

async function resolveApproval(
  locale: string,
  approvalId: string,
  status: "approved" | "rejected",
): Promise<void> {
  const { organization } = await requireOrganization(locale);
  const { userId } = await auth();

  const [row] = await db
    .select({ approval: approvals })
    .from(approvals)
    .innerJoin(aiAgents, eq(approvals.agentId, aiAgents.id))
    .where(and(eq(approvals.id, approvalId), eq(aiAgents.organizationId, organization.id)));

  // Missing row (wrong org, or bad id) or already-resolved: nothing to do.
  if (!row || !canResolve(row.approval.status)) return;

  await db
    .update(approvals)
    .set({ status, resolvedAt: new Date(), resolvedByUserId: userId })
    .where(eq(approvals.id, approvalId));
  revalidatePath(`/${locale}/approvals`);
}

export async function approveAction(locale: string, approvalId: string): Promise<void> {
  await resolveApproval(locale, approvalId, "approved");
}

export async function rejectAction(locale: string, approvalId: string): Promise<void> {
  await resolveApproval(locale, approvalId, "rejected");
}
```

- [ ] **Step 6: Write `src/app/[locale]/(dashboard)/approvals/page.tsx`**

```tsx
import { desc, eq } from "drizzle-orm";
import { getTranslations } from "next-intl/server";
import { db } from "@/db/client";
import { approvals } from "@/db/schema/approvals";
import { aiAgents } from "@/db/schema/agents";
import { requireOrganization } from "@/lib/auth/dal";
import { Button } from "@/components/ui/button";
import { approveAction, rejectAction } from "./actions";

export default async function ApprovalsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const { organization } = await requireOrganization(locale);
  const t = await getTranslations("approvals");

  const rows = await db
    .select({ approval: approvals, agentName: aiAgents.name })
    .from(approvals)
    .innerJoin(aiAgents, eq(approvals.agentId, aiAgents.id))
    .where(eq(aiAgents.organizationId, organization.id))
    .orderBy(desc(approvals.createdAt));

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold">{t("title")}</h1>
      {rows.length === 0 ? (
        <p className="text-muted-foreground">{t("empty")}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {rows.map(({ approval, agentName }) => (
            <li key={approval.id} className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="font-medium">
                  {agentName} — {approval.type}
                </p>
                <p className="text-muted-foreground text-sm">{t(`status.${approval.status}`)}</p>
              </div>
              {approval.status === "pending" && (
                <div className="flex gap-2">
                  <form action={async () => { "use server"; await approveAction(locale, approval.id); }}>
                    <Button type="submit" size="sm">
                      {t("approve")}
                    </Button>
                  </form>
                  <form action={async () => { "use server"; await rejectAction(locale, approval.id); }}>
                    <Button type="submit" size="sm" variant="ghost">
                      {t("reject")}
                    </Button>
                  </form>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

- [ ] **Step 7: Add translations**

Add a new top-level `approvals` key in all three files.

`messages/uz.json`:
```json
"approvals": {
  "title": "Tasdiqlash navbati",
  "empty": "Hozircha tasdiqlash kutayotgan harakatlar yo'q.",
  "approve": "Tasdiqlash",
  "reject": "Rad etish",
  "status": {
    "pending": "Kutmoqda",
    "approved": "Tasdiqlangan",
    "rejected": "Rad etilgan",
    "auto_resolved": "Avto-hal qilingan",
    "expired": "Muddati o'tgan"
  }
}
```

`messages/ru.json`:
```json
"approvals": {
  "title": "Очередь подтверждений",
  "empty": "Пока нет действий, ожидающих подтверждения.",
  "approve": "Подтвердить",
  "reject": "Отклонить",
  "status": {
    "pending": "Ожидает",
    "approved": "Подтверждено",
    "rejected": "Отклонено",
    "auto_resolved": "Авто-решено",
    "expired": "Истекло"
  }
}
```

`messages/en.json`:
```json
"approvals": {
  "title": "Approvals queue",
  "empty": "No actions waiting for approval right now.",
  "approve": "Approve",
  "reject": "Reject",
  "status": {
    "pending": "Pending",
    "approved": "Approved",
    "rejected": "Rejected",
    "auto_resolved": "Auto-resolved",
    "expired": "Expired"
  }
}
```

- [ ] **Step 8: Manual verification**

Visit `/uz/approvals` — expect the empty state (no approvals are ever created in this
phase, since no real tool-calling exists yet; the queue and actions are verified to
render and typecheck correctly, ready for Phase 4-5 to start inserting rows).

- [ ] **Step 9: Typecheck, lint, and commit**

```bash
npx tsc --noEmit && npx eslint src/lib/approvals/ src/app/\[locale\]/\(dashboard\)/approvals/
git add src/lib/approvals/ src/app/\[locale\]/\(dashboard\)/approvals/ messages/
git commit -m "feat(approvals): add human-in-the-loop approvals queue"
```

---

### Task 11: Wire up sidebar navigation

**Files:**
- Modify: `src/components/dashboard/sidebar-nav.tsx`
- Modify: `messages/uz.json`, `messages/ru.json`, `messages/en.json`

**Interfaces:**
- Consumes: nothing new.
- Produces: nothing consumed elsewhere (final task).

- [ ] **Step 1: Update `src/components/dashboard/sidebar-nav.tsx`**

Replace the existing `COMING_SOON_ITEMS` array and the menu-rendering block. Read the
current file first — reuse its imports (`useTranslations`, sidebar primitives, `Link`,
icons) and its exact JSX structure for `SidebarMenuButton`/`SidebarMenuItem`. Change
just the data driving the loop:

```tsx
import { Bot, MessageSquare, BookOpen, Plug, BarChart3, Settings, ShieldCheck } from "lucide-react";

const NAV_ITEMS = [
  { key: "assistants", icon: Bot, href: "/assistants" },
  { key: "chats", icon: MessageSquare, comingSoon: true },
  { key: "knowledgeBases", icon: BookOpen, comingSoon: true },
  { key: "approvals", icon: ShieldCheck, href: "/approvals" },
  { key: "integrations", icon: Plug, comingSoon: true },
  { key: "statistics", icon: BarChart3, comingSoon: true },
] as const;
```

Then render each item as either a real `<Link>` (when `href` is present) or the
existing disabled button (when `comingSoon` is `true`) — keep the existing "Sozlamalar"
`SidebarMenuItem` below the loop untouched.

```tsx
{NAV_ITEMS.map(({ key, icon: Icon, ...item }) => (
  <SidebarMenuItem key={key}>
    {"href" in item ? (
      <SidebarMenuButton render={<Link href={item.href} />}>
        <Icon />
        <span>{t(key)}</span>
      </SidebarMenuButton>
    ) : (
      <SidebarMenuButton disabled>
        <Icon />
        <span>{t(key)}</span>
        <span className="text-muted-foreground ml-auto text-xs">{t("comingSoon")}</span>
      </SidebarMenuButton>
    )}
  </SidebarMenuItem>
))}
```

- [ ] **Step 2: Add the `approvals` nav key**

Add `"approvals": "Tasdiqlash"` to `messages/uz.json`'s `dashboard.nav` object (next to
the existing `assistants`/`chats`/etc. keys). Add `"approvals": "Подтверждения"` to
`messages/ru.json`. Add `"approvals": "Approvals"` to `messages/en.json`.

- [ ] **Step 3: Manual verification**

Reload `/uz/dashboard`. Expect the sidebar to show "AI Xodimlar" and "Tasdiqlash" as
clickable links (navigating to `/assistants` and `/approvals` respectively), while
"Suhbatlar", "Bilim bazasi", "Integratsiyalar", "Statistika" remain disabled with the
"Tez orada" badge, exactly as before.

- [ ] **Step 4: Typecheck, lint, and commit**

```bash
npx tsc --noEmit && npx eslint src/components/dashboard/sidebar-nav.tsx
git add src/components/dashboard/sidebar-nav.tsx messages/
git commit -m "feat(dashboard): link AI Xodimlar and Tasdiqlash nav items to their pages"
```

---

### Task 12: Playwright smoke tests

**Files:**
- Create: `tests/e2e/assistants.spec.ts`

**Interfaces:**
- Consumes: nothing (drives the app over HTTP like the existing `tests/e2e/auth.spec.ts`).
- Produces: nothing (final task in the plan).

- [ ] **Step 1: Write `tests/e2e/assistants.spec.ts`**

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
});
```

Authenticated flows (creating an agent, uploading a knowledge file, chatting) are
covered by the manual verification steps in Tasks 6-10, mirroring how
`tests/e2e/auth.spec.ts` only covers the unauthenticated redirect gate rather than a
full Clerk sign-in — Playwright can't drive Clerk's hosted auth UI without real
provider credentials in CI.

- [ ] **Step 2: Run the test**

```bash
npx playwright test tests/e2e/assistants.spec.ts
```
Expected: PASS (2 tests). If Playwright's browsers aren't installed, run `npx
playwright install --with-deps chromium` first.

- [ ] **Step 3: Run the full test suite one last time**

```bash
npx tsc --noEmit
npx eslint .
npx vitest run
npx playwright test
```
Expected: all clean.

- [ ] **Step 4: Commit**

```bash
git add tests/e2e/assistants.spec.ts
git commit -m "test(e2e): add auth-gate smoke tests for assistants and approvals"
```
