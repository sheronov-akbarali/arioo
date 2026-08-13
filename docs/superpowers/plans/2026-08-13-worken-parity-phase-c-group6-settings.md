# worken.ru Parity — Phase C, Group 6: Settings Pages Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring the `/settings/*` pages in line with the icon-square header pattern and status-badge taxonomy already established across the other 13 dashboard pages in Phase C, and replace the team page's plain-text role label with a proper `Badge`.

**Architecture:** All four settings routes (`project`, `team`, `limits`, `accounts`) share one layout (`settings/layout.tsx`) that already renders the page title/subtitle above a tab bar — adding the header icon there covers all four pages with one change. `/settings/team` separately gets its member-list role rendering upgraded from raw text to a `Badge`, plus a member-count line, following the same `Badge`/count patterns already used on `/products` (Group 3) and `/routines` (Group 2).

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Tailwind v4, shadcn/ui (`Badge`), lucide-react icons, next-intl (uz/ru/en).

## Global Constraints

- No new functionality beyond visual/taxonomy polish.
- worken.ru's actual `/settings` tab content could not be captured during the audit (rendered blank for the test account) — this group's changes are therefore based on Arioo's own established Phase C design language (icon-square headers, status badges), not a pixel-match to a worken screenshot.
- No member-management actions (remove member, change role) are added — `settings/team/actions.ts` only supports inviting; adding management actions is a new backend capability, out of scope.
- The Clerk-specific `/settings/accounts` tab (`settings.tabs.accounts`) stays as-is — it has no worken.ru equivalent since worken uses a different auth system; it only benefits from the shared layout's new header icon.
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
- Produces: translation keys `settings.team.roles.owner`, `settings.team.roles.admin`, `settings.team.roles.member`, `settings.team.membersFound` — consumed by Task 3.

- [ ] **Step 1: Add keys to `messages/uz.json`**

Inside the top-level `"settings"` object, inside the existing nested `"team"` object (sibling of `"title"`, `"emailPlaceholder"`, `"invite"`, `"pending"`), add:

```json
"roles": {
  "owner": "Egasi",
  "admin": "Administrator",
  "member": "A'zo"
},
"membersFound": "{count} ta a'zo"
```

- [ ] **Step 2: Add the same keys to `messages/ru.json`**

`settings.team.roles`: `{ "owner": "Владелец", "admin": "Администратор", "member": "Участник" }`
`settings.team.membersFound`: `"Участников: {count}"`

- [ ] **Step 3: Add the same keys to `messages/en.json`**

`settings.team.roles`: `{ "owner": "Owner", "admin": "Admin", "member": "Member" }`
`settings.team.membersFound`: `"{count} members"`

- [ ] **Step 4: Run the key-parity test**

Run: `npm run test -- messages/messages.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add messages/uz.json messages/ru.json messages/en.json
git commit -m "i18n: add Phase C group 6 settings-page translation keys"
```

---

### Task 2: `settings/layout.tsx` — header icon

**Files:**
- Modify: `src/app/[locale]/(dashboard)/settings/layout.tsx`

**Interfaces:**
- Consumes: none new.
- Produces: no new exports; layout-local change, applies to all 4 settings routes since they all render through this shared layout.

Read the current file first (`src/app/[locale]/(dashboard)/settings/layout.tsx`) — it's a small server component rendering a header `<div>` (title/subtitle), then `<SettingsTabs />`, then `{children}`.

- [ ] **Step 1: Add the `Settings` icon import**

```tsx
import { Settings } from "lucide-react";
```

- [ ] **Step 2: Wrap the header in an icon-square `<div>`**

Replace:

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
    <Settings className="size-5" />
  </span>
  <div>
    <h1 className="text-xl font-semibold">{t("title")}</h1>
    <p className="mt-1 text-sm text-muted-foreground">{t("subtitle")}</p>
  </div>
</div>
```

Do not touch `<SettingsTabs />` or `{children}`.

- [ ] **Step 3: Type-check and lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: no errors.

- [ ] **Step 4: Manual verification**

Run: `npm run dev`, open `/uz/settings/project` (requires auth — note in report if unreachable). If reachable: confirm the icon square renders before the title, and that navigating between the 4 tabs (project/team/limits/accounts) keeps the icon in place since it's in the shared layout.

- [ ] **Step 5: Commit**

```bash
git add "src/app/[locale]/(dashboard)/settings/layout.tsx"
git commit -m "feat(settings): add header icon to shared layout"
```

---

### Task 3: `/settings/team` — role badges and member count

**Files:**
- Modify: `src/app/[locale]/(dashboard)/settings/team/page.tsx`

**Interfaces:**
- Consumes: `settings.team.roles.{owner,admin,member}`, `settings.team.membersFound` (Task 1), `Badge` (`@/components/ui/badge`).
- Produces: no new exports; page-local change.

Read the current file first (`src/app/[locale]/(dashboard)/settings/team/page.tsx`) — it fetches `members` (via Drizzle + Clerk Backend API) and `pendingInvites`, then renders an invite form (if `canInvite`) followed by a `<ul>` of member `<li>`s (currently `{member.name ?? member.email ?? member.userId} — {member.role}`) and pending-invite `<li>`s.

- [ ] **Step 1: Add the `Badge` import**

```tsx
import { Badge } from "@/components/ui/badge";
```

- [ ] **Step 2: Add the member-count line**

Immediately after the existing `<h2 className="text-lg font-medium">{t("title")}</h2>` line, add:

```tsx
<p className="text-sm text-muted-foreground">{t("membersFound", { count: members.length })}</p>
```

- [ ] **Step 3: Replace the plain-text role suffix with a `Badge`**

Find the existing member `<li>`:

```tsx
<li key={member.userId} className="rounded-lg border p-3">
  {member.name ?? member.email ?? member.userId} — {member.role}
</li>
```

Replace it with:

```tsx
<li key={member.userId} className="flex items-center justify-between gap-2 rounded-lg border p-3">
  <span>{member.name ?? member.email ?? member.userId}</span>
  <Badge variant={member.role === "member" ? "outline" : "default"}>{t(`roles.${member.role}`)}</Badge>
</li>
```

- [ ] **Step 4: Type-check and lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: no errors.

- [ ] **Step 5: Manual verification**

Run: `npm run dev`, open `/uz/settings/team` (requires auth — note in report if unreachable). If reachable: confirm the member-count line appears above the list, each member row shows a role badge (filled for owner/admin, outline for member) instead of plain "— role" text, and the pending-invites list below is unchanged.

- [ ] **Step 6: Commit**

```bash
git add "src/app/[locale]/(dashboard)/settings/team/page.tsx"
git commit -m "feat(settings-team): add role badges and member count"
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

- [ ] **Step 4: Manual pass over all 4 settings routes in both themes**

Run: `npm run dev`, visit `/uz/settings/project`, `/uz/settings/team`, `/uz/settings/limits`, `/uz/settings/accounts` in both light and dark mode, and repeat for `/ru/...` and `/en/...` to confirm no missing-translation fallback text appears. This requires authentication — if the verifier cannot sign in, report that explicitly rather than skipping silently; the controller/human partner can complete this check separately.

- [ ] **Step 5: Commit (only if Step 4 required fixes)**

If manual verification surfaced no issues, no commit is needed for this task. If fixes were made, commit them with a message describing what was fixed.
