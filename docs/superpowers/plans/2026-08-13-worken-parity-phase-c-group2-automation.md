# worken.ru Parity — Phase C, Group 2: Automation Pages Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring `/routines`, `/approvals`, `/runs` visually in line with worken.ru's design taxonomy (header icons, a last-fired column, status-count badges, agent/type filters) within Arioo's existing data model — no new backend functionality.

**Architecture:** All three pages stay server components. `/routines` and `/runs` gain a header icon and small data additions computed from existing tables. `/approvals` gains per-status counts (one extra grouped query) and a server-rendered GET-form text search over the `type` column — matching worken's own submit-based search UX, not instant client-side filtering. `/runs` gains agent filter pills using the exact `Link`+`href()` pattern already proven in `/approvals`.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Drizzle ORM (Neon Postgres), Tailwind v4, shadcn/ui (`Button`, `Card`, `Badge`), lucide-react icons, next-intl (uz/ru/en).

## Global Constraints

- No new functionality beyond visual/taxonomy polish — per `docs/superpowers/specs/2026-08-13-worken-parity-phase-c-group2-automation-design.md`.
- `/routines`' "last fired" column always renders `—` (no trigger engine exists yet — `routines` table has no last-fired timestamp column; do not add one, that's a schema change).
- Worken's 3-way approval source filter (routines/chats-and-voice/agent-questions) stays 2-way (`routines`/`chats`) — Arioo's data model has no "agent questions" category. Do not invent one.
- `/runs`' Mode/Status/Error columns from worken's `/workflows` are NOT added — Arioo's `/runs` is conceptually a conversation cost/activity summary, not a workflow-execution log. Keep existing columns (Agent, Started, Last Activity, Messages, Cost) unchanged.
- The existing `/routines` inline creation form stays as-is (not converted to a modal/button flow).
- All user-visible text ships in uz (default), ru, en — verified by `messages/messages.test.ts`.
- No React component test infrastructure exists in this codebase (no RTL/jsdom) — verification is `npm run lint`, `npx tsc --noEmit`, `npm run test` (existing suite), `npm run build`, and manual dev-server check.
- Reuse existing shadcn primitives (`Button`, `Badge`, `Card`) and the existing `Link`-based `href()` filter-pill pattern from `/approvals` — do not introduce a new filter-pill component.

---

### Task 1: Add new translation keys (uz/ru/en)

**Files:**
- Modify: `messages/uz.json`
- Modify: `messages/ru.json`
- Modify: `messages/en.json`
- Test: `messages/messages.test.ts` (existing, no changes needed)

**Interfaces:**
- Produces: translation keys `routines.table.lastFired`, `routines.foundCount`, `approvals.search.placeholder`, `approvals.search.apply`, `runs.agentFilters.all` — consumed by Tasks 2–4.

- [ ] **Step 1: Add keys to `messages/uz.json`**

Inside the top-level `"routines"` object, inside the existing nested `"table"` object (sibling of `"name"`, `"trigger"`, `"resource"`, `"status"`), add:

```json
"lastFired": "So'nggi ishga tushish"
```

Inside the top-level `"routines"` object (sibling of `"table"`), add:

```json
"foundCount": "{count} ta rutina topildi"
```

Inside the top-level `"approvals"` object, add a new nested `"search"` object (sibling of `"statusFilters"`, `"sourceFilters"`):

```json
"search": {
  "placeholder": "Tur bo'yicha qidirish...",
  "apply": "Qo'llash"
}
```

Inside the top-level `"runs"` object, add a new nested `"agentFilters"` object (sibling of `"agent"`, `"started"`, etc.):

```json
"agentFilters": {
  "all": "Hammasi"
}
```

- [ ] **Step 2: Add the same keys to `messages/ru.json`**

`routines.table.lastFired`: `"Сработала"`
`routines.foundCount`: `"Найдено рутин: {count}"`
`approvals.search`: `{ "placeholder": "Поиск по типу...", "apply": "Применить" }`
`runs.agentFilters.all`: `"Все"`

- [ ] **Step 3: Add the same keys to `messages/en.json`**

`routines.table.lastFired`: `"Last fired"`
`routines.foundCount`: `"{count} routines found"`
`approvals.search`: `{ "placeholder": "Search by type...", "apply": "Apply" }`
`runs.agentFilters.all`: `"All"`

- [ ] **Step 4: Run the key-parity test**

Run: `npm run test -- messages/messages.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add messages/uz.json messages/ru.json messages/en.json
git commit -m "i18n: add Phase C group 2 automation-page translation keys"
```

