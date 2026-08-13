# worken.ru Parity — Phase C, Group 3: Commerce Pages Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring `/products` and `/billing` visually in line with worken.ru's design taxonomy (header icons, status/type filter pills with counts, name search, split payment/expense history) within Arioo's existing data model — no new backend functionality.

**Architecture:** Both pages stay server components. `/products` gains the exact status-count-badge + GET-form-search pattern already proven on `/approvals` in Phase C group 2 (including its lesson: use the shared `Input` component from the start, not a raw `<input>`), plus a second, count-free type filter row modeled on `/approvals`' source-filter row. `/billing` gains a pure display-layer split of its already-fetched `transactions` array into two tables by `amount` sign — no new query.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Drizzle ORM (Neon Postgres), Tailwind v4, shadcn/ui (`Button`, `Input`, `Badge`, `Card`), lucide-react icons, next-intl (uz/ru/en).

## Global Constraints

- No new functionality beyond visual/taxonomy polish — per `docs/superpowers/specs/2026-08-13-worken-parity-phase-c-group3-commerce-design.md`.
- `/products`' table stays 4 columns (Name/Type/Status/Price) — worken's extra columns (Channels/Operations/Dialogs/Updated) are NOT added; they require new backend linkage.
- No new `productType` enum value ("Media") is added — that's a schema change.
- Worken's elaborate 4-scenario-card empty state on `/products` is NOT replicated — keep the existing simple icon empty-state.
- `/products`' inline creation form stays untouched.
- `/billing`'s split into Payment/Expense history is a pure client-of-existing-data display change: filter the SAME already-fetched `transactions` array by `amount >= 0` vs `amount < 0`. Do not add a new query or a new DB column.
- `/billing`'s Chat/Model expense columns from worken are NOT added — that data isn't stored on `creditTransactions`.
- `/billing`'s plan/balance/bonus/storage card layout stays as separate cards (not merged into one box like worken) — this is a layout-restructure, out of scope for polish-only work.
- Reuse the shared `Input` component (`@/components/ui/input`) for any new text input — a prior task in Group 2 shipped a raw `<input>` by mistake and had to fix it in a follow-up review; do not repeat that here.
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
- Produces: translation keys `products.statusFilters.all`, `products.typeFilters.all`, `products.search.placeholder`, `products.search.apply`, `billing.history.expenseTitle`, `billing.history.expenseEmpty` — consumed by Tasks 2–3.

- [ ] **Step 1: Add keys to `messages/uz.json`**

Inside the top-level `"products"` object, add two new nested objects (siblings of `"form"`, `"types"`, `"status"`, `"table"`) and one more nested object:

```json
"statusFilters": {
  "all": "Hammasi"
},
"typeFilters": {
  "all": "Hammasi"
},
"search": {
  "placeholder": "Nomi bo'yicha qidirish...",
  "apply": "Qo'llash"
}
```

Inside the top-level `"billing"` object, inside the existing nested `"history"` object (sibling of `"title"`, `"date"`, `"description"`, `"type"`, `"amount"`, `"empty"`, `"types"`), add:

```json
"expenseTitle": "Xarajatlar tarixi",
"expenseEmpty": "Hozircha xarajatlar topilmadi."
```

- [ ] **Step 2: Add the same keys to `messages/ru.json`**

`products.statusFilters.all`: `"Все"`
`products.typeFilters.all`: `"Все"`
`products.search`: `{ "placeholder": "Поиск по названию...", "apply": "Применить" }`
`billing.history.expenseTitle`: `"История расходов"`
`billing.history.expenseEmpty`: `"Расходов пока не найдено."`

- [ ] **Step 3: Add the same keys to `messages/en.json`**

`products.statusFilters.all`: `"All"`
`products.typeFilters.all`: `"All"`
`products.search`: `{ "placeholder": "Search by name...", "apply": "Apply" }`
`billing.history.expenseTitle`: `"Expense history"`
`billing.history.expenseEmpty`: `"No expenses found yet."`

- [ ] **Step 4: Run the key-parity test**

Run: `npm run test -- messages/messages.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add messages/uz.json messages/ru.json messages/en.json
git commit -m "i18n: add Phase C group 3 commerce-page translation keys"
```

---

### Task 2: `/products` — header icon, status/type filter pills, name search

**Files:**
- Modify: `src/app/[locale]/(dashboard)/products/page.tsx`

