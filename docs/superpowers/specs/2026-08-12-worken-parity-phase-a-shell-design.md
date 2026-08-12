# worken.ru Parity — Phase A: Design Tokens & Dashboard Shell — Design

**Goal:** Bring Arioo's color tokens and dashboard shell (sidebar + top bar) into
detail-for-detail visual parity with worken.ru's authenticated app, with exactly
one deliberate deviation: replace worken's orange brand accent with a dark blue.
This is the foundation phase — every later phase (marketing pixel-parity,
per-page dashboard parity, the assistant editor, real integrations) builds on
these tokens and this shell.

**Context:** A full live-Chrome audit of worken.ru (marketing site +
authenticated dashboard, logged into a real account) was conducted and written
to `/tmp/.../scratchpad/worken-ru-audit.md` (not committed — ephemeral research
artifact; the concrete values below are transcribed from it). Current Arioo
state was independently inspected via `Explore`.

---

## Part 1: Color tokens

**Finding:** Arioo's tokens (`src/app/globals.css`) were already copied from
worken.ru verbatim in an earlier phase (see git history: "replace design
tokens and font with worken.ru's exact values") — background/foreground/card/
border/muted in both light and dark mode already match the audit exactly.
**The only gap is the accent color**: `--brand` (and everything derived from
it — `--ring`, `--sidebar-primary`, `--sidebar-ring` in both modes) is
currently worken's orange (`hsl(38 92% 50%)` dark / `hsl(32 95% 44%)` light).
Replace these four tokens only, in both `:root` and `.dark`, with a dark blue:

- `--brand` / `--sidebar-primary` / `--sidebar-ring`: dark mode
  `hsl(217 91% 45%)`, light mode `hsl(217 91% 40%)` (slightly darker in light
  mode for contrast against the cream background, mirroring how worken darkens
  its own light-mode ring vs. dark-mode ring). `--brand-foreground` stays
  near-white (`hsl(210 40% 98%)`) in both modes since it sits on a saturated
  blue fill.
- `--ring`: same blue as `--brand` in both modes (worken's `--ring` also
  equals its brand orange in dark mode; light mode is the one place worken's
  `--ring` breaks from `--primary` and uses the orange directly — we mirror
  that by using our blue for `--ring` in both modes for consistency, since
  unlike worken we don't have a separate warm-brown primary/ring split to
  preserve).
- All other tokens (`--background`, `--foreground`, `--card`, `--border`,
  `--muted`, `--secondary`, `--destructive`, `--chart-1..5`, `--radius`,
  `--sidebar`, `--sidebar-foreground`, `--sidebar-accent`, `--sidebar-border`)
  are already correct — **no changes**.
- Font (Inter, already wired via `next/font/google` on the legacy
  `--font-geist-sans` variable name) and radius (`--radius: 0.5rem`, derived
  scale) are already correct — **no changes**.

Exact hex equivalents for reference (not used directly — HSL stays the format
of record to match the existing token style): `hsl(217 91% 45%)` ≈ `#1a56db`,
`hsl(217 91% 40%)` ≈ `#1849b8`.

---

## Part 2: Dashboard sidebar

**Current state:** `src/components/ui/sidebar.tsx` is a shadcn/ui-style
primitive that supports an icon-only collapsed mode
(`SIDEBAR_WIDTH_ICON = "3rem"`, `group-data-[collapsible=icon]`), but the
dashboard (`src/app/[locale]/(dashboard)/layout.tsx`) never opts into it —
`<Sidebar>` uses the default `collapsible="offcanvas"`, so today's sidebar is
a full 16rem expanded rail with labels, and the reported "sig'may qolgan"
(doesn't fit) bug is this expanded rail's nav list overflowing at short
window heights with no working scroll.

**Change:** Switch the dashboard's `<Sidebar>` to `collapsible="icon"` and
force it to stay in the icon-collapsed state permanently (no expand toggle
exposed) — matching worken.ru's permanent 48px icon-only rail with
hover-tooltip labels (the primitive already renders tooltips on nav items
when collapsed to icon mode — confirm via `SidebarMenuButton`'s `tooltip`
prop path in `sidebar.tsx` and wire tooltip text from the existing nav item
labels in `sidebar-nav.tsx`).

- **Width**: 48px (`3rem`, matches `SIDEBAR_WIDTH_ICON` already defined —
  matches worken's measured 48px exactly, no change needed to that constant).
- **Icon order**: keep Arioo's existing grouping and icon choices in
  `sidebar-nav.tsx` (work / data / monitoring / partnership groups) — worken's
  exact icon glyphs aren't a requirement (lucide-react vs. worken's icon set
  differ arbitrarily), only the *structural pattern* (icon rail, tooltip on
  hover, grouped with separators, active-route highlight, avatar pinned at
  bottom) is being matched. Add one addition to reach full parity: a
  **Billing icon** in the partnership/finance group linking to `/billing`
  (worken shows Billing in its icon rail; Arioo currently only exposes it via
  the footer `BillingWidget`, which stays as-is — the icon is additive, not a
  replacement).
- **Active-route styling**: filled rounded-square highlight behind the active
  icon, using `--sidebar-accent` (already the correct token, already how the
  primitive styles the active item — confirm no change needed, verify in
  implementation).
- **Overflow — the deliberate improvement over worken:** worken's own
  `overflow-hidden` on the icon-collapsed container silently clips bottom
  icons with no scrollbar when the window is short (confirmed in the audit by
  shrinking to 1400×500). Arioo's `SidebarContent` already carries
  `group-data-[collapsible=icon]:overflow-hidden` (`sidebar.tsx:374`) —
  **remove that override for the icon-collapsed state** so the base
  `overflow-auto` applies uniformly, giving a real (if minimal, thin
  scrollbar) scroll affordance instead of silent clipping. This is the fix
  for the user's reported bug, done better than the reference site.
- **Mobile**: out of scope for this phase — the primitive's existing
  mobile/offcanvas behavior (`isMobile` branch in `sidebar.tsx`) is untouched;
  worken's own mobile dashboard behavior wasn't part of this audit and mobile
  dashboard parity can be a later, separate pass if needed.

---

## Part 3: Dashboard top bar

**Current state:** no shell-level top bar exists at all — no breadcrumb, no
command-palette hint, no theme toggle inside the dashboard (the only
in-sidebar chrome is `SidebarHeader`'s `OrgSwitcher`).

**Change:** add a thin top bar rendered once in
`src/app/[locale]/(dashboard)/layout.tsx`, above `{children}` inside
`SidebarInset`, matching worken's structure:

- Left: current section label as a plain breadcrumb (derive from the active
  nav item's label via the existing route-to-label mapping in
  `sidebar-nav.tsx` — reuse that data rather than duplicating it).
- Right: a **visual-only ⌘K hint button** (renders the shortcut hint, matches
  worken's affordance) and the **theme toggle** (reuse the existing theme
  toggle component already built for the marketing header, if its styling
  transfers cleanly — otherwise a minimal local instance).
- **Explicitly out of scope for this phase:** actual `⌘K` command-palette
  functionality (fuzzy search across assistants/threads/etc.). Worken has a
  working palette; building Arioo's equivalent is a real feature with its own
  design questions (what's searchable, keyboard nav, results UI) and belongs
  in a later phase once more of the dashboard's data surface exists. This
  phase ships the visual hint only, matching the bar's *layout*, not that
  one feature's behavior.

---

## Testing

- New Playwright spec exercising the sidebar's overflow fix directly: resize
  the viewport to a short height (matching the audit's 1400×500 repro),
  assert every nav icon is reachable — either directly visible or reachable
  by scrolling the sidebar container — with no icon permanently clipped.
  This is a regression test for the exact bug reported.
- Existing `tests/e2e/auth.spec.ts` dashboard-redirect test and
  `assistants.spec.ts` must keep passing unchanged (shell changes should not
  alter their assertions, which don't touch sidebar internals).
- No unit test coverage needed for the top bar (presentational, same
  precedent as `AgentFlowPanel`) beyond a typecheck/lint pass.
- Manual verification in the browser: compare Arioo's dashboard side-by-side
  with the worken.ru screenshots from the audit at a normal window size and
  at the 1400×500 repro size, in both light and dark mode.

## Out of scope (belongs to later phases per the agreed roadmap)

- Marketing site structural changes (hero diagram tabs, pricing page
  restructure, partners page, footer, mobile nav) — Phase B.
- Per-page dashboard content parity (filters, empty states, table columns on
  `/products`, `/integrations`, `/stats`, etc.) — Phase C.
- The `/assistants/:id` full editor (AI/Chats/Calls/Knowledge-bases sections)
  — Phase D.
- Any real backend functionality (SIP calling, OAuth integrations, payment
  gateways) — Phase E, already tracked as roadmap phases 4-6.
