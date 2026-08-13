# worken.ru Parity — Phase C, Group 5: Partnership Pages Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring `/affiliate-program` and `/referral-program` visually in line with worken.ru's design taxonomy (header icons, referral-link labels, a period filter on referral operations) within Arioo's existing data model — no new backend functionality.

**Architecture:** Both pages stay server components. `/affiliate-program` gets a single cosmetic change (header icon) since its current "not a partner yet" state is a deliberately different screen from worken's active-partner dashboard, which needs backend Arioo doesn't have. `/referral-program` gets a header icon, static labels above its two existing referral links, and a period filter on the operations query using the exact `and(...)`-with-optional-`gte`-condition pattern already established in Phase C groups 2-4.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Drizzle ORM (Neon Postgres), Tailwind v4, shadcn/ui (`Button`, `Card`), lucide-react icons, next-intl (uz/ru/en).

## Global Constraints

- No new functionality beyond visual/taxonomy polish.
- `/affiliate-program` does NOT get worken's active-partner dashboard (Funds/Top up, Commission rate, Paying clients, Payment history table, Clients/Notifications/Description tabs) — Arioo has no partner-account backend (balance, commission, client list) to back it. The existing "not a partner yet" CTA + tier-levels grid stays exactly as-is except for the header icon.
- `/referral-program` does NOT get worken's "Referral list" tab — `referralOperations` has no column linking an operation to which organization was referred, so a list of referred users/orgs cannot be rendered.
- `/referral-program`'s period filter is `all`/`today`/`week`/`month` only — worken's "Yesterday" and calendar-style "Select dates" picker are NOT added (extra complexity, no precedent for a calendar picker elsewhere in the app).
- The period filter only narrows the displayed `operations` list (and its derived `totalEarned`) — it must NOT change `todayOps`/`monthOps`, which exist solely to compute the daily/monthly accrual-limit progress bars against fixed day/month boundaries, unrelated to which period the user is viewing.
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
- Produces: translation keys `referralProgram.linkLabels.home`, `referralProgram.linkLabels.signUp`, `referralProgram.periodFilters.all`, `referralProgram.periodFilters.today`, `referralProgram.periodFilters.week`, `referralProgram.periodFilters.month` — consumed by Task 3.

- [ ] **Step 1: Add keys to `messages/uz.json`**

Inside the top-level `"referralProgram"` object, add two new nested objects (siblings of `"linksTitle"`, `"linksSubtitle"`, `"copy"`, `"copied"`, `"limitsTitle"`, etc.):

```json
"linkLabels": {
  "home": "Bosh sahifa",
  "signUp": "Ro'yxatdan o'tish sahifasi"
},
"periodFilters": {
  "all": "Barchasi",
  "today": "Bugun",
  "week": "Bu hafta",
  "month": "Bu oy"
}
```

- [ ] **Step 2: Add the same keys to `messages/ru.json`**

`referralProgram.linkLabels`: `{ "home": "Главная страница", "signUp": "Страница регистрации" }`
`referralProgram.periodFilters`: `{ "all": "Все время", "today": "Сегодня", "week": "Эта неделя", "month": "Этот месяц" }`

- [ ] **Step 3: Add the same keys to `messages/en.json`**

`referralProgram.linkLabels`: `{ "home": "Home page", "signUp": "Sign-up page" }`
`referralProgram.periodFilters`: `{ "all": "All time", "today": "Today", "week": "This week", "month": "This month" }`

- [ ] **Step 4: Run the key-parity test**

Run: `npm run test -- messages/messages.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add messages/uz.json messages/ru.json messages/en.json
git commit -m "i18n: add Phase C group 5 partnership-page translation keys"
```

---

### Task 2: `/affiliate-program` — header icon

**Files:**
- Modify: `src/app/[locale]/(dashboard)/affiliate-program/page.tsx`

**Interfaces:**
- Consumes: none new (no new translation keys needed for this task).
- Produces: no new exports; page-local change.

Read the current file first (`src/app/[locale]/(dashboard)/affiliate-program/page.tsx`) — `Handshake` is already imported and used inside the CTA card's icon badge.

- [ ] **Step 1: Wrap the header in an icon-square `<div>`**

