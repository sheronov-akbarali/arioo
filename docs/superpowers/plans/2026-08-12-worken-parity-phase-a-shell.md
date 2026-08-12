# worken.ru Parity Phase A: Design Tokens & Dashboard Shell Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Swap Arioo's orange brand accent for a dark blue, convert the dashboard
sidebar to a permanent 48px icon-only rail with real scroll (fixing the
reported "sidebar doesn't fit" bug better than worken.ru's own silent-clip
behavior), and add a dashboard top bar (breadcrumb + visual-only ⌘K hint +
theme toggle) — bringing Arioo's dashboard shell to structural parity with
worken.ru's authenticated app.

**Architecture:** Three independent, sequential tasks. Task 1 only touches
`globals.css` token values. Task 2 changes `Sidebar`'s collapse mode to a
permanently-locked icon rail, removes the icon-mode `overflow-hidden` override
in the shared `ui/sidebar.tsx` primitive, and adds active-route detection +
hover tooltips + a new Billing nav item to `sidebar-nav.tsx` — exporting a flat
routed-items list Task 3 reuses. Task 3 adds a new `DashboardTopbar` client
component rendered once in the dashboard layout.

**Tech Stack:** Next.js App Router, Tailwind v4 CSS-first tokens, shadcn/ui-style
`Sidebar` primitive (base-ui, not Radix), next-intl, next-themes, lucide-react.

## Global Constraints

- Dark mode brand/ring/sidebar-primary/sidebar-ring: `hsl(217 91% 45%)`. Light
  mode: `hsl(217 91% 40%)`. `--brand-foreground` stays `hsl(210 40% 98%)` in
  both modes (from the spec, Part 1).
- No other existing token (`--background`, `--foreground`, `--card`,
  `--border`, `--muted`, `--secondary`, `--destructive`, `--chart-1..5`,
  `--radius`, `--sidebar`, `--sidebar-foreground`, `--sidebar-accent`,
  `--sidebar-border`) changes in this plan.
- Sidebar stays permanently icon-collapsed (48px / `SIDEBAR_WIDTH_ICON`) —
  no expand toggle exposed to the user (spec Part 2).
- The icon-collapsed sidebar's overflow must be real `overflow-auto` (a
  working scrollbar), not worken's `overflow-hidden` silent-clip (spec Part 2,
  "the deliberate improvement over worken").
- All three locale files (`en.json`, `ru.json`, `uz.json`) must gain identical
  new keys — `messages/messages.test.ts` fails the build if any key set drifts
  between locales.
- The dashboard top bar ships the ⌘K hint as a **visual-only** button (no
  working command palette) — actual command-palette search is explicitly out
  of scope for this phase (spec Part 3).