---

### Task 2: `/routines` — header icon, last-fired column, found-count line

**Files:**
- Modify: `src/app/[locale]/(dashboard)/routines/page.tsx`

**Interfaces:**
- Consumes: `routines.table.lastFired`, `routines.foundCount` (Task 1).
- Produces: no new exports; page-local change.

Read the current file first (`src/app/[locale]/(dashboard)/routines/page.tsx`) to confirm the exact current shape before editing — it fetches `rows` via Drizzle, renders an inline creation form, then either an icon empty-state or a table with 4 columns (Nomi/Trigger/Resurs/Holat).

- [ ] **Step 1: Add the header icon**

Add `Repeat2` is already imported (used in the empty-state icon). Wrap the existing `<h1>`/`<p>` header block with an icon square, matching the pattern already used in `/calls` and `/assistants` from Phase C group 1:

```tsx
<div className="flex items-start gap-3">
  <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand">
    <Repeat2 className="size-5" />
  </span>
  <div>
    <h1 className="text-xl font-semibold">{t("title")}</h1>
    <p className="mt-1 text-sm text-muted-foreground">{t("subtitle")}</p>
    <Badge variant="outline" className="mt-3">
      {t("engineNotice")}
    </Badge>
  </div>
</div>
```

This replaces the existing plain `<div>` wrapper that currently holds the `<h1>`, `<p>`, and `<Badge>` — keep the `<Badge>` with `engineNotice` exactly as it is today, just nested inside the new icon-row `<div>`.

- [ ] **Step 2: Add the found-count line above the table**

Immediately before the `{rows.length === 0 ? (...) : (...)}` conditional, add:

```tsx
{rows.length > 0 && (
  <p className="text-sm text-muted-foreground">{t("foundCount", { count: rows.length })}</p>
)}
```

- [ ] **Step 3: Add the "last fired" column to the table**

In the `<thead>`, after the existing `<th>` for `{t("table.status")}`, add:

```tsx
<th className="px-4 py-3 font-medium">{t("table.lastFired")}</th>
```

In the `<tbody>` row mapping, after the existing `<td>` containing the status `<Badge>`, add:

```tsx
<td className="px-4 py-3 text-muted-foreground">—</td>
```

(A literal em-dash — the `routines` table has no last-fired timestamp column since the trigger engine doesn't exist yet; this mirrors the existing `engineNotice` badge's honesty about that.)

- [ ] **Step 4: Type-check and lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: no errors.

- [ ] **Step 5: Manual verification**