Replace the existing header block:

```tsx
<div>
  <h1 className="text-xl font-semibold">{t("title")}</h1>
  <p className="mt-1 text-sm text-muted-foreground">{t("subtitle")}</p>
</div>
```

with:

```tsx
<div className="flex items-start gap-3">
  <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand">
    <Handshake className="size-5" />
  </span>
  <div>
    <h1 className="text-xl font-semibold">{t("title")}</h1>
    <p className="mt-1 text-sm text-muted-foreground">{t("subtitle")}</p>
  </div>
</div>
```

Do not touch the CTA `<Card>` below it (which also uses `Handshake` inside its own icon badge — that one stays exactly as-is) or the tier-levels grid.

- [ ] **Step 2: Type-check and lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: no errors.

- [ ] **Step 3: Manual verification**

Run: `npm run dev`, open `/uz/affiliate-program` (requires auth — note in report if unreachable). If reachable: confirm the icon square renders before the title, and the CTA card + tier grid below are unchanged.

- [ ] **Step 4: Commit**

```bash
git add "src/app/[locale]/(dashboard)/affiliate-program/page.tsx"
git commit -m "feat(affiliate-program): add header icon"
```

---

### Task 3: `/referral-program` — header icon, link labels, period filter

**Files:**
- Modify: `src/app/[locale]/(dashboard)/referral-program/page.tsx`

**Interfaces:**
- Consumes: `referralProgram.linkLabels.{home,signUp}`, `referralProgram.periodFilters.{all,today,week,month}` (Task 1).
- Produces: no new exports; page-local change.

Read the current file first (`src/app/[locale]/(dashboard)/referral-program/page.tsx`) to confirm its exact current shape — it already computes `startOfDay` and `startOfMonth` (UTC-based) for the `todayOps`/`monthOps` accrual-limit queries, and fetches `operations` (all-time, limit 50) separately for the operations list and `totalEarned`.

- [ ] **Step 1: Add the `Link` import and the period searchParam**

Add the import (not currently present in this file):

```tsx
import { Link } from "@/i18n/navigation";
```

Change the function signature from:

```tsx
export default async function ReferralProgramPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
```

to:

```tsx
export default async function ReferralProgramPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ period?: string }>;
}) {
  const { locale } = await params;
  const { period } = await searchParams;
```

- [ ] **Step 2: Compute the active period and its start boundary**

After the existing `startOfMonth` declaration, add:

```tsx
const PERIODS = ["all", "today", "week", "month"] as const;
const activePeriod = PERIODS.find((p) => p === period) ?? "all";

const dayOfWeek = now.getUTCDay();
const daysSinceMonday = (dayOfWeek + 6) % 7;
const startOfWeek = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - daysSinceMonday));

const periodStart =
  activePeriod === "today"
    ? startOfDay
    : activePeriod === "week"
      ? startOfWeek
      : activePeriod === "month"
        ? startOfMonth
        : null;
```

- [ ] **Step 3: Apply the period filter to the `operations` query only**

Find the existing `operations` query inside the `Promise.all([...])` call:

```tsx
db
  .select()
  .from(referralOperations)
  .where(eq(referralOperations.organizationId, organization.id))
  .orderBy(desc(referralOperations.createdAt))
  .limit(50),
```

Change its `.where(...)` to:

```tsx
.where(
  and(
    eq(referralOperations.organizationId, organization.id),
    periodStart ? gte(referralOperations.createdAt, periodStart) : undefined,
  ),
)
```

Leave the `todayOps` and `monthOps` queries in the same `Promise.all` completely unchanged — they must keep using their own fixed `startOfDay`/`startOfMonth` boundaries regardless of `activePeriod`, since they drive the daily/monthly accrual-limit progress bars, not the operations list.

- [ ] **Step 4: Add the header icon**

Add the import:

```tsx
import { Link2 } from "lucide-react";
```

Replace the existing header block:

```tsx
<div>
  <h1 className="text-xl font-semibold">{t("title")}</h1>
  <p className="mt-1 text-sm text-muted-foreground">{t("subtitle")}</p>
</div>
```

with:

