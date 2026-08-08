# Dashboard Shell Fix & Animated Hero Diagram — Design

**Goal:** Fix a layout bug where the marketing site's `Header`/`Footer` wrap every
route under `[locale]`, including the authenticated dashboard, producing a
double-header and a stray marketing footer inside the dashboard's scroll area.
Separately, replace the static two-column hero diagram (`AgentFlowPanel`) with
an animated version modeled on worken.ru's node-and-connector diagram (source
cards → central AI-employee node → system cards, with a traveling pulse and
cycling highlight), using no new npm dependency.

**Context:** worken.ru (authenticated + marketing) was reviewed live in Chrome
for reference. Our local dashboard was also reviewed live (existing logged-in
session) and confirmed the double-chrome bug via screenshot.

---

## Part 1: Dashboard shell fix

**Root cause:** `src/app/[locale]/layout.tsx` renders `<Header/>` and
`<Footer/>` unconditionally around `{children}`, so every route group under
`[locale]` — marketing pages, `(auth)`, and `(dashboard)` — gets marketing
chrome. `(dashboard)/layout.tsx` already renders its own full app shell
(`SidebarProvider`/`Sidebar`/`SidebarInset`), so the dashboard ends up with
the marketing header floating over its sidebar header and the marketing
footer (sitemap links, a "Kabinetga kirish" sign-in button) rendering inside
the dashboard's content scroll area below whatever page content exists.

**Fix:** Move `Header`/`Footer` out of the root `[locale]/layout.tsx` into a
new `(marketing)` route group layout that wraps only the routes that want
marketing chrome. Route groups don't affect URLs, so this is a pure file
reorganization:

- New: `src/app/[locale]/(marketing)/layout.tsx` — renders `<Header/>{children}<Footer/>`
- Move into `(marketing)/`: `page.tsx` (homepage), `pricing/`, `partners/`, `legal/`
- `(auth)` also moves into `(marketing)/(auth)` — sign-in/sign-up/onboarding/invite
  keep the marketing header (brand consistency, nav back to marketing site),
  confirmed acceptable in the existing product (no complaint about auth chrome).
- `(dashboard)` stays exactly where it is, untouched — it no longer receives
  `Header`/`Footer` at all once they're removed from the root layout.
- Root `[locale]/layout.tsx` keeps only `<html>/<body>`, providers
  (`NextIntlClientProvider`, `ThemeProvider`, `AppClerkProvider`), and
  `{children}` — no `<main>` wrapper needed there since each group provides
  its own document structure now.
- `not-found.tsx` under `[locale]/` stays at that level (applies site-wide);
  it already doesn't reference Header/Footer directly.

**Testing:** existing Playwright specs (`tests/e2e/marketing.spec.ts`,
`auth.spec.ts`, `assistants.spec.ts`) assert on marketing pages and
sign-in-redirect behavior — none assert on `(dashboard)` chrome, so this is a
regression check, not new coverage. Manually verify in the browser (already
logged in) that the dashboard shows only the sidebar shell, no marketing
header/footer.

---

## Part 2: Animated hero diagram

**Reference behavior (worken.ru):** a card of source nodes (Website,
Telegram, Avito, Zoom, ...) sits left of a central "AI Employee" node, which
connects right to system nodes (CRM, MCP, Scripts). Dashed connector lines
join every source to the center and the center to every system. On a timer,
one source node gets a highlighted border, a small dot/icon animates along
its connector line to the center, then continues along a connector to a
system node, which also highlights — then the cycle moves to the next source.

**Our version:** same mechanism, scoped to the content we already have (3
source nodes: Veb-sayt/Telegram/OLX.uz; 1 center node: AI Xodim; 2 system
nodes: CRM/Bilim bazasi — existing `hero.diagram.*` i18n keys, unchanged, no
new translation strings needed).

**Component:** rewrite `src/components/marketing/agent-flow-panel.tsx` as a
client component (`"use client"`):

- Layout: absolutely-positioned node cards (same visual style as today —
  rounded card, icon chip, label/sublabel) over an `<svg>` layer that draws
  the connector lines as `<path>` elements between fixed node anchor points.
  A `ResizeObserver`-free approach: use a fixed-height container with
  percentage-based anchor coordinates (nodes don't reflow independently of
  the SVG, so no measurement/sync logic needed) — 3-column grid mirrors
  today's layout (sources | center | systems), paths drawn between column
  edges.
- Traveling pulse: one small `<circle>` per active connector, animated with
  SVG `<animateMotion>` along the `<path>` (`dur` matched to the cycle
  interval) — declarative, no requestAnimationFrame loop needed.
- Cycle state: a `useEffect` interval (~2.5s) advances an `activeIndex`
  through the 3 sources in order; the active source's card gets the existing
  `emphasis` styling (brand border/glow), its outbound path gets a brand
  stroke color and the traveling circle, and the system node it targets
  (alternating CRM/Bilim bazasi, matching worken's pattern of cycling
  destinations too) gets the emphasis style for that beat.
- Respect `prefers-reduced-motion`: if set, skip the interval entirely and
  render all nodes in their default (non-cycling) state with static
  connector lines, no animation — accessibility requirement, not optional.
- No new dependency: plain SVG + CSS + one `setInterval` in a `useEffect`,
  consistent with the codebase's current minimal-dependency approach (no
  animation library is installed anywhere else in the project).

**Testing:** no unit test today covers `AgentFlowPanel` (it's presentational);
none added — visual/behavioral correctness is verified by hand in the browser
across light/dark mode, matching how the design-token-parity work was
verified. `tests/e2e/marketing.spec.ts` already loads the homepage; if it
does any strict content assertion inside the hero it must still pass
unchanged since the i18n keys aren't changing.

---

## Out of scope

- No changes to `(dashboard)` page content/design beyond removing the
  inherited marketing chrome — the user's "betartib" (disorganized) complaint
  about the dashboard is attributed entirely to the double-chrome bug, not to
  the sidebar/page designs themselves, which were not flagged as wrong.
- No changes to worken.ru's Sales/HR/Marketing tab-switching or "systems"
  categories (MCP, Scripts) — those aren't part of our current hero content
  and adding them is a scope increase beyond "make the existing diagram
  animated."
- No new npm dependency (e.g. Framer Motion) — plain CSS/SVG covers the
  required effect.