Run: `npm run dev`, open `/uz/routines` (requires auth — note in report if this can't be reached; the controller will verify manually later). If reachable: confirm the icon square renders before the title, the found-count line appears only when there's at least one routine, and the table has 5 columns with the last one always showing `—`.

- [ ] **Step 6: Commit**

```bash
git add "src/app/[locale]/(dashboard)/routines/page.tsx"
git commit -m "feat(routines): add header icon, found-count line, and last-fired column"
```

---

### Task 3: `/approvals` — header icon, status-count badges, type search

**Files:**
- Modify: `src/app/[locale]/(dashboard)/approvals/page.tsx`

**Interfaces:**
- Consumes: `approvals.search.placeholder`, `approvals.search.apply` (Task 1).
- Produces: no new exports; page-local change.

Read the current file first (`src/app/[locale]/(dashboard)/approvals/page.tsx`) — it destructures `status`/`source` from `searchParams`, builds `activeStatus`/`activeSource`, queries `rows`, defines an `href()` helper for building filter links, and renders: header, source-filter pill row, status-filter pill row, then either an empty state or a `<ul>` of approval rows with approve/reject forms.

- [ ] **Step 1: Add `search` to the searchParams type and destructuring**

Change:

```tsx
searchParams: Promise<{ status?: string; source?: string }>;
```

to:

```tsx
searchParams: Promise<{ status?: string; source?: string; search?: string }>;
```

Change:

```tsx
const { status, source } = await searchParams;
```

to:

```tsx
const { status, source, search } = await searchParams;
```

Add, near the `activeStatus`/`activeSource` declarations:

```tsx
const activeSearch = search?.trim() ?? "";
```

- [ ] **Step 2: Add the `ilike` import and apply the search filter to the query**

Change the drizzle-orm import line from:

```tsx
import { desc, eq, and, isNull, isNotNull } from "drizzle-orm";
```

to:

```tsx
import { desc, eq, and, isNull, isNotNull, ilike, sql } from "drizzle-orm";
```

In the `db.select(...).where(and(...))` call, add a fourth condition inside the `and(...)` (after the existing three, before the closing paren):

```tsx
activeSearch ? ilike(approvals.type, `%${activeSearch}%`) : undefined,
```

- [ ] **Step 3: Add the status-count query**

After the existing `rows` query (and before the `href()` function), add:

```tsx
const statusCounts = await db
  .select({ status: approvals.status, count: sql<number>`count(*)::int` })
  .from(approvals)
  .innerJoin(aiAgents, eq(approvals.agentId, aiAgents.id))
  .where(eq(aiAgents.organizationId, organization.id))
  .groupBy(approvals.status);
const countByStatus = new Map(statusCounts.map((row) => [row.status, row.count]));
```

(This count is intentionally scoped by organization only — not by the currently active status/source/search filters — so every status pill always shows its true total, matching worken.ru's behavior where switching one filter doesn't change the other pills' counts.)

- [ ] **Step 4: Render the count badge on each status filter button**

Find the `STATUS_FILTERS.map((s) => (...))` block that renders the per-status `<Button>` elements. Change:

```tsx
{STATUS_FILTERS.map((s) => (
  <Button
    key={s}
    size="sm"
    variant={activeStatus === s ? "default" : "outline"}
    nativeButton={false}
    render={<Link href={href({ status: s })}>{t(`status.${s}`)}</Link>}
  />
))}
```

to:

```tsx
{STATUS_FILTERS.map((s) => (
  <Button
    key={s}
    size="sm"
    variant={activeStatus === s ? "default" : "outline"}
    nativeButton={false}
    render={
      <Link href={href({ status: s })}>
        {t(`status.${s}`)} ({countByStatus.get(s) ?? 0})
      </Link>
    }
  />
))}
```

- [ ] **Step 5: Add the search form**

Immediately after the two existing filter-pill `<div>` blocks (source filters and status filters), before the `{rows.length === 0 ? (...) : (...)}` conditional, add:

```tsx
<form action={`/${locale}/approvals`} method="get" className="flex gap-2">
  {activeStatus && <input type="hidden" name="status" value={activeStatus} />}
  {activeSource && <input type="hidden" name="source" value={activeSource} />}
  <input
    type="text"
    name="search"
    defaultValue={activeSearch}
    placeholder={t("search.placeholder")}
    className="h-8 w-full max-w-xs rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
  />
  <Button type="submit" size="sm" variant="outline">
    {t("search.apply")}
  </Button>
</form>
```

This is a plain HTML GET form (no client component, no JS required) — submitting it navigates to `/{locale}/approvals?status=...&source=...&search=...`, re-running the server component with the new `search` param. This mirrors worken.ru's own submit-based search (its "Применить" button), not instant-as-you-type filtering.

- [ ] **Step 6: Add the header icon**

`CheckCircle2` is already imported (used in the empty-state icon). Wrap the existing `<h1>`/`<p>` header block:

```tsx
<div className="flex items-start gap-3">
  <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand">
    <CheckCircle2 className="size-5" />
  </span>
  <div>
    <h1 className="text-xl font-semibold">{t("title")}</h1>
    <p className="mt-1 text-sm text-muted-foreground">{t("subtitle")}</p>
  </div>
</div>
```

- [ ] **Step 7: Type-check and lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: no errors.

- [ ] **Step 8: Manual verification**

Run: `npm run dev`, open `/uz/approvals` (requires auth — note in report if unreachable). If reachable: confirm each status pill shows a count in parentheses, the search form submits and re-filters the list by `type` substring while preserving the active status/source filters, and the icon square renders before the title.

- [ ] **Step 9: Commit**

```bash
git add "src/app/[locale]/(dashboard)/approvals/page.tsx"
git commit -m "feat(approvals): add header icon, status-count badges, and type search"
```

---

### Task 4: `/runs` — header icon, agent filter pills

**Files:**
- Modify: `src/app/[locale]/(dashboard)/runs/page.tsx`

**Interfaces:**
- Consumes: `runs.agentFilters.all` (Task 1).
- Produces: no new exports; page-local change.

Read the current file first (`src/app/[locale]/(dashboard)/runs/page.tsx`) — it fetches `threads` (joined conversations+agents) and a per-thread `stats` map (message count, cost, last activity) via Drizzle, then renders a header and either an empty state or a table with 5 columns.

- [ ] **Step 1: Add the `agentId` searchParam and fetch the full agent list**

Change the function signature from:

```tsx
export default async function RunsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
```

to:

```tsx
export default async function RunsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ agentId?: string }>;
}) {
  const { locale } = await params;
  const { agentId } = await searchParams;
```

Add the `aiAgents` import needed for the full agent list (the file already imports `aiAgents` for the join — reuse it) and, after `requireOrganization`, add a query for all agents in the org (for rendering every pill regardless of the current filter):

```tsx
const orgAgents = await db
  .select({ id: aiAgents.id, name: aiAgents.name })
  .from(aiAgents)
  .where(eq(aiAgents.organizationId, organization.id));
```

- [ ] **Step 2: Apply the agent filter to the existing threads query**

Find the existing `threads` query:

```tsx
const threads = await db
  .select({ conversation: conversations, agentId: aiAgents.id, agentName: aiAgents.name })
  .from(conversations)
  .innerJoin(aiAgents, eq(conversations.agentId, aiAgents.id))
  .where(eq(aiAgents.organizationId, organization.id))
  .orderBy(desc(conversations.startedAt));
```

Change the `drizzle-orm` import line from:

```tsx
import { desc, eq, inArray } from "drizzle-orm";
```

to:

```tsx
import { desc, eq, inArray, and } from "drizzle-orm";
```

Change the query's `.where(...)` to:

```tsx
.where(
  and(
    eq(aiAgents.organizationId, organization.id),
    agentId ? eq(aiAgents.id, agentId) : undefined,
  ),
)
```

- [ ] **Step 3: Add the filter-pill row and header icon**

`Activity` is already imported (used in the empty-state icon). `Link` is already imported (used for the agent-name link in the table). Add the `Button` import:

```tsx
import { Button } from "@/components/ui/button";
```

Replace the existing header `<div>` (containing just `<h1>`/`<p>`) with:

```tsx
<div className="flex items-start gap-3">
  <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand">
    <Activity className="size-5" />
  </span>
  <div>
    <h1 className="text-xl font-semibold">{t("title")}</h1>
    <p className="mt-1 text-sm text-muted-foreground">{t("subtitle")}</p>
  </div>
</div>
```

Immediately after that header block, before the `{threads.length === 0 ? (...) : (...)}` conditional, add the filter-pill row (only rendered when there's more than one agent — a single-agent org has nothing to filter):

```tsx
{orgAgents.length > 1 && (
  <div className="flex flex-wrap gap-2">
    <Button
      size="sm"
      variant={!agentId ? "default" : "outline"}
      nativeButton={false}
      render={<Link href="/runs">{t("agentFilters.all")}</Link>}
    />
    {orgAgents.map((agent) => (
      <Button
        key={agent.id}
        size="sm"
        variant={agentId === agent.id ? "default" : "outline"}
        nativeButton={false}
        render={<Link href={`/runs?agentId=${agent.id}`}>{agent.name}</Link>}
      />
    ))}
  </div>
)}
```

- [ ] **Step 4: Type-check and lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: no errors.

- [ ] **Step 5: Manual verification**

Run: `npm run dev`, open `/uz/runs` (requires auth — note in report if unreachable). If reachable and there's more than one agent: confirm the pill row appears, clicking an agent pill filters the table to that agent's conversations, and clicking "Hammasi" clears the filter. With 0 or 1 agents, confirm the pill row is absent (not an empty row).

- [ ] **Step 6: Commit**

```bash
git add "src/app/[locale]/(dashboard)/runs/page.tsx"
git commit -m "feat(runs): add header icon and agent filter pills"
```

---

### Task 5: Full-suite verification

**Files:** none (verification only)

- [ ] **Step 1: Run the full test suite**

Run: `npm run test`
Expected: PASS (44+ tests, including the Task 1 translation-parity coverage)

- [ ] **Step 2: Run lint and type-check across the whole project**

Run: `npm run lint && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Run a production build**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 4: Manual pass over all three pages in both themes**

Run: `npm run dev`, visit `/uz/routines`, `/uz/approvals`, `/uz/runs` in both light and dark mode, and repeat for `/ru/...` and `/en/...` to confirm no missing-translation fallback text appears. This requires authentication — if the verifier cannot sign in, report that explicitly rather than skipping silently; the controller/human partner can complete this check separately.

- [ ] **Step 5: Commit (only if Step 4 required fixes)**

If manual verification surfaced no issues, no commit is needed for this task. If fixes were made, commit them with a message describing what was fixed.