```tsx
<div className="flex items-start gap-3">
  <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand">
    <Link2 className="size-5" />
  </span>
  <div>
    <h1 className="text-xl font-semibold">{t("title")}</h1>
    <p className="mt-1 text-sm text-muted-foreground">{t("subtitle")}</p>
  </div>
</div>
```

- [ ] **Step 5: Add labels above the two referral links**

Find the existing links `<CardContent>`:

```tsx
<CardContent className="flex flex-wrap gap-3">
  <div className="flex items-center gap-2">
    <span className="rounded-md border border-border px-3 py-1.5 text-sm text-muted-foreground">
      {`/${locale}?ref=${account.code}`}
    </span>
    <CopyLinkButton path={`/${locale}?ref=${account.code}`} label={t("copy")} copiedLabel={t("copied")} />
  </div>
  <div className="flex items-center gap-2">
    <span className="rounded-md border border-border px-3 py-1.5 text-sm text-muted-foreground">
      {`/${locale}/sign-up?ref=${account.code}`}
    </span>
    <CopyLinkButton
      path={`/${locale}/sign-up?ref=${account.code}`}
      label={t("copy")}
      copiedLabel={t("copied")}
    />
  </div>
</CardContent>
```

Replace it with a version that adds a label above each link row and stacks the two rows vertically (matching worken's "Home page" / "Sign-up page" layout):

```tsx
<CardContent className="flex flex-col gap-4">
  <div className="flex flex-col gap-1.5">
    <p className="text-xs font-medium text-muted-foreground">{t("linkLabels.home")}</p>
    <div className="flex flex-wrap items-center gap-2">
      <span className="rounded-md border border-border px-3 py-1.5 text-sm text-muted-foreground">
        {`/${locale}?ref=${account.code}`}
      </span>
      <CopyLinkButton path={`/${locale}?ref=${account.code}`} label={t("copy")} copiedLabel={t("copied")} />
    </div>
  </div>
  <div className="flex flex-col gap-1.5">
    <p className="text-xs font-medium text-muted-foreground">{t("linkLabels.signUp")}</p>
    <div className="flex flex-wrap items-center gap-2">
      <span className="rounded-md border border-border px-3 py-1.5 text-sm text-muted-foreground">
        {`/${locale}/sign-up?ref=${account.code}`}
      </span>
      <CopyLinkButton
        path={`/${locale}/sign-up?ref=${account.code}`}
        label={t("copy")}
        copiedLabel={t("copied")}
      />
    </div>
  </div>
</CardContent>
```

- [ ] **Step 6: Add the period-filter pill row above the operations card**

Immediately before the final `<Card>` (the one titled `t("operationsTitle")`), add:

```tsx
<div className="flex flex-wrap gap-2">
  {PERIODS.map((p) => (
    <Button
      key={p}
      size="sm"
      variant={activePeriod === p ? "default" : "outline"}
      nativeButton={false}
      render={<Link href={p === "all" ? "/referral-program" : `/referral-program?period=${p}`}>{t(`periodFilters.${p}`)}</Link>}
    />
  ))}
</div>
```

(`Button` is already imported in this file.)

- [ ] **Step 7: Type-check and lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: no errors.

- [ ] **Step 8: Manual verification**

Run: `npm run dev`, open `/uz/referral-program` (requires auth — note in report if unreachable). If reachable: confirm the icon square renders before the title, both referral links now show a label above them, the period-filter pills render and switching between them changes the operations list and `totalEarned` figure, and the daily/monthly accrual-limit progress bars stay fixed regardless of which period pill is active.

- [ ] **Step 9: Commit**

```bash
git add "src/app/[locale]/(dashboard)/referral-program/page.tsx"
git commit -m "feat(referral-program): add header icon, link labels, and period filter"
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

Run: `npm run dev`, visit `/uz/affiliate-program` and `/uz/referral-program` in both light and dark mode, and repeat for `/ru/...` and `/en/...` to confirm no missing-translation fallback text appears. This requires authentication — if the verifier cannot sign in, report that explicitly rather than skipping silently; the controller/human partner can complete this check separately.

- [ ] **Step 5: Commit (only if Step 4 required fixes)**

If manual verification surfaced no issues, no commit is needed for this task. If fixes were made, commit them with a message describing what was fixed.
