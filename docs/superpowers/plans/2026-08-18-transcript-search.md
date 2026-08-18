# Full-text transcript search implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let support-team users search the text of every message across every
conversation (Telegram/WhatsApp/widget) in their organization, from one page, with
agent/channel filters, and jump straight to the matching conversation.

**Architecture:** A raw-SQL Postgres migration adds a generated `tsvector` column
(`search_vector`) to `message`, combining `simple`/`russian`/`english` tokenization,
backed by a GIN index. A single server-side function (`searchTranscripts`) runs one
`db.execute(sql\`...\`)` query with `websearch_to_tsquery`/`ts_rank`/`ts_headline`,
org-scoped via a join to `ai_agent`. A new `/search` Server Component page renders a
plain HTML GET form (query + agent/channel filters) and paginates via `<Link>` query
params — no client JS required for the search flow itself. Clicking a result links to
`/chats?conversation=X&message=Y`, which a small addition to the existing `/chats` page
uses to scroll to and highlight that message.

**Tech Stack:** Next.js App Router (Server Components), Drizzle ORM (`drizzle-orm/neon-http`),
Neon Postgres native full-text search (no new dependency), next-intl, Vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-08-18-transcript-search-design.md`

## Global Constraints

- Org-scoping is mandatory on every query: always join to `ai_agent` and filter by
  `ai_agent."organizationId"` from `requireOrganization()` — never trust a client-supplied
  `agentId` alone.
- Search technique is Postgres native FTS (`tsvector` + GIN), not embeddings — per the
  spec's explicit decision.
- Query text config: combine `simple` + `russian` + `english` via `||` on both the
  indexed column and the query side — no per-message language detection.
- All user-visible text ships in `uz` (default), `ru`, `en` — see
  `docs/superpowers/specs/2026-08-18-transcript-search-design.md` and this repo's
  `messages/*.json` convention.
- Never render search-result snippets via `dangerouslySetInnerHTML` — split-and-render
  the `<mark>`/`</mark>` delimiters as React nodes so message content is always escaped
  as a text node.
- Minimum query length is 2 characters (validated server-side, not just via the input's
  `minLength`).

---

### Task 1: Database migration — `search_vector` column and indexes

**Files:**
- Create: `scripts/sql/message-search-vector.sql`
- Create: `scripts/apply-message-search-vector.js`
- Test: manual verification query (Step 4 below) — no automated test, this is a one-time
  schema migration like the existing `scripts/migrate.js` precedent.

**Interfaces:**
- Produces: a `search_vector tsvector` generated column and a GIN index
  `message_search_vector_idx` on `"message"`, plus B-tree indexes
  `message_conversation_id_idx` on `"message"("conversationId")`,
  `conversation_agent_id_idx` on `"conversation"("agentId")`, and
  `conversation_started_at_idx` on `"conversation"("startedAt")`. Task 2's
  `searchTranscripts` query references `"message"."search_vector"` directly (raw SQL,
  not declared in `src/db/schema/conversations.ts` — Drizzle 0.45's `pg-core` has no
  `generatedAlwaysAs` API, confirmed by grepping `node_modules/drizzle-orm` for
  `generatedAlwaysAs`/`generated` with no hits).

This migration is intentionally NOT placed in `drizzle/` — that directory is
`drizzle-kit`'s generated-output directory tracked by `drizzle/meta/_journal.json`;
a hand-written file dropped in there without a matching journal entry would confuse a
future `drizzle-kit generate` diff. Instead it follows the existing one-off pattern in
`scripts/migrate.js` (a hardcoded SQL file + a small runner using
`@neondatabase/serverless` directly against `DATABASE_URL`).

- [ ] **Step 1: Write the migration SQL**

Create `scripts/sql/message-search-vector.sql`:

```sql
ALTER TABLE "message" ADD COLUMN "search_vector" tsvector GENERATED ALWAYS AS (
  to_tsvector('simple', "content") ||
  to_tsvector('russian', "content") ||
  to_tsvector('english', "content")
) STORED;
--> statement-breakpoint
CREATE INDEX "message_search_vector_idx" ON "message" USING GIN ("search_vector");
--> statement-breakpoint
CREATE INDEX "message_conversation_id_idx" ON "message" ("conversationId");
--> statement-breakpoint
CREATE INDEX "conversation_agent_id_idx" ON "conversation" ("agentId");
--> statement-breakpoint
CREATE INDEX "conversation_started_at_idx" ON "conversation" ("startedAt");
```

- [ ] **Step 2: Write the apply script**

Create `scripts/apply-message-search-vector.js` (mirrors `scripts/migrate.js`'s
statement-splitting exactly, pointed at the new file):

```js
const fs = require("fs");
const path = require("path");
const { neon } = require("@neondatabase/serverless");
require("dotenv").config({ path: ".env.local" });

async function run() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error("DATABASE_URL not found in .env.local");
    process.exit(1);
  }

  const sql = neon(databaseUrl);
  const sqlFile = path.join(__dirname, "sql/message-search-vector.sql");
  const sqlContent = fs.readFileSync(sqlFile, "utf8");

  const statements = sqlContent
    .split("--> statement-breakpoint")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  console.log(`Executing ${statements.length} SQL migration statements...`);

  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i];
    try {
      await sql.query(stmt);
      console.log(`[${i + 1}/${statements.length}] OK`);
    } catch (err) {
      console.error(`[${i + 1}/${statements.length}] FAILED:`, err.message);
      process.exit(1);
    }
  }

  console.log("Migration complete!");
}

run();
```

Note this deliberately exits non-zero on the first real failure (unlike
`scripts/migrate.js`, which only warns) — a partially-applied DDL migration here would
leave `search_vector` referenced by Task 2's code but missing from the DB, so a silent
partial failure must not be treated as success.

- [ ] **Step 3: Run the migration**

Run: `node scripts/apply-message-search-vector.js`
Expected: `Executing 5 SQL migration statements...` followed by `[1/5] OK` through
`[5/5] OK`, then `Migration complete!`.

- [ ] **Step 4: Verify the column and indexes exist**

Run:
```bash
node -e "
require('dotenv').config({ path: '.env.local' });
const { neon } = require('@neondatabase/serverless');
const sql = neon(process.env.DATABASE_URL);
(async () => {
  const cols = await sql.query(\"SELECT column_name FROM information_schema.columns WHERE table_name = 'message' AND column_name = 'search_vector'\");
  const idx = await sql.query(\"SELECT indexname FROM pg_indexes WHERE tablename IN ('message','conversation') AND indexname LIKE '%search_vector%' OR indexname LIKE '%_idx'\");
  console.log('column:', cols);
  console.log('indexes:', idx);
})();
"
```
Expected: `column` includes a row `{ column_name: 'search_vector' }`; `indexes` includes
`message_search_vector_idx`, `message_conversation_id_idx`,
`conversation_agent_id_idx`, `conversation_started_at_idx`.

- [ ] **Step 5: Commit**

```bash
git add scripts/sql/message-search-vector.sql scripts/apply-message-search-vector.js
git commit -m "feat: add generated search_vector column and indexes for transcript search"
```

---

### Task 2: Backend search function

**Files:**
- Create: `src/lib/search/transcripts.ts`
- Test: `src/lib/search/transcripts.test.ts`

**Interfaces:**
- Consumes: Task 1's `"message"."search_vector"` column (referenced by raw SQL only,
  no schema.ts changes) and `db` from `@/db/client` (a `NeonHttpDatabase` whose
  `.execute<T>(sql)` returns `{ rows: T[] }` — confirmed pattern from
  `src/lib/analytics/agent-analytics.ts:getAvgResponseSeconds`).
- Produces: `searchTranscripts(params: TranscriptSearchParams): Promise<TranscriptSearchOutcome>`,
  `type TranscriptChannel = "telegram" | "whatsapp" | "widget"`,
  `type TranscriptSearchResult = { messageId, conversationId, agentId, agentName, channel, role, createdAt, snippet }`,
  `type TranscriptSearchOutcome = { ok: true; results: TranscriptSearchResult[]; totalCount: number } | { ok: false; error: "too_short" | "query_failed" }`.
  Task 5's `/search` page imports and calls this directly (it's a plain async function,
  not a `"use server"` action — Server Components can call it in-process, same as every
  other data-fetching helper this codebase's dashboard pages already call, e.g.
  `getAvgResponseSeconds`).

- [ ] **Step 1: Write the failing tests**

Create `src/lib/search/transcripts.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";

const dbExecute = vi.fn();

vi.mock("@/db/client", () => ({
  db: { execute: dbExecute },
}));

import { searchTranscripts } from "./transcripts";

describe("searchTranscripts", () => {
  beforeEach(() => {
    dbExecute.mockReset();
  });

  it("rejects queries shorter than 2 characters without hitting the database", async () => {
    const result = await searchTranscripts({
      organizationId: "org_1",
      query: "a",
      page: 1,
      pageSize: 20,
    });

    expect(result).toEqual({ ok: false, error: "too_short" });
    expect(dbExecute).not.toHaveBeenCalled();
  });

  it("maps rows and total_count from the query result", async () => {
    dbExecute.mockResolvedValueOnce({
      rows: [
        {
          message_id: "msg_1",
          conversation_id: "conv_1",
          agent_id: "agent_1",
          agent_name: "Sotuv boti",
          channel: "telegram",
          role: "user",
          created_at: "2026-08-18T10:00:00.000Z",
          snippet: "Salom, <mark>qaytarish</mark> siyosati qanday?",
          total_count: "3",
        },
      ],
    });

    const result = await searchTranscripts({
      organizationId: "org_1",
      query: "qaytarish",
      page: 1,
      pageSize: 20,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("expected ok result");
    expect(result.totalCount).toBe(3);
    expect(result.results).toEqual([
      {
        messageId: "msg_1",
        conversationId: "conv_1",
        agentId: "agent_1",
        agentName: "Sotuv boti",
        channel: "telegram",
        role: "user",
        createdAt: new Date("2026-08-18T10:00:00.000Z"),
        snippet: "Salom, <mark>qaytarish</mark> siyosati qanday?",
      },
    ]);
  });

  it("returns zero results and zero total_count when nothing matches", async () => {
    dbExecute.mockResolvedValueOnce({ rows: [] });

    const result = await searchTranscripts({
      organizationId: "org_1",
      query: "hech-narsa-yoq",
      page: 1,
      pageSize: 20,
    });

    expect(result).toEqual({ ok: true, results: [], totalCount: 0 });
  });

  it("returns a query_failed outcome instead of throwing when the DB errors", async () => {
    dbExecute.mockRejectedValueOnce(new Error("connection reset"));

    const result = await searchTranscripts({
      organizationId: "org_1",
      query: "qaytarish",
      page: 1,
      pageSize: 20,
    });

    expect(result).toEqual({ ok: false, error: "query_failed" });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/search/transcripts.test.ts`
Expected: FAIL — `Cannot find module './transcripts'` (file doesn't exist yet).

- [ ] **Step 3: Write the implementation**

Create `src/lib/search/transcripts.ts`:

```ts
import "server-only";
import { sql } from "drizzle-orm";
import { db } from "@/db/client";

export type TranscriptChannel = "telegram" | "whatsapp" | "widget";

export type TranscriptSearchResult = {
  messageId: string;
  conversationId: string;
  agentId: string;
  agentName: string;
  channel: string;
  role: string;
  createdAt: Date;
  snippet: string;
};

export type TranscriptSearchParams = {
  organizationId: string;
  query: string;
  agentId?: string;
  channel?: TranscriptChannel;
  dateFrom?: Date;
  dateTo?: Date;
  page: number;
  pageSize: number;
};

export type TranscriptSearchOutcome =
  | { ok: true; results: TranscriptSearchResult[]; totalCount: number }
  | { ok: false; error: "too_short" | "query_failed" };

type TranscriptRow = {
  message_id: string;
  conversation_id: string;
  agent_id: string;
  agent_name: string;
  channel: string;
  role: string;
  created_at: string;
  snippet: string;
  total_count: string;
};

export async function searchTranscripts(
  params: TranscriptSearchParams,
): Promise<TranscriptSearchOutcome> {
  const trimmed = params.query.trim();
  if (trimmed.length < 2) {
    return { ok: false, error: "too_short" };
  }

  const offset = (params.page - 1) * params.pageSize;
  const tsQuery = sql`(websearch_to_tsquery('simple', ${trimmed}) || websearch_to_tsquery('russian', ${trimmed}) || websearch_to_tsquery('english', ${trimmed}))`;

  try {
    const result = await db.execute<TranscriptRow>(sql`
      SELECT
        m."id" AS message_id,
        m."conversationId" AS conversation_id,
        a."id" AS agent_id,
        a."name" AS agent_name,
        c."channel" AS channel,
        m."role" AS role,
        m."createdAt" AS created_at,
        ts_headline('simple', m."content", ${tsQuery}, 'StartSel=<mark>,StopSel=</mark>,MaxWords=25,MinWords=15') AS snippet,
        count(*) OVER() AS total_count
      FROM "message" m
      INNER JOIN "conversation" c ON c."id" = m."conversationId"
      INNER JOIN "ai_agent" a ON a."id" = c."agentId"
      WHERE a."organizationId" = ${params.organizationId}
        AND m."search_vector" @@ ${tsQuery}
        ${params.agentId ? sql`AND a."id" = ${params.agentId}` : sql``}
        ${params.channel ? sql`AND c."channel" = ${params.channel}` : sql``}
        ${params.dateFrom ? sql`AND m."createdAt" >= ${params.dateFrom}` : sql``}
        ${params.dateTo ? sql`AND m."createdAt" <= ${params.dateTo}` : sql``}
      ORDER BY ts_rank(m."search_vector", ${tsQuery}) DESC
      LIMIT ${params.pageSize}
      OFFSET ${offset}
    `);

    const rows = result.rows;
    return {
      ok: true,
      results: rows.map((row) => ({
        messageId: row.message_id,
        conversationId: row.conversation_id,
        agentId: row.agent_id,
        agentName: row.agent_name,
        channel: row.channel,
        role: row.role,
        createdAt: new Date(row.created_at),
        snippet: row.snippet,
      })),
      totalCount: rows.length > 0 ? Number(rows[0].total_count) : 0,
    };
  } catch (error) {
    console.error("searchTranscripts: query failed", error);
    return { ok: false, error: "query_failed" };
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/search/transcripts.test.ts`
Expected: PASS — 4 tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/search/transcripts.ts src/lib/search/transcripts.test.ts
git commit -m "feat: add org-scoped full-text transcript search function"
```

---

### Task 3: i18n messages

**Files:**
- Modify: `messages/uz.json`
- Modify: `messages/ru.json`
- Modify: `messages/en.json`

**Interfaces:**
- Produces: a `search` top-level namespace and a `dashboard.nav.search` key in all
  three locale files. Task 4 reads `dashboard.nav.search`; Task 5 reads every other key
  under `search.*` listed below.

- [ ] **Step 1: Add to `messages/uz.json`**

Add `"search"` to `dashboard.nav` (immediately after `"chats": "Suhbatlar",` at line 386):

```json
      "search": "Qidiruv",
```

Add a new top-level `"search"` object (immediately after the `"chats": { ... }` block
that ends at line 873, i.e. right before `"knowledgeBases": {`):

```json
  "search": {
    "title": "Transkript qidiruv",
    "subtitle": "Barcha AI Xodimlarning Telegram, WhatsApp va vidjet suhbatlari bo'yicha qidiring.",
    "placeholder": "Xabar matni bo'yicha qidiring (kamida 2 belgi)...",
    "submit": "Qidirish",
    "allAgents": "Barcha AI Xodimlar",
    "allChannels": "Barcha kanallar",
    "channel": {
      "telegram": "Telegram",
      "whatsapp": "WhatsApp",
      "widget": "Sayt vidjeti"
    },
    "emptyState": "Qidiruv so'zini kiriting va Qidirish tugmasini bosing.",
    "tooShort": "Kamida 2 belgi kiriting.",
    "searchError": "Qidiruvda xatolik yuz berdi. Qaytadan urinib ko'ring.",
    "noResults": "Hech narsa topilmadi. Filtrlarni kengaytirib ko'ring.",
    "resultsCount": "{count} ta natija topildi",
    "viewInChat": "Suhbatda ko'rish",
    "previous": "Oldingi",
    "next": "Keyingi"
  },
```

- [ ] **Step 2: Add to `messages/ru.json`**

Add to `dashboard.nav` (after `"chats": "Диалоги",` at line 386):

```json
      "search": "Поиск",
```

Add the top-level `"search"` object (same position, after the `"chats": { ... }` block):

```json
  "search": {
    "title": "Поиск по транскриптам",
    "subtitle": "Поиск по диалогам всех AI-сотрудников в Telegram, WhatsApp и виджете.",
    "placeholder": "Поиск по тексту сообщения (минимум 2 символа)...",
    "submit": "Искать",
    "allAgents": "Все AI-сотрудники",
    "allChannels": "Все каналы",
    "channel": {
      "telegram": "Telegram",
      "whatsapp": "WhatsApp",
      "widget": "Виджет сайта"
    },
    "emptyState": "Введите поисковый запрос и нажмите Искать.",
    "tooShort": "Введите минимум 2 символа.",
    "searchError": "Ошибка поиска. Попробуйте снова.",
    "noResults": "Ничего не найдено. Попробуйте расширить фильтры.",
    "resultsCount": "Найдено {count} результатов",
    "viewInChat": "Открыть в диалоге",
    "previous": "Назад",
    "next": "Далее"
  },
```

- [ ] **Step 3: Add to `messages/en.json`**

Add to `dashboard.nav` (after `"chats": "Chats",` at line 386):

```json
      "search": "Search",
```

Add the top-level `"search"` object (same position, after the `"chats": { ... }` block):

```json
  "search": {
    "title": "Transcript search",
    "subtitle": "Search across every AI employee's Telegram, WhatsApp, and widget conversations.",
    "placeholder": "Search message text (2+ characters)...",
    "submit": "Search",
    "allAgents": "All AI employees",
    "allChannels": "All channels",
    "channel": {
      "telegram": "Telegram",
      "whatsapp": "WhatsApp",
      "widget": "Site widget"
    },
    "emptyState": "Enter a search term and press Search.",
    "tooShort": "Enter at least 2 characters.",
    "searchError": "Search failed. Please try again.",
    "noResults": "No results found. Try widening your filters.",
    "resultsCount": "{count} results found",
    "viewInChat": "View in chat",
    "previous": "Previous",
    "next": "Next"
  },
```

- [ ] **Step 4: Verify JSON validity**

Run: `node -e "JSON.parse(require('fs').readFileSync('messages/uz.json')); JSON.parse(require('fs').readFileSync('messages/ru.json')); JSON.parse(require('fs').readFileSync('messages/en.json')); console.log('all valid')"`
Expected: `all valid`

- [ ] **Step 5: Commit**

```bash
git add messages/uz.json messages/ru.json messages/en.json
git commit -m "feat: add i18n content for transcript search page"
```

---

### Task 4: Sidebar navigation entry

**Files:**
- Modify: `src/components/dashboard/sidebar-nav.tsx`

**Interfaces:**
- Consumes: `dashboard.nav.search` from Task 3.
- Produces: a `/search` link in the sidebar's "work" group, reachable and marked active
  by the existing `isNavItemActive`/`ROUTED_NAV_ITEMS` machinery (no changes needed
  there — both derive from the `GROUPS` array this task edits).

- [ ] **Step 1: Add the `Search` icon import**

In `src/components/dashboard/sidebar-nav.tsx`, change the `lucide-react` import (lines
4-32) to add `Search`:

```tsx
import {
  Bot,
  MessageSquare,
  PhoneCall,
  Repeat2,
  ShieldCheck,
  BookOpen,
  Package,
  Plug,
  BarChart3,
  Activity,
  Code2,
  Gift,
  Handshake,
  Settings,
  Briefcase,
  Sparkles,
  MessageSquareText,
  Search,
  type LucideIcon,
} from "lucide-react";
```

- [ ] **Step 2: Add the nav item**

In the `"work"` group's `items` array (lines 40-48), add a `search` entry right after
`chats`:

```tsx
    items: [
      { key: "assistants", icon: Bot, href: "/assistants" },
      { key: "templates", icon: Sparkles, href: "/templates" },
      { key: "chats", icon: MessageSquare, href: "/chats" },
      { key: "search", icon: Search, href: "/search" },
      { key: "calls", icon: PhoneCall, href: "/calls" },
      { key: "routines", icon: Repeat2, href: "/routines" },
      { key: "crm", icon: Briefcase, href: "/crm" },
      { key: "approvals", icon: ShieldCheck, href: "/approvals" },
    ],
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors (this is a pure data/JSX addition using an existing pattern).

- [ ] **Step 4: Commit**

```bash
git add src/components/dashboard/sidebar-nav.tsx
git commit -m "feat: add transcript search link to dashboard sidebar"
```

---

### Task 5: `/search` page

**Files:**
- Create: `src/app/[locale]/(dashboard)/search/page.tsx`
- Create: `src/components/dashboard/search/snippet-highlight.tsx`

**Interfaces:**
- Consumes: `searchTranscripts`/`TranscriptChannel` from Task 2
  (`@/lib/search/transcripts`), `requireOrganization` from `@/lib/auth/dal`, `db`/`aiAgents`
  for the agent-filter dropdown, `search.*` and `dashboard.nav.search` i18n keys from
  Task 3.
- Produces: the `/search` route. Links to `/chats?conversation=<id>&message=<id>`, which
  Task 6 makes meaningful.

- [ ] **Step 1: Write the snippet-highlight component**

Create `src/components/dashboard/search/snippet-highlight.tsx`:

```tsx
// ts_headline output only ever contains our own literal <mark>/</mark> delimiters
// around excerpted message text — this renders those delimiters as React elements
// (never via dangerouslySetInnerHTML) so the excerpted text itself stays an
// auto-escaped text node no matter what a customer's message contained.
export function SnippetHighlight({ snippet }: { snippet: string }) {
  const parts = snippet.split(/(<mark>|<\/mark>)/g);
  let marking = false;
  return (
    <>
      {parts.map((part, index) => {
        if (part === "<mark>") {
          marking = true;
          return null;
        }
        if (part === "</mark>") {
          marking = false;
          return null;
        }
        if (part === "") return null;
        return marking ? (
          <mark key={index} className="rounded bg-brand/20 px-0.5 font-medium text-foreground">
            {part}
          </mark>
        ) : (
          <span key={index}>{part}</span>
        );
      })}
    </>
  );
}
```

- [ ] **Step 2: Write the page**

Create `src/app/[locale]/(dashboard)/search/page.tsx`:

```tsx
import { eq } from "drizzle-orm";
import { getTranslations } from "next-intl/server";
import { Search as SearchIcon } from "lucide-react";
import { db } from "@/db/client";
import { aiAgents } from "@/db/schema/agents";
import { requireOrganization } from "@/lib/auth/dal";
import { Link } from "@/i18n/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { searchTranscripts, type TranscriptChannel } from "@/lib/search/transcripts";
import { SnippetHighlight } from "@/components/dashboard/search/snippet-highlight";

const PAGE_SIZE = 20;
const CHANNELS: TranscriptChannel[] = ["telegram", "whatsapp", "widget"];

function isTranscriptChannel(value: string | undefined): value is TranscriptChannel {
  return CHANNELS.includes(value as TranscriptChannel);
}

export default async function SearchPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ q?: string; agentId?: string; channel?: string; page?: string }>;
}) {
  const { locale } = await params;
  const { q, agentId, channel, page: pageParam } = await searchParams;
  const { organization } = await requireOrganization(locale);
  const t = await getTranslations("search");

  const orgAgents = await db
    .select({ id: aiAgents.id, name: aiAgents.name })
    .from(aiAgents)
    .where(eq(aiAgents.organizationId, organization.id));

  const trimmedQuery = (q ?? "").trim();
  const page = Math.max(1, Number(pageParam) || 1);
  const selectedChannel = isTranscriptChannel(channel) ? channel : undefined;

  const outcome =
    trimmedQuery.length >= 2
      ? await searchTranscripts({
          organizationId: organization.id,
          query: trimmedQuery,
          agentId: agentId || undefined,
          channel: selectedChannel,
          page,
          pageSize: PAGE_SIZE,
        })
      : null;

  const buildHref = (overridePage: number) => {
    const next = new URLSearchParams();
    if (trimmedQuery) next.set("q", trimmedQuery);
    if (agentId) next.set("agentId", agentId);
    if (selectedChannel) next.set("channel", selectedChannel);
    next.set("page", String(overridePage));
    return `/search?${next.toString()}`;
  };

  const dtf = new Intl.DateTimeFormat(
    locale === "en" ? "en-US" : locale === "ru" ? "ru-RU" : "uz-UZ",
    { dateStyle: "short", timeStyle: "short" },
  );

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold">{t("title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("subtitle")}</p>
      </div>

      <Card className="p-4">
        <form className="flex flex-wrap items-end gap-3" method="GET">
          <div className="relative min-w-[240px] flex-1">
            <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              name="q"
              defaultValue={q ?? ""}
              placeholder={t("placeholder")}
              minLength={2}
              required
              className="h-9 w-full rounded-md border border-input bg-background pl-8 pr-3 text-sm"
            />
          </div>
          <select
            name="agentId"
            defaultValue={agentId ?? ""}
            className="h-9 rounded-md border border-input bg-background px-2 text-sm"
          >
            <option value="">{t("allAgents")}</option>
            {orgAgents.map((agent) => (
              <option key={agent.id} value={agent.id}>
                {agent.name}
              </option>
            ))}
          </select>
          <select
            name="channel"
            defaultValue={selectedChannel ?? ""}
            className="h-9 rounded-md border border-input bg-background px-2 text-sm"
          >
            <option value="">{t("allChannels")}</option>
            {CHANNELS.map((c) => (
              <option key={c} value={c}>
                {t(`channel.${c}`)}
              </option>
            ))}
          </select>
          <Button type="submit" size="sm">
            {t("submit")}
          </Button>
        </form>
      </Card>

      {!outcome ? (
        <p className="py-16 text-center text-sm text-muted-foreground">
          {trimmedQuery.length > 0 ? t("tooShort") : t("emptyState")}
        </p>
      ) : !outcome.ok ? (
        <p className="py-16 text-center text-sm text-destructive">{t("searchError")}</p>
      ) : outcome.results.length === 0 ? (
        <p className="py-16 text-center text-sm text-muted-foreground">{t("noResults")}</p>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            {t("resultsCount", { count: outcome.totalCount })}
          </p>
          <div className="flex flex-col gap-3">
            {outcome.results.map((result) => (
              <Card key={result.messageId} className="p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium">{result.agentName}</p>
                    <span className="rounded bg-muted-foreground/10 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      {result.channel}
                    </span>
                    <span className="text-xs text-muted-foreground">{dtf.format(result.createdAt)}</span>
                  </div>
                  <Link
                    href={`/chats?conversation=${result.conversationId}&message=${result.messageId}`}
                    className="text-xs font-medium text-brand hover:underline"
                  >
                    {t("viewInChat")} →
                  </Link>
                </div>
                <p className="mt-2 text-sm">
                  <SnippetHighlight snippet={result.snippet} />
                </p>
              </Card>
            ))}
          </div>
          <div className="flex items-center justify-between">
            <Link
              href={buildHref(page - 1)}
              className={
                page <= 1
                  ? "pointer-events-none text-sm font-medium text-muted-foreground/50"
                  : "text-sm font-medium text-brand hover:underline"
              }
            >
              ← {t("previous")}
            </Link>
            <Link
              href={buildHref(page + 1)}
              className={
                outcome.totalCount <= page * PAGE_SIZE
                  ? "pointer-events-none text-sm font-medium text-muted-foreground/50"
                  : "text-sm font-medium text-brand hover:underline"
              }
            >
              {t("next")} →
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/app/[locale]/(dashboard)/search/page.tsx src/components/dashboard/search/snippet-highlight.tsx
git commit -m "feat: add /search transcript search page"
```

---

### Task 6: Deep-link from search results into `/chats`

**Files:**
- Modify: `src/components/dashboard/chat/message-bubble.tsx`
- Modify: `src/app/[locale]/(dashboard)/chats/page.tsx`
- Create: `src/components/dashboard/chats/scroll-to-message.tsx`

**Interfaces:**
- Consumes: the `?message=<id>` query param Task 5's result links append to
  `/chats?conversation=...&message=...`.
- Produces: `MessageBubble` now accepts an optional `id?: string` prop; `/chats` reads
  a `message` search param and renders `<ScrollToMessage targetId={...} />` when present.

- [ ] **Step 1: Add an `id` prop to `MessageBubble`**

In `src/components/dashboard/chat/message-bubble.tsx`, change the props type and root
element:

```tsx
import { cn } from "@/lib/utils";

export function MessageBubble({
  role,
  content,
  label,
  id,
}: {
  role: "user" | "assistant" | "system";
  content: string;
  label: string;
  id?: string;
}) {
  const isUser = role === "user";
  return (
    <div id={id} className={cn("flex flex-col gap-1", isUser ? "items-end" : "items-start")}>
      <span className="px-1 text-xs text-muted-foreground">{label}</span>
      <div
        className={cn(
          "max-w-[75%] rounded-2xl px-4 py-2 text-sm whitespace-pre-wrap",
          isUser
            ? "rounded-br-sm bg-brand text-brand-foreground"
            : role === "system"
              ? "rounded-bl-sm border border-dashed border-border text-muted-foreground"
              : "rounded-bl-sm bg-muted text-foreground",
        )}
      >
        {content}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Write the scroll-to-message client component**

Create `src/components/dashboard/chats/scroll-to-message.tsx`:

```tsx
"use client";

import { useEffect } from "react";

export function ScrollToMessage({ targetId }: { targetId: string }) {
  useEffect(() => {
    const el = document.getElementById(targetId);
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [targetId]);

  return null;
}
```

- [ ] **Step 3: Wire it into the chats page**

In `src/app/[locale]/(dashboard)/chats/page.tsx`:

Change the `searchParams` prop type (line 17-20) to also accept `message`:

```tsx
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ conversation?: string; message?: string }>;
}) {
```

Read it alongside `conversation` (line 23):

```tsx
  const { conversation: selectedId, message: targetMessageId } = await searchParams;
```

Add the import (alongside the other component imports near the top):

```tsx
import { ScrollToMessage } from "@/components/dashboard/chats/scroll-to-message";
```

Pass `id` to each `MessageBubble` and render `ScrollToMessage` — replace the
`activeMessages.map(...)` block (lines 183-196) with:

```tsx
                {targetMessageId && <ScrollToMessage targetId={targetMessageId} />}
                {activeMessages.map((message) => (
                  <MessageBubble
                    key={message.id}
                    id={message.id}
                    role={message.role}
                    label={
                      message.role === "user"
                        ? tAssistants("you")
                        : message.role === "assistant"
                          ? tAssistants("assistant")
                          : t("system")
                    }
                    content={message.content}
                  />
                ))}
```

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/components/dashboard/chat/message-bubble.tsx src/app/[locale]/(dashboard)/chats/page.tsx src/components/dashboard/chats/scroll-to-message.tsx
git commit -m "feat: scroll to the linked message when arriving from search"
```

---

### Task 7: E2E coverage and full verification

**Files:**
- Modify: `tests/e2e/assistants.spec.ts`

**Interfaces:**
- Consumes: nothing new — follows the existing unauthenticated-redirect pattern already
  used for every other dashboard-only route in this file (`/assistants`, `/approvals`,
  etc.). No dashboard page in this repo has a logged-in Playwright test (no Clerk test
  session is wired into the e2e setup) — `/chats` itself has none either — so this
  matches the codebase's actual, established test depth for this class of page rather
  than inventing new e2e infrastructure.

- [ ] **Step 1: Add the redirect test**

In `tests/e2e/assistants.spec.ts`, add a new test inside the existing
`describe("assistants (unauthenticated)", ...)` block, after the
`/statistics/marketing` test:

```ts
  test("redirects to sign-in from /search", async ({ page }) => {
    await page.goto("/uz/search");
    await expect(page).toHaveURL(/\/uz\/sign-in/);
  });
```

- [ ] **Step 2: Run the new test**

Run: `npx playwright test tests/e2e/assistants.spec.ts -g "redirects to sign-in from /search"`
Expected: 1 passed.

- [ ] **Step 3: Full verification**

Run: `npx tsc --noEmit && npx vitest run && npx playwright test`
Expected: `tsc` clean; vitest passes including the 4 new `transcripts.test.ts` cases
(pre-existing failures, if any, must not have grown in count); full Playwright suite
passes including the new `/search` redirect test.

- [ ] **Step 4: Commit**

```bash
git add tests/e2e/assistants.spec.ts
git commit -m "test: cover /search unauthenticated redirect"
```