**Interfaces:**
- Consumes: `products.statusFilters.all`, `products.typeFilters.all`, `products.search.placeholder`, `products.search.apply` (Task 1).
- Produces: no new exports; page-local change.

Read the current file first (`src/app/[locale]/(dashboard)/products/page.tsx`) to confirm its exact current shape — it has no `searchParams` today, fetches `rows` via a simple `.where(eq(products.organizationId, ...))`, and renders header → inline creation form → (empty state | table).

- [ ] **Step 1: Widen the function signature and imports**

Change:

```tsx
export default async function ProductsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
```

to:

```tsx
export default async function ProductsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ status?: string; type?: string; search?: string }>;
}) {
  const { locale } = await params;
  const { status, type, search } = await searchParams;
```

Change the `drizzle-orm` import line from:

```tsx
import { desc, eq } from "drizzle-orm";
```

to:

```tsx
import { desc, eq, and, ilike, sql } from "drizzle-orm";
```

Add the `Link` import (this file doesn't have one yet):

```tsx
import { Link } from "@/i18n/navigation";
```

Change the schema import line from:

```tsx
import { products, productType } from "@/db/schema/products";
```

to:

```tsx
import { products, productType, productStatus } from "@/db/schema/products";
```

(`productStatus` is not currently imported in this file — only `productType` is, used by the creation form's `<select>`. Step 5 below needs `productStatus.enumValues`.)

- [ ] **Step 2: Compute active filters and apply them to the query**

After `const action = createProductAction.bind(null, locale);`, add:

```tsx
const activeStatus = productStatus.enumValues.find((s) => s === status);
const activeType = productType.enumValues.find((ty) => ty === type);
const activeSearch = search?.trim() ?? "";
```

Change the existing `rows` query's `.where(...)` from:

```tsx
.where(eq(products.organizationId, organization.id))
```

to:

```tsx
.where(
  and(
    eq(products.organizationId, organization.id),
    activeStatus ? eq(products.status, activeStatus) : undefined,
    activeType ? eq(products.type, activeType) : undefined,
    activeSearch ? ilike(products.name, `%${activeSearch}%`) : undefined,
  ),
)
```

- [ ] **Step 3: Add the status-count query and the `href()` helper**

After the `rows` query (and before the `return`), add:

```tsx
const statusCounts = await db
  .select({ status: products.status, count: sql<number>`count(*)::int` })
  .from(products)
  .where(eq(products.organizationId, organization.id))
  .groupBy(products.status);
const countByStatus = new Map(statusCounts.map((row) => [row.status, row.count]));
const totalCount = statusCounts.reduce((sum, row) => sum + row.count, 0);

function href(next: { status?: string; type?: string; search?: string }) {
  const query = new URLSearchParams();
  const nextStatus = next.status ?? activeStatus;
  const nextType = next.type ?? activeType;
  const nextSearch = next.search ?? activeSearch;
  if (nextStatus) query.set("status", nextStatus);
  if (nextType) query.set("type", nextType);
  if (nextSearch) query.set("search", nextSearch);
  const qs = query.toString();
  return qs ? `/products?${qs}` : "/products";
}
```

- [ ] **Step 4: Add the header icon**

`Package` is already imported (used in the empty-state icon). Replace the existing header `<div>` (containing `<h1>`/`<p>`/`<Badge>`) with:

```tsx
<div className="flex items-start gap-3">
  <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand">
    <Package className="size-5" />
  </span>
  <div>
    <h1 className="text-xl font-semibold">{t("title")}</h1>
    <p className="mt-1 text-sm text-muted-foreground">{t("subtitle")}</p>
    <Badge variant="outline" className="mt-3">
      {t("paymentsNotice")}
    </Badge>
  </div>
</div>
```

- [ ] **Step 5: Add the status-filter pill row (with counts) and the type-filter pill row (no counts)**

Immediately after the header block and before the existing creation-form `<Card>`, add:

```tsx
<div className="flex flex-wrap gap-2">
  <Button
    size="sm"
    variant={!activeStatus ? "default" : "outline"}
    nativeButton={false}
    render={
      <Link href={href({ status: "" })}>
        {t("statusFilters.all")} ({totalCount})
      </Link>
    }
  />
  {productStatus.enumValues.map((s) => (
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
</div>

<div className="flex flex-wrap gap-2">
  <Button
    size="sm"
    variant={!activeType ? "default" : "outline"}
    nativeButton={false}
    render={<Link href={href({ type: "" })}>{t("typeFilters.all")}</Link>}
  />
  {productType.enumValues.map((ty) => (
    <Button
      key={ty}
      size="sm"
      variant={activeType === ty ? "default" : "outline"}
      nativeButton={false}
      render={<Link href={href({ type: ty })}>{t(`types.${ty}`)}</Link>}
    />
  ))}
</div>
```

- [ ] **Step 6: Add the search form**

Immediately after the two filter-pill rows, before the existing creation-form `<Card>`, add:

```tsx
<form action={`/${locale}/products`} method="get" className="flex gap-2">
  {activeStatus && <input type="hidden" name="status" value={activeStatus} />}
  {activeType && <input type="hidden" name="type" value={activeType} />}
  <Input type="text" name="search" defaultValue={activeSearch} placeholder={t("search.placeholder")} className="max-w-xs" />
  <Button type="submit" size="sm" variant="outline">
    {t("search.apply")}
  </Button>
</form>
```

(`Input` is already imported in this file — it's used by the creation form.)

- [ ] **Step 7: Type-check and lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: no errors.

- [ ] **Step 8: Manual verification**

Run: `npm run dev`, open `/uz/products` (requires auth — note in report if unreachable). If reachable: confirm the icon square renders before the title, each status pill shows a count in parentheses including "Hammasi" showing the true total, the type-filter row has no counts, and submitting the search form filters the table by product name while preserving active status/type filters via hidden inputs.

- [ ] **Step 9: Commit**

```bash
git add "src/app/[locale]/(dashboard)/products/page.tsx"
git commit -m "feat(products): add header icon, status/type filter pills, and name search"
```

---

### Task 3: `/billing` — header icon, split payment/expense history

**Files:**
- Modify: `src/app/[locale]/(dashboard)/billing/page.tsx`

**Interfaces:**
- Consumes: `billing.history.expenseTitle`, `billing.history.expenseEmpty` (Task 1).
- Produces: no new exports; page-local change.

Read the current file first (`src/app/[locale]/(dashboard)/billing/page.tsx`) to confirm its exact current shape — it fetches `credits` and `transactions` (a single array, up to 50 rows, already sorted by `desc(creditTransactions.createdAt)`), then renders: header, plan card, a 3-column balance/bonus/storage card grid, then ONE history `<Card>` with a table over all `transactions`.

- [ ] **Step 1: Add the header icon**

Add `CreditCard` to the lucide-react import (this file currently has no lucide-react import — add the line):

```tsx
import { CreditCard } from "lucide-react";
```

Replace the existing header `<div>` (containing just `<h1>`/`<p>`) with:

```tsx
<div className="flex items-start gap-3">
  <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand">
    <CreditCard className="size-5" />
  </span>
  <div>
    <h1 className="text-xl font-semibold">{t("title")}</h1>
    <p className="mt-1 text-sm text-muted-foreground">{t("subtitle")}</p>
  </div>
</div>
```

- [ ] **Step 2: Split `transactions` into payment and expense arrays**

After the `dtf` date formatter declaration (and before the `return`), add:

```tsx
const paymentTransactions = transactions.filter((tx) => tx.amount >= 0);
const expenseTransactions = transactions.filter((tx) => tx.amount < 0);
```

- [ ] **Step 3: Replace the single history `<Card>` with two**

Find the existing block:

```tsx
<Card>
  <CardHeader>
    <CardTitle>{t("history.title")}</CardTitle>
  </CardHeader>
  <CardContent>
    {transactions.length === 0 ? (
      <p className="py-8 text-center text-sm text-muted-foreground">{t("history.empty")}</p>
    ) : (
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs text-muted-foreground">
              <th className="py-2 pr-4 font-medium">{t("history.date")}</th>
              <th className="py-2 pr-4 font-medium">{t("history.description")}</th>
              <th className="py-2 pr-4 font-medium">{t("history.type")}</th>
              <th className="py-2 text-right font-medium">{t("history.amount")}</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((tx) => (
              <tr key={tx.id} className="border-b border-border last:border-0">
                <td className="py-2 pr-4 text-muted-foreground">{dtf.format(tx.createdAt)}</td>
                <td className="py-2 pr-4">{tx.description}</td>
                <td className="py-2 pr-4 text-muted-foreground">{t(`history.types.${tx.type}`)}</td>
                <td
                  className={`py-2 text-right font-medium ${tx.amount >= 0 ? "text-brand" : "text-foreground"}`}
                >
                  {tx.amount >= 0 ? "+" : ""}
                  {tx.amount.toFixed(2)}W
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )}
  </CardContent>
</Card>
```

Replace it with two `<Card>` blocks, each rendering the same table shape over its own filtered array and its own title/empty text:

```tsx
<Card>
  <CardHeader>
    <CardTitle>{t("history.title")}</CardTitle>
  </CardHeader>
  <CardContent>
    {paymentTransactions.length === 0 ? (
      <p className="py-8 text-center text-sm text-muted-foreground">{t("history.empty")}</p>
    ) : (
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs text-muted-foreground">
              <th className="py-2 pr-4 font-medium">{t("history.date")}</th>
              <th className="py-2 pr-4 font-medium">{t("history.description")}</th>
              <th className="py-2 pr-4 font-medium">{t("history.type")}</th>
              <th className="py-2 text-right font-medium">{t("history.amount")}</th>
            </tr>
          </thead>
          <tbody>
            {paymentTransactions.map((tx) => (
              <tr key={tx.id} className="border-b border-border last:border-0">
                <td className="py-2 pr-4 text-muted-foreground">{dtf.format(tx.createdAt)}</td>
                <td className="py-2 pr-4">{tx.description}</td>
                <td className="py-2 pr-4 text-muted-foreground">{t(`history.types.${tx.type}`)}</td>
                <td className="py-2 text-right font-medium text-brand">
                  +{tx.amount.toFixed(2)}W
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )}
  </CardContent>
</Card>

<Card>
  <CardHeader>
    <CardTitle>{t("history.expenseTitle")}</CardTitle>
  </CardHeader>
  <CardContent>
    {expenseTransactions.length === 0 ? (
      <p className="py-8 text-center text-sm text-muted-foreground">{t("history.expenseEmpty")}</p>
    ) : (
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs text-muted-foreground">
              <th className="py-2 pr-4 font-medium">{t("history.date")}</th>
              <th className="py-2 pr-4 font-medium">{t("history.description")}</th>
              <th className="py-2 pr-4 font-medium">{t("history.type")}</th>
              <th className="py-2 text-right font-medium">{t("history.amount")}</th>
            </tr>
          </thead>
          <tbody>
            {expenseTransactions.map((tx) => (
              <tr key={tx.id} className="border-b border-border last:border-0">
                <td className="py-2 pr-4 text-muted-foreground">{dtf.format(tx.createdAt)}</td>
                <td className="py-2 pr-4">{tx.description}</td>
                <td className="py-2 pr-4 text-muted-foreground">{t(`history.types.${tx.type}`)}</td>
                <td className="py-2 text-right font-medium text-foreground">
                  {tx.amount.toFixed(2)}W
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )}
  </CardContent>
</Card>
```

Note the payment table's amount cell is unconditionally `text-brand` with a `+` prefix (every row there has `amount >= 0` by construction), and the expense table's amount cell is unconditionally `text-foreground` with no `+` prefix (every row there has `amount < 0`, so `tx.amount.toFixed(2)` already renders the leading `-`) — this replaces the old single table's conditional styling since each new table now only ever contains one sign.

- [ ] **Step 4: Type-check and lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: no errors.

- [ ] **Step 5: Manual verification**

Run: `npm run dev`, open `/uz/billing` (requires auth — note in report if unreachable). If reachable: confirm the icon square renders before the title, there are now two history cards ("To'lovlar tarixi" and "Xarajatlar tarixi"), and each only contains rows of its own sign (positive amounts with `+` in the first, negative amounts in the second). If there is no billing data seeded, confirm both empty states render their distinct messages.

- [ ] **Step 6: Commit**

```bash
git add "src/app/[locale]/(dashboard)/billing/page.tsx"
git commit -m "feat(billing): add header icon and split payment/expense history"
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
Expected: build succeeds.

- [ ] **Step 4: Manual pass over both pages in both themes**

Run: `npm run dev`, visit `/uz/products` and `/uz/billing` in both light and dark mode, and repeat for `/ru/...` and `/en/...` to confirm no missing-translation fallback text appears. This requires authentication — if the verifier cannot sign in, report that explicitly rather than skipping silently; the controller/human partner can complete this check separately.

- [ ] **Step 5: Commit (only if Step 4 required fixes)**

If manual verification surfaced no issues, no commit is needed for this task. If fixes were made, commit them with a message describing what was fixed.