- No authenticated Playwright fixture exists in this codebase yet (confirmed:
  `tests/e2e/auth.spec.ts`'s own Clerk sign-in test already fails in this
  environment without real Clerk keys, and no test signs in and reaches a
  dashboard route). The sidebar overflow fix and top bar are therefore
  verified by build/lint/typecheck/existing-suite plus **manual** browser
  verification (spec's own Testing section already calls for this) — no new
  Playwright spec is added in this plan, since one that can't authenticate
  would not actually exercise the dashboard.

---

## Task 1: Swap the brand accent to dark blue

**Files:**
- Modify: `src/app/globals.css:56-57,73,82-83,87` (`:root`, light mode)
- Modify: `src/app/globals.css:93-94,110,118-119,123` (`.dark`, dark mode)

**Interfaces:** None — pure CSS custom-property value changes, no new
selectors or classes. Every consumer (`bg-brand`, `text-brand-foreground`,
`ring-*`, `border-sidebar-ring`, etc., wired via the `@theme inline` block at
`globals.css:7-51`) picks up the new values automatically.

- [ ] **Step 1: Edit the light-mode (`:root`) tokens**

In `src/app/globals.css`, inside the `:root { ... }` block, change these four
lines (leave every other line in the block untouched):

```css
  --brand: hsl(217 91% 40%);
  --brand-foreground: hsl(210 40% 98%);
```
(replaces the existing `--brand: hsl(32 95% 44%);` and
`--brand-foreground: hsl(37 45% 97%);` lines)

```css
  --ring: hsl(217 91% 40%);
```
(replaces the existing `--ring: hsl(22 50% 15%);` line)

```css
  --sidebar-primary: hsl(217 91% 40%);
  --sidebar-primary-foreground: hsl(210 40% 98%);
```
(replaces the existing `--sidebar-primary: hsl(22 50% 15%);` and
`--sidebar-primary-foreground: hsl(37 45% 97%);` lines)

```css
  --sidebar-ring: hsl(217 91% 40%);
```
(replaces the existing `--sidebar-ring: hsl(32 95% 44%);` line)

- [ ] **Step 2: Edit the dark-mode (`.dark`) tokens**

In the `.dark { ... }` block, change these four lines (leave every other line
untouched):

```css
  --brand: hsl(217 91% 45%);
  --brand-foreground: hsl(210 40% 98%);
```
(replaces `--brand: hsl(38 92% 50%);` and
`--brand-foreground: hsl(320 18% 10%);`)

```css
  --ring: hsl(217 91% 45%);
```
(replaces `--ring: hsl(38 92% 50%);`)

```css
  --sidebar-primary: hsl(217 91% 45%);
  --sidebar-primary-foreground: hsl(210 40% 98%);
```
(replaces `--sidebar-primary: hsl(38 92% 50%);` and
`--sidebar-primary-foreground: hsl(320 18% 8%);`)

```css
  --sidebar-ring: hsl(217 91% 45%);
```
(replaces `--sidebar-ring: hsl(38 92% 50%);`)

- [ ] **Step 3: Verify no other file hardcodes the old orange values**

Run: `grep -rn "38 92% 50\|32 95% 44\|f5a623" src/ messages/ 2>/dev/null`
Expected: no output (the orange was only ever referenced via the CSS custom
properties just edited, never duplicated as a literal hex/HSL elsewhere).

- [ ] **Step 4: Build**

Run: `npm run build`
Expected: succeeds (this is a token-value-only change — no component, type,
or route logic changed, so a successful build is the correct verification
here; there is no automated visual-diff test in this codebase to assert
against).

- [ ] **Step 5: Manual visual check**

With `npm run dev` running, open the dashboard and the marketing homepage in
both light and dark mode. Confirm every previously-orange element (primary
button fills using `bg-brand`, focus rings, the active-sidebar-icon
highlight, any `--ring`-driven outline) now renders dark blue, and that no
other color shifted.

- [ ] **Step 6: Commit**

```bash
git add src/app/globals.css
git commit -m "feat: replace orange brand accent with dark blue"
```

---

## Task 2: Permanent icon-only sidebar with real scroll, active state, tooltips, and a Billing item

**Files:**
- Modify: `src/components/ui/sidebar.tsx:368-380` (remove the icon-mode
  overflow override)
- Modify: `src/app/[locale]/(dashboard)/layout.tsx` (lock the sidebar into
  icon-collapsed mode)
- Modify: `src/components/dashboard/sidebar-nav.tsx` (full rewrite: active
  detection, tooltips, Billing item, export a routed-items list)
- Modify: `messages/en.json`, `messages/ru.json`, `messages/uz.json` (add
  `dashboard.nav.billing`)

**Interfaces:**
- Consumes: `usePathname` from `@/i18n/navigation` (already exported per
  `src/i18n/navigation.ts:4-5`); `useTranslations` from `next-intl`; the
  `SidebarMenuButton`'s existing `tooltip?: string | ComponentProps<typeof
  TooltipContent>` prop (`src/components/ui/sidebar.tsx:504,510`, already
  wired to render a `Tooltip`/`TooltipContent` when the sidebar is in
  `state === "collapsed"`, `src/components/ui/sidebar.tsx:540-549`).
- Produces: `ROUTED_NAV_ITEMS: { key: string; href: string }[]` exported from
  `src/components/dashboard/sidebar-nav.tsx` — the flat list of every nav
  entry that has a route, in sidebar order, including `settings` and the new
  `billing`. Also produces `isNavItemActive(pathname: string, href: string):
  boolean` and `getActiveNavItem(pathname: string): { key: string; href:
  string } | undefined`, both exported from the same file. **Task 3 imports
  `getActiveNavItem` and `useTranslations("dashboard.nav")` to render the
  breadcrumb label** — these exact names and signatures are what Task 3's
  code uses.

- [ ] **Step 1: Remove the icon-mode overflow override in the shared primitive**

In `src/components/ui/sidebar.tsx`, find `SidebarContent` (around line
368-380). Change the `className` string on line 374 from:

```
"no-scrollbar flex min-h-0 flex-1 flex-col gap-0 overflow-auto group-data-[collapsible=icon]:overflow-hidden",
```

to:

```
"no-scrollbar flex min-h-0 flex-1 flex-col gap-0 overflow-auto",
```

(This is the whole fix for the reported bug: the icon-collapsed sidebar now
scrolls like every other state instead of silently clipping bottom icons when
the window is short.)

- [ ] **Step 2: Lock the dashboard's sidebar into permanent icon-collapsed mode**

In `src/app/[locale]/(dashboard)/layout.tsx`, change:

```tsx
    <SidebarProvider>
      <Sidebar>
```

to:

```tsx
    <SidebarProvider open={false} onOpenChange={() => {}}>
      <Sidebar collapsible="icon">
```

(`open={false}` makes the provider controlled and permanently collapsed —
`onOpenChange={() => {}}` is required because `SidebarProvider` is a
controlled component once `open` is passed; a no-op handler means nothing,
including the existing `⌘/Ctrl+B` keyboard shortcut in
`src/components/ui/sidebar.tsx:97-110`, can re-expand it. `collapsible="icon"`
on `<Sidebar>` is what makes the collapsed state render as the 48px icon rail
instead of fully hiding, per `src/components/ui/sidebar.tsx:163,208-251`.)

- [ ] **Step 3: Add the Billing translation key to all three locale files**

In `messages/en.json`, inside `dashboard.nav` (the object at line ~298-311),
add `"billing": "Billing",` immediately after the `"affiliateProgram"` line
that doesn't exist yet — insert it after `"comingSoon": "Coming soon",` and
before `"groups": {`:

```json
      "comingSoon": "Coming soon",
      "billing": "Billing",
      "groups": {
```

In `messages/ru.json`, same position:

```json
      "comingSoon": "Скоро",
      "billing": "Биллинг",
      "groups": {
```

In `messages/uz.json`, same position:

```json
      "comingSoon": "Tez orada",
      "billing": "Billing",
      "groups": {
```

- [ ] **Step 4: Run the locale-key-parity test**

Run: `npx vitest run messages/messages.test.ts`
Expected: PASS (all three files now carry the same key set).

- [ ] **Step 5: Rewrite `sidebar-nav.tsx`**

Replace the full contents of `src/components/dashboard/sidebar-nav.tsx`:

```tsx
"use client";

import { useTranslations } from "next-intl";
import {
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@/components/ui/sidebar";
import { Link, usePathname } from "@/i18n/navigation";
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
  CreditCard,
  type LucideIcon,
} from "lucide-react";

type NavItem = { key: string; icon: LucideIcon; href?: string };
type NavGroup = { key: string; items: NavItem[] };

// Grouped the way worken.ru's authenticated sidebar groups its nav: Work
// (agent-facing day-to-day) / Data (knowledge + commerce + integrations) /
// Monitoring (analytics) / Development (agent-building tools) / Partnership
// (referral, affiliate, billing — worken shows billing in its icon rail
// too, alongside referral/affiliate). Items without an `href` render as
// disabled "coming soon" — most of these track roadmap phases 4-6
// (docs/superpowers/specs, CLAUDE.md roadmap) that aren't built yet.
const GROUPS: NavGroup[] = [
  {
    key: "work",
    items: [
      { key: "assistants", icon: Bot, href: "/assistants" },
      { key: "chats", icon: MessageSquare, href: "/chats" },
      { key: "calls", icon: PhoneCall, href: "/calls" },
      { key: "routines", icon: Repeat2, href: "/routines" },
      { key: "approvals", icon: ShieldCheck, href: "/approvals" },
    ],
  },
  {
    key: "data",
    items: [
      { key: "knowledgeBases", icon: BookOpen, href: "/knowledge-bases" },
      { key: "products", icon: Package, href: "/products" },
      { key: "integrations", icon: Plug, href: "/integrations" },
    ],
  },
  {
    key: "monitoring",
    items: [
      { key: "statistics", icon: BarChart3, href: "/statistics" },
      { key: "runs", icon: Activity, href: "/runs" },
    ],
  },
  {
    key: "development",
    items: [{ key: "codeAgent", icon: Code2 }],
  },
  {
    key: "partnership",
    items: [
      { key: "referralProgram", icon: Gift, href: "/referral-program" },
      { key: "affiliateProgram", icon: Handshake, href: "/affiliate-program" },
      { key: "billing", icon: CreditCard, href: "/billing" },
    ],
  },
];

const SETTINGS_ITEM: NavItem = { key: "settings", icon: Settings, href: "/settings/project" };

// Exact-match or nested-route match — e.g. `/assistants` is active for both
// `/assistants` itself and `/assistants/new` or `/assistants/abc123/chat`.
export function isNavItemActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export const ROUTED_NAV_ITEMS: { key: string; href: string }[] = [
  ...GROUPS.flatMap((group) => group.items),
  SETTINGS_ITEM,
]
  .filter((item): item is NavItem & { href: string } => item.href !== undefined)
  .map(({ key, href }) => ({ key, href }));

export function getActiveNavItem(pathname: string) {
  return ROUTED_NAV_ITEMS.find((item) => isNavItemActive(pathname, item.href));
}

export function SidebarNav() {
  const t = useTranslations("dashboard.nav");
  const pathname = usePathname();

  return (
    <SidebarContent>
      {GROUPS.map((group) => (
        <SidebarGroup key={group.key}>
          <SidebarGroupLabel>{t(`groups.${group.key}`)}</SidebarGroupLabel>
          <SidebarMenu>
            {group.items.map(({ key, icon: Icon, href }) => (
              <SidebarMenuItem key={key}>
                {href ? (
                  <SidebarMenuButton
                    render={<Link href={href} />}
                    isActive={isNavItemActive(pathname, href)}
                    tooltip={t(key)}
                  >
                    <Icon />
                    <span>{t(key)}</span>
                  </SidebarMenuButton>
                ) : (
                  <SidebarMenuButton disabled tooltip={t(key)}>
                    <Icon />
                    <span>{t(key)}</span>
                    <span className="text-muted-foreground ml-auto text-xs">{t("comingSoon")}</span>
                  </SidebarMenuButton>
                )}
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>
      ))}
      <SidebarGroup>
        <SidebarMenu>
          <SidebarMenuItem>
            {/* base-ui uses a `render` prop instead of Radix's `asChild` for polymorphism. */}
            <SidebarMenuButton
              render={<Link href={SETTINGS_ITEM.href!} />}
              isActive={isNavItemActive(pathname, SETTINGS_ITEM.href!)}
              tooltip={t("settings")}
            >
              <Settings />
              <span>{t("settings")}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarGroup>
    </SidebarContent>
  );
}
```

Notes for the implementer:
- `"use client"` is new on this file — required because `usePathname` (from
  `@/i18n/navigation`, backed by `next-intl/navigation`) only works in client
  components. `useTranslations` already works in both server and client
  components under this app's `NextIntlClientProvider` setup, so moving it
  into a client component here changes nothing about how it's called.
- `tooltip={t(key)}` on every button (including the disabled `codeAgent` one)
  means every icon shows its label on hover, matching worken's tooltip
  behavior — `SidebarMenuButton` already hides the tooltip automatically
  unless `state === "collapsed"` (`src/components/ui/sidebar.tsx:546`), which
  is now permanent after Task 2 Step 2, so tooltips always show on hover.
- `isActive` drives the `data-active` styling already defined on
  `sidebarMenuButtonVariants` (`src/components/ui/sidebar.tsx:478`,
  `data-active:bg-sidebar-accent data-active:font-medium
  data-active:text-sidebar-accent-foreground`) — no new CSS needed.

- [ ] **Step 6: Typecheck and lint**

Run: `npx tsc --noEmit -p tsconfig.json && npm run lint`
Expected: both clean.

- [ ] **Step 7: Run the full unit suite and build**

Run: `npx vitest run && npm run build`
Expected: all existing tests still pass (none directly test the sidebar
component; `messages.test.ts` from Step 4 covers the new translation key);
build succeeds.

- [ ] **Step 8: Manual verification**

With `npm run dev` running, sign in and open any dashboard route:
1. Confirm the sidebar renders as a 48px icon-only rail with no expand
   control, and hovering each icon shows its label as a tooltip.
2. Confirm the icon for the current route (e.g. Assistants while on
   `/assistants` or `/assistants/new`) has the filled active-state
   background.
3. Confirm a new Billing icon (credit-card glyph) appears in the bottom
   group and navigates to `/billing`.
4. Shrink the browser window height to reproduce the audit's 1400×500 repro
   size: confirm every icon is now reachable by scrolling the sidebar (a
   scrollbar appears), with nothing silently clipped.

- [ ] **Step 9: Commit**

```bash
git add src/components/ui/sidebar.tsx src/app/[locale]/(dashboard)/layout.tsx src/components/dashboard/sidebar-nav.tsx messages/en.json messages/ru.json messages/uz.json
git commit -m "fix: lock dashboard sidebar to a scrollable icon rail with active state and a Billing item"
```

---

## Task 3: Dashboard top bar (breadcrumb + ⌘K hint + theme toggle)

**Files:**
- Create: `src/components/dashboard/dashboard-topbar.tsx`
- Modify: `src/app/[locale]/(dashboard)/layout.tsx` (render the new component)
- Modify: `messages/en.json`, `messages/ru.json`, `messages/uz.json` (add
  `dashboard.topbar.commandPaletteHint`)

**Interfaces:**
- Consumes: `getActiveNavItem` from `@/components/dashboard/sidebar-nav`
  (produced in Task 2 Step 5); `ThemeToggle` from
  `@/components/marketing/theme-toggle` (existing component, reused as-is —
  it already reads `useTranslations("nav")` for its own aria-label
  internally, unrelated to the new `dashboard.topbar` namespace this task
  adds); `usePathname` from `@/i18n/navigation`.
- Produces: `DashboardTopbar` — a named export, no props, rendered once per
  dashboard page load inside `SidebarInset`.

- [ ] **Step 1: Add the `dashboard.topbar` translation namespace to all three locale files**

In `messages/en.json`, inside the `"dashboard": { ... }` object, add a new
`"topbar"` key as a sibling of `"home"`, `"nav"`, and `"userMenu"` (insert it
right after the closing `}` of `"userMenu"`, i.e. as the new last key before
`dashboard`'s own closing `}`):

```json
    "topbar": {
      "commandPaletteHint": "Command palette (coming soon)"
    }
```

In `messages/ru.json`, same position:

```json
    "topbar": {
      "commandPaletteHint": "Палитра команд (скоро)"
    }
```

In `messages/uz.json`, same position:

```json
    "topbar": {
      "commandPaletteHint": "Buyruqlar paneli (tez orada)"
    }
```

(Remember to add a comma after the `userMenu` object's closing `}` in each
file, since `topbar` is now a following sibling key, not the last one.)

- [ ] **Step 2: Run the locale-key-parity test**

Run: `npx vitest run messages/messages.test.ts`
Expected: PASS.

- [ ] **Step 3: Create `dashboard-topbar.tsx`**

Create `src/components/dashboard/dashboard-topbar.tsx`:

```tsx
"use client";

import { useTranslations } from "next-intl";
import { usePathname } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/marketing/theme-toggle";
import { getActiveNavItem } from "./sidebar-nav";

export function DashboardTopbar() {
  const t = useTranslations("dashboard");
  const pathname = usePathname();
  const active = getActiveNavItem(pathname);

  return (
    <div className="border-border flex h-12 shrink-0 items-center justify-between border-b px-4">
      <span className="text-sm font-medium">{active ? t(`nav.${active.key}`) : null}</span>
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          disabled
          aria-label={t("topbar.commandPaletteHint")}
          className="text-muted-foreground gap-1 px-2 text-xs"
        >
          <span>⌘K</span>
        </Button>
        <ThemeToggle />
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Render it in the dashboard layout**

In `src/app/[locale]/(dashboard)/layout.tsx`, add the import:

```tsx
import { DashboardTopbar } from "@/components/dashboard/dashboard-topbar";
```

and change:

```tsx
      <SidebarInset>{children}</SidebarInset>
```

to:

```tsx
      <SidebarInset>
        <DashboardTopbar />
        {children}
      </SidebarInset>
```

- [ ] **Step 5: Typecheck and lint**

Run: `npx tsc --noEmit -p tsconfig.json && npm run lint`
Expected: both clean.

- [ ] **Step 6: Run the full unit suite and build**

Run: `npx vitest run && npm run build`
Expected: all tests pass; build succeeds.

- [ ] **Step 7: Manual verification**

With `npm run dev` running, sign in and visit several dashboard routes
(`/assistants`, `/chats`, `/billing`, `/settings/project`): confirm the top
bar shows the correct current-section label for each, the ⌘K hint button is
visible but inert (clicking it does nothing — it's `disabled`), and the theme
toggle works exactly as it does on the marketing site.

- [ ] **Step 8: Commit**

```bash
git add src/components/dashboard/dashboard-topbar.tsx src/app/[locale]/(dashboard)/layout.tsx messages/en.json messages/ru.json messages/uz.json
git commit -m "feat: add a dashboard top bar with breadcrumb, command-palette hint, and theme toggle"
```
