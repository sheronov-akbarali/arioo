# worken.ru Parity — Phase C, Group 4: Integrations & Analytics Pages Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring `/integrations` and `/statistics` visually in line with worken.ru's design taxonomy (header icon, category filter pills, search, a new per-model spend breakdown) within Arioo's existing data model — no new backend functionality.

**Architecture:** `/integrations` currently renders a static, unfiltered catalog from `INTEGRATION_PROVIDERS` (a plain in-memory array, no DB query) — its filtering is genuinely client-side-only state (no URL params, no server round-trip needed), unlike every other Phase C group so far which filtered DB-backed lists via URL search params. This task moves its rendering into a new `"use client"` component that imports the icon map and static data directly (not via props) and owns search+category state locally. `/statistics` stays a server component; it gains one new aggregation (spend grouped by each agent's configured model) computed from data it already fetches, rendered by a new small presentational component.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Drizzle ORM (Neon Postgres), Tailwind v4, shadcn/ui (`Button`, `Card`, `Badge`), lucide-react icons, next-intl (uz/ru/en).

## Global Constraints

- No new functionality beyond visual/taxonomy polish.
- `/integrations` does NOT get worken's 5-way connection-status stat cards (Active/Need attention/Verifying/In setup/Archived), "Your integrations"/"Discover more" split, or "Local tools (CLI)" section — none of these are representable without a new per-organization connection-tracking table, which is a real backend feature (Phase 4/5), not visual polish.
- `/statistics` does NOT get worken's "Spend by assistant" chart, "Average message cost" card, "Top chats by spend" table, or calendar-style date-range picker — out of scope for this pass (noted as a possible future refinement).
- The one new `/statistics` addition (spend-by-model) must be computed from data ALREADY fetched by the existing `costRows` query (widened by one column, `aiAgents.model`) — no new query, no new DB column.
- `/integrations`' category filter uses local client component state (`useState`), not URL search params — this is a deliberate deviation from the URL-driven filter pattern used in every other Phase C group, because the underlying data (`INTEGRATION_PROVIDERS`) is a static in-memory array with no server round-trip to preserve across a URL.
- Reuse `ListSearchInput` (`src/components/dashboard/list-search-input.tsx`, from Phase C group 1) for the `/integrations` search box.
- All user-visible text ships in uz (default), ru, en — verified by `messages/messages.test.ts`.
- No React component test infrastructure exists in this codebase — verification is `npm run lint`, `npx tsc --noEmit`, `npm run test` (existing suite), `npm run build`, and manual dev-server check (may be blocked by Clerk auth — note in report if unreachable, don't skip silently).

---

### Task 1: Add new translation keys (uz/ru/en)

**Files:**
- Modify: `messages/uz.json`
- Modify: `messages/ru.json`
- Modify: `messages/en.json`
- Test: `messages/messages.test.ts` (existing, no changes needed)

**Interfaces:**
- Produces: translation keys `integrations.searchPlaceholder`, `integrations.categoryFilters.all`, `statistics.modelSpend.title`, `statistics.modelSpend.subtitle` — consumed by Tasks 2–3.

- [ ] **Step 1: Add keys to `messages/uz.json`**

Inside the top-level `"integrations"` object (sibling of `"title"`, `"subtitle"`, `"connect"`, `"comingSoon"`, `"categories"`, `"providers"`), add:

```json
"searchPlaceholder": "Nomi bo'yicha qidirish...",
"categoryFilters": {
  "all": "Hammasi"
}
```

Inside the top-level `"statistics"` object, add a new nested object (sibling of `"cards"`, `"dailySpendChart"`, `"threadsChart"`, `"comparison"`, `"forecast"`):

```json
"modelSpend": {
  "title": "Model bo'yicha xarajat",
  "subtitle": "Tanlangan davr uchun modellar bo'yicha xarajat taqsimoti"
}
```

- [ ] **Step 2: Add the same keys to `messages/ru.json`**

`integrations.searchPlaceholder`: `"Поиск по названию..."`
`integrations.categoryFilters.all`: `"Все"`
`statistics.modelSpend`: `{ "title": "Расходы по моделям", "subtitle": "Распределение расходов по моделям за выбранный период" }`

- [ ] **Step 3: Add the same keys to `messages/en.json`**

`integrations.searchPlaceholder`: `"Search by name..."`
`integrations.categoryFilters.all`: `"All"`
`statistics.modelSpend`: `{ "title": "Spend by model", "subtitle": "Spend distribution by model for the selected period" }`

- [ ] **Step 4: Run the key-parity test**

Run: `npm run test -- messages/messages.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add messages/uz.json messages/ru.json messages/en.json
git commit -m "i18n: add Phase C group 4 integrations/analytics translation keys"
```

---

### Task 2: `/integrations` — header icon, category filter, search

**Files:**
- Create: `src/components/dashboard/integrations/integrations-grid.tsx`
- Modify: `src/app/[locale]/(dashboard)/integrations/page.tsx`

**Interfaces:**
- Consumes: `ListSearchInput` (`src/components/dashboard/list-search-input.tsx`, props `{ placeholder: string; value: string; onChange: (value: string) => void }`), `INTEGRATION_PROVIDERS`/`IntegrationCategory` (`src/lib/integrations-data.ts`), translation keys `integrations.searchPlaceholder`, `integrations.categoryFilters.all` (Task 1).
- Produces: `IntegrationsGrid` — `"use client"`, no props (imports its own data and icon map). Renders the search input, category-filter pill row, and the provider card grid.

Read the current file first (`src/app/[locale]/(dashboard)/integrations/page.tsx`) to see its exact current shape — it's a server component with an `ICONS` map keyed by provider id, rendering `INTEGRATION_PROVIDERS.map(...)` directly into a card grid with category badges and a disabled "Connect" button per card.

- [ ] **Step 1: Write `IntegrationsGrid`**

```tsx
"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  Send,
  MessageCircle,
  Globe,
  ShoppingBag,
  Phone,
  Building2,
  FileSpreadsheet,
  GitBranch,
  Webhook,
} from "lucide-react";
import { INTEGRATION_PROVIDERS, type IntegrationCategory } from "@/lib/integrations-data";
import { ListSearchInput } from "@/components/dashboard/list-search-input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  telegram: Send,
  whatsapp: MessageCircle,
  websiteWidget: Globe,
  olx: ShoppingBag,
  sip: Phone,
  amocrm: Building2,
  bitrix24: Building2,
  googleWorkspace: FileSpreadsheet,
  github: GitBranch,
  oneC: Building2,
  customMcp: Webhook,
};

export function IntegrationsGrid() {
  const t = useTranslations("integrations");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<IntegrationCategory | null>(null);

  const availableCategories = [...new Set(INTEGRATION_PROVIDERS.flatMap((provider) => provider.categories))];

  const filtered = INTEGRATION_PROVIDERS.filter((provider) => {
    const matchesCategory = !category || provider.categories.includes(category);
    const matchesQuery = t(`providers.${provider.id}.name`)
      .toLowerCase()
      .includes(query.trim().toLowerCase());
    return matchesCategory && matchesQuery;
  });

  return (
    <div className="flex flex-col gap-4">
      <ListSearchInput placeholder={t("searchPlaceholder")} value={query} onChange={setQuery} />
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant={!category ? "default" : "outline"} onClick={() => setCategory(null)}>
          {t("categoryFilters.all")}
        </Button>
        {availableCategories.map((cat) => (
          <Button
            key={cat}
            size="sm"
            variant={category === cat ? "default" : "outline"}
            onClick={() => setCategory(cat)}
          >
            {t(`categories.${cat}`)}
          </Button>
        ))}
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((provider) => {
          const Icon = ICONS[provider.id];
          return (
            <Card key={provider.id}>
              <CardContent className="flex flex-col gap-3 pt-6">
                <div className="flex items-center gap-3">
                  <span className="flex size-10 items-center justify-center rounded-lg bg-brand/10 text-brand">
                    <Icon className="size-5" />
                  </span>
                  <div>
                    <p className="font-medium">{t(`providers.${provider.id}.name`)}</p>
                    <p className="text-xs text-muted-foreground">{t(`providers.${provider.id}.description`)}</p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex gap-1">
                    {provider.categories.map((cat) => (
                      <Badge key={cat} variant="outline" className="text-xs">
                        {t(`categories.${cat}`)}
                      </Badge>
                    ))}
                  </div>
                  <Button size="sm" variant="outline" disabled>
                    {t("connect")}
                    <span className="ml-1 text-xs opacity-70">{t("comingSoon")}</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Rewrite the page to use it, and add the header icon**

Replace the full contents of `src/app/[locale]/(dashboard)/integrations/page.tsx` with:

```tsx
import { getTranslations } from "next-intl/server";
import { LayoutGrid } from "lucide-react";
import { IntegrationsGrid } from "@/components/dashboard/integrations/integrations-grid";

export default async function IntegrationsPage() {
  const t = await getTranslations("integrations");

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand">
          <LayoutGrid className="size-5" />
        </span>
        <div>
          <h1 className="text-xl font-semibold">{t("title")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>
      </div>
      <IntegrationsGrid />
    </div>
  );
}
```

- [ ] **Step 3: Type-check and lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: no errors.

- [ ] **Step 4: Manual verification**

Run: `npm run dev`, open `/uz/integrations` (requires auth — note in report if unreachable). If reachable: confirm the icon square renders before the title, the category-filter row toggles which provider cards are shown, and the search box filters by provider name — both filters combine (AND, not OR).

- [ ] **Step 5: Commit**

```bash
git add src/components/dashboard/integrations/integrations-grid.tsx "src/app/[locale]/(dashboard)/integrations/page.tsx"
git commit -m "feat(integrations): add header icon, category filter, and search"
```

---

### Task 3: `/statistics` — header icon, spend-by-model breakdown

**Files:**
- Create: `src/components/dashboard/statistics/model-spend-breakdown.tsx`
- Modify: `src/app/[locale]/(dashboard)/statistics/page.tsx`

**Interfaces:**
- Consumes: translation keys `statistics.modelSpend.title`, `statistics.modelSpend.subtitle` (Task 1).
- Produces: `ModelSpendBreakdown` — plain server-safe component (no `"use client"`, no interactivity), props `{ rows: Array<{ model: string; costUsd: number; percent: number }> }`.

Read the current file first (`src/app/[locale]/(dashboard)/statistics/page.tsx`) to confirm its exact current shape — in particular the `costRows` query and the loop that builds `dailyCost`/`currentTotal`/`previousTotal` from it, since this task widens both.

- [ ] **Step 1: Write `ModelSpendBreakdown`**

```tsx
type ModelSpendRow = { model: string; costUsd: number; percent: number };

function formatUsd(value: number): string {
  return `$${value.toFixed(2)}`;
}

export function ModelSpendBreakdown({ rows }: { rows: ModelSpendRow[] }) {
  return (
    <div className="flex flex-col gap-3">
      {rows.map((row) => (
        <div key={row.model} className="flex flex-col gap-1">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">{row.model}</span>
            <span className="text-muted-foreground">
              {formatUsd(row.costUsd)} ({row.percent.toFixed(1)}%)
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-brand" style={{ width: `${row.percent}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Widen the `costRows` query to select the agent's model**

Find the existing `costRows` query:

```tsx
const costRows = await db
  .select({
    costUsd: messages.estimatedCostUsd,
    createdAt: messages.createdAt,
    conversationId: messages.conversationId,
  })
  .from(messages)
  .innerJoin(conversations, eq(messages.conversationId, conversations.id))
  .innerJoin(aiAgents, eq(conversations.agentId, aiAgents.id))
  .where(
    and(
      eq(aiAgents.organizationId, organization.id),
      eq(messages.role, "assistant"),
      isNotNull(messages.estimatedCostUsd),
      gte(messages.createdAt, previousStart),
    ),
  );
```

Add `model: aiAgents.model` to the `.select({...})` object (as an additional field, alongside the existing three).

- [ ] **Step 3: Accumulate per-model spend in the existing loop**

Find the existing loop:

```tsx
const dailyCost = new Map<string, number>();
let currentTotal = 0;
let previousTotal = 0;
for (const row of costRows) {
  const cost = row.costUsd ?? 0;
  if (row.createdAt >= currentStart) {
    currentTotal += cost;
    const key = dayKey(row.createdAt);
    dailyCost.set(key, (dailyCost.get(key) ?? 0) + cost);
  } else {
    previousTotal += cost;
  }
}
```

Add a `costByModel` map, declared alongside `dailyCost`, and accumulate into it inside the `if (row.createdAt >= currentStart)` branch (current-period rows only — the model breakdown is for the selected period, matching `currentTotal`, not the comparison period):

```tsx
const dailyCost = new Map<string, number>();
const costByModel = new Map<string, number>();
let currentTotal = 0;
let previousTotal = 0;
for (const row of costRows) {
  const cost = row.costUsd ?? 0;
  if (row.createdAt >= currentStart) {
    currentTotal += cost;
    const key = dayKey(row.createdAt);
    dailyCost.set(key, (dailyCost.get(key) ?? 0) + cost);
    costByModel.set(row.model, (costByModel.get(row.model) ?? 0) + cost);
  } else {
    previousTotal += cost;
  }
}
```

- [ ] **Step 4: Build the sorted, percent-labeled rows for the component**

After the `forecastTotal` calculation (and before the `return`), add:

```tsx
const modelSpendRows = [...costByModel.entries()]
  .map(([model, costUsd]) => ({
    model,
    costUsd,
    percent: currentTotal > 0 ? (costUsd / currentTotal) * 100 : 0,
  }))
  .sort((a, b) => b.costUsd - a.costUsd);
```

- [ ] **Step 5: Add the header icon**

Add `BarChart3` to the (currently absent) lucide-react import — this file has no lucide-react import today, add the line:

```tsx
import { BarChart3 } from "lucide-react";
```

Replace the existing header `<div>` (the `flex flex-wrap items-start justify-between gap-4` block containing `<h1>`/`<p>` and `<ExportCsvButton>`) — keep the `<ExportCsvButton>` where it is, only wrap the title/subtitle side:

```tsx
<div className="flex flex-wrap items-start justify-between gap-4">
  <div className="flex items-start gap-3">
    <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand">
      <BarChart3 className="size-5" />
    </span>
    <div>
      <h1 className="text-xl font-semibold">{t("title")}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{t("subtitle")}</p>
    </div>
  </div>
  <ExportCsvButton rows={csvRows} label={t("export")} />
</div>
```

- [ ] **Step 6: Render the new card**

Add the import:

```tsx
import { ModelSpendBreakdown } from "@/components/dashboard/statistics/model-spend-breakdown";
```

Immediately after the existing daily-spend-chart `<Card>` block (the one titled `t("dailySpendChart.title")`) and before the `<div className="grid gap-4 lg:grid-cols-2">` comparison/forecast block, add — only when there is data to show:

```tsx
{modelSpendRows.length > 0 && (
  <Card>
    <CardHeader>
      <CardTitle>{t("modelSpend.title")}</CardTitle>
      <p className="text-sm text-muted-foreground">{t("modelSpend.subtitle")}</p>
    </CardHeader>
    <CardContent>
      <ModelSpendBreakdown rows={modelSpendRows} />
    </CardContent>
  </Card>
)}
```

- [ ] **Step 7: Type-check and lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: no errors.

- [ ] **Step 8: Manual verification**

Run: `npm run dev`, open `/uz/statistics` (requires auth — note in report if unreachable). If reachable: confirm the icon square renders before the title, and — if there is any assistant-message spend in the selected period — a "Model bo'yicha xarajat" card appears between the daily-spend chart and the comparison/forecast row, listing each model with its cost, percentage, and a proportional bar. Confirm the card is absent when there's zero spend in the period.

- [ ] **Step 9: Commit**

```bash
git add src/components/dashboard/statistics/model-spend-breakdown.tsx "src/app/[locale]/(dashboard)/statistics/page.tsx"
git commit -m "feat(statistics): add header icon and spend-by-model breakdown"
```

---

### Task 4: Full-suite verification

**Files:** none (verification only)

- [ ] **Step 1: Run the full test suite**

Run: `npm run test`
Expected: PASS (44+ tests, including the Task 1 translation-parity coverage)

- [ ] **Step 2: Run lint and type-check across the whole project**

Run: `npm run lint && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Run a production build**

Run: `npm run build`
Expected: build succeeds (also confirms `IntegrationsGrid`'s client/server boundary is sound).

- [ ] **Step 4: Manual pass over both pages in both themes**

Run: `npm run dev`, visit `/uz/integrations` and `/uz/statistics` in both light and dark mode, and repeat for `/ru/...` and `/en/...` to confirm no missing-translation fallback text appears. This requires authentication — if the verifier cannot sign in, report that explicitly rather than skipping silently; the controller/human partner can complete this check separately.

- [ ] **Step 5: Commit (only if Step 4 required fixes)**

If manual verification surfaced no issues, no commit is needed for this task. If fixes were made, commit them with a message describing what was fixed.
