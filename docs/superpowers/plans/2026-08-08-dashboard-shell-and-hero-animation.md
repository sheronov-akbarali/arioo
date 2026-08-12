# Dashboard Shell Fix & Animated Hero Diagram Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stop the marketing `Header`/`Footer` from wrapping the authenticated
dashboard (fixing a double-header/stray-footer bug), and replace the static
hero diagram with an animated, worken.ru-style node-and-connector diagram.

**Architecture:** Part 1 moves `Header`/`Footer` from the root `[locale]/layout.tsx`
into a new `(marketing)` route-group layout that wraps only the marketing
pages and `(auth)`; `(dashboard)` is untouched and stops inheriting marketing
chrome once it's removed from the root. Part 2 rewrites
`AgentFlowPanel` as a client component that draws SVG connector lines between
existing node cards and cycles a highlighted source→system pair with a
traveling dot, on a plain `setInterval`, no new dependency.

**Tech Stack:** Next.js App Router (route groups), React client component,
inline SVG, Tailwind CSS, `next-intl` (unchanged translation keys).

## Global Constraints

- Route groups (`(marketing)`, `(auth)`, `(dashboard)`) never appear in URLs —
  moving files between them must not change any route's path.
- No new npm dependency for the animation (spec: plain CSS/SVG only).
- `hero.diagram.*` i18n keys (`uz`/`ru`/`en`) are unchanged — reuse them as-is.
- Animation must respect `prefers-reduced-motion`: skip the interval and
  render a static, non-cycling diagram when set.
- `(dashboard)` page content/design is out of scope — only remove the
  inherited marketing chrome.

---

## Task 1: Move marketing routes into a `(marketing)` route group

**Files:**
- Create: `src/app/[locale]/(marketing)/layout.tsx`
- Move: `src/app/[locale]/page.tsx` → `src/app/[locale]/(marketing)/page.tsx`
- Move: `src/app/[locale]/pricing/` → `src/app/[locale]/(marketing)/pricing/`
- Move: `src/app/[locale]/partners/` → `src/app/[locale]/(marketing)/partners/`
- Move: `src/app/[locale]/legal/` → `src/app/[locale]/(marketing)/legal/`
- Move: `src/app/[locale]/(auth)/` → `src/app/[locale]/(marketing)/(auth)/`
- Modify: `src/app/[locale]/layout.tsx` (remove `Header`/`Footer`)

**Interfaces:** None — this is a file-tree reorganization with no new
exported functions or types. `(dashboard)/layout.tsx` is not touched and
keeps exporting its existing default `DashboardLayout`.

- [ ] **Step 1: Move the marketing route files with `git mv`**

Run each of these from the repo root (preserves git history):

```bash
mkdir -p "src/app/[locale]/(marketing)"
git mv "src/app/[locale]/page.tsx" "src/app/[locale]/(marketing)/page.tsx"
git mv "src/app/[locale]/pricing" "src/app/[locale]/(marketing)/pricing"
git mv "src/app/[locale]/partners" "src/app/[locale]/(marketing)/partners"
git mv "src/app/[locale]/legal" "src/app/[locale]/(marketing)/legal"
git mv "src/app/[locale]/(auth)" "src/app/[locale]/(marketing)/(auth)"
```

- [ ] **Step 2: Create the `(marketing)` layout**

Create `src/app/[locale]/(marketing)/layout.tsx`:

```tsx
import type { ReactNode } from "react";
import { Header } from "@/components/marketing/header";
import { Footer } from "@/components/marketing/footer";

export default function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <Header />
      <main>{children}</main>
      <Footer />
    </>
  );
}
```

- [ ] **Step 3: Strip `Header`/`Footer` from the root locale layout**

In `src/app/[locale]/layout.tsx`, remove the `Header`/`Footer` imports and
usage. Change:

```tsx
import { Header } from "@/components/marketing/header";
import { Footer } from "@/components/marketing/footer";
```

to nothing (delete both lines), and change:

```tsx
            <AppClerkProvider>
              <Header />
              <main>{children}</main>
              <Footer />
            </AppClerkProvider>
```

to:

```tsx
            <AppClerkProvider>{children}</AppClerkProvider>
```

`(dashboard)/layout.tsx` already renders its own full shell
(`SidebarProvider`/`Sidebar`/`SidebarInset`) directly as `{children}`'s
content, so it needs no `<main>` wrapper here. The new `(marketing)/layout.tsx`
from Step 2 provides its own `<main>` for the marketing tree.

- [ ] **Step 4: Build and fix any import path breakage**

Run: `npm run build`

The moved files (`page.tsx`, `pricing/page.tsx`, etc.) use the `@/*` path
alias for all their imports (verify by grepping), so moving them across
directories should not require import changes. If the build reports a
broken relative import (`./` or `../`) inside any moved file, fix it to the
`@/*` alias form matching the rest of the codebase.
Expected: build succeeds, and the route list printed at the end still shows
`/[locale]`, `/[locale]/pricing`, `/[locale]/partners`, `/[locale]/legal/[doc]`,
`/[locale]/sign-in/[[...sign-in]]`, `/[locale]/sign-up/[[...sign-up]]`,
`/[locale]/onboarding`, `/[locale]/invite/[token]` — same paths as before the move.

- [ ] **Step 5: Run the existing e2e and unit suites**

Run: `npx vitest run && npx playwright test`
Expected: all pass unchanged — these test URLs and behavior, not file
locations, so nothing here should need test edits.

- [ ] **Step 6: Manually verify in the browser**

With the dev server running (`npm run dev`), sign in and visit `/uz/dashboard`
(or any dashboard route): confirm only the dashboard's own sidebar shell
renders — no marketing header at the top, no marketing footer below the page
content when scrolling. Then visit `/uz` (homepage) and `/uz/sign-in`:
confirm both still show the marketing header and footer exactly as before.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "fix: stop marketing header/footer from wrapping the dashboard"
```

---

## Task 2: Animated hero diagram

**Files:**
- Modify: `src/components/marketing/agent-flow-panel.tsx` (full rewrite)

**Interfaces:**
- Produces: `AgentFlowPanel` — a default-exported-free named export
  `export function AgentFlowPanel()`, same as today, imported by
  `src/components/marketing/hero.tsx:5` (`import { AgentFlowPanel } from "./agent-flow-panel"`,
  used as `<AgentFlowPanel />` at `hero.tsx:35`) — **signature unchanged**, so
  `hero.tsx` needs no edit.
- Consumes: existing i18n keys under `hero.diagram.*` in `messages/uz.json`,
  `messages/ru.json`, `messages/en.json` (`sources`, `website.label`,
  `website.sublabel`, `telegram.label`, `telegram.sublabel`, `olx.label`,
  `olx.sublabel`, `crm.label`, `crm.sublabel`, `knowledge.label`,
  `knowledge.sublabel`, `agent.label`, `agent.sublabel`) — no new keys.

- [ ] **Step 1: Replace `agent-flow-panel.tsx` with the animated version**

Replace the full contents of `src/components/marketing/agent-flow-panel.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Globe, Send, ShoppingBag, Database, BookOpen, Bot, type LucideIcon } from "lucide-react";

const SOURCE_ICONS: LucideIcon[] = [Globe, Send, ShoppingBag];
const SYSTEM_ICONS: LucideIcon[] = [Database, BookOpen];
const CYCLE_MS = 2500;

function Node({
  icon: Icon,
  label,
  sublabel,
  active,
}: {
  icon: LucideIcon;
  label: string;
  sublabel: string;
  active: boolean;
}) {
  return (
    <div
      className={
        active
          ? "relative z-10 flex items-center gap-3 rounded-xl border border-brand bg-brand/10 p-3 shadow-[0_0_24px_-8px_var(--brand)] transition-colors duration-500"
          : "relative z-10 flex items-center gap-3 rounded-xl border border-border bg-card p-3 transition-colors duration-500"
      }
    >
      <span
        className={
          active
            ? "flex size-8 shrink-0 items-center justify-center rounded-lg bg-brand text-brand-foreground transition-colors duration-500"
            : "flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground transition-colors duration-500"
        }
      >
        <Icon className="size-4" />
      </span>
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">{label}</p>
        <p className="truncate text-xs text-muted-foreground">{sublabel}</p>
      </div>
    </div>
  );
}

// Anchor points as percentages of the diagram's bounding box, matching the
// 3-row source column (top/middle/bottom), the centered agent node, and the
// 2-row system column. Percentages (not measured pixels) mean no
// ResizeObserver/layout-effect sync is needed between the cards and the SVG.
const SOURCE_Y = [12, 50, 88];
const SYSTEM_Y = [25, 75];
const AGENT_POINT = { x: 50, y: 50 };
const SOURCE_X = 2;
const SYSTEM_X = 98;

function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(query.matches);
    const listener = (e: MediaQueryListEvent) => setReduced(e.matches);
    query.addEventListener("change", listener);
    return () => query.removeEventListener("change", listener);
  }, []);
  return reduced;
}

export function AgentFlowPanel() {
  const t = useTranslations("hero.diagram");
  const reducedMotion = useReducedMotion();
  const sourceKeys = ["website", "telegram", "olx"] as const;
  const systemKeys = ["crm", "knowledge"] as const;

  const [activeSource, setActiveSource] = useState(0);
  const activeSystem = activeSource % systemKeys.length;

  useEffect(() => {
    if (reducedMotion) return;
    const id = setInterval(() => {
      setActiveSource((i) => (i + 1) % sourceKeys.length);
    }, CYCLE_MS);
    return () => clearInterval(id);
  }, [reducedMotion, sourceKeys.length]);

  const sourceToAgentPath = (i: number) =>
    `M ${SOURCE_X} ${SOURCE_Y[i]} C 30 ${SOURCE_Y[i]}, 30 ${AGENT_POINT.y}, ${AGENT_POINT.x} ${AGENT_POINT.y}`;
  const agentToSystemPath = (i: number) =>
    `M ${AGENT_POINT.x} ${AGENT_POINT.y} C 70 ${AGENT_POINT.y}, 70 ${SYSTEM_Y[i]}, ${SYSTEM_X} ${SYSTEM_Y[i]}`;

  return (
    <div className="rounded-2xl border border-border bg-card/50 p-6">
      <p className="mb-4 text-xs font-medium tracking-wide text-muted-foreground uppercase">
        {t("sources")}
      </p>
      <div className="relative grid grid-cols-[1fr_auto_1fr] items-center gap-3">
        <svg
          aria-hidden
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          className="pointer-events-none absolute inset-0 h-full w-full"
        >
          {sourceKeys.map((key, i) => (
            <path
              key={key}
              d={sourceToAgentPath(i)}
              fill="none"
              stroke={!reducedMotion && i === activeSource ? "var(--brand)" : "var(--border)"}
              strokeWidth={0.6}
              strokeDasharray={!reducedMotion && i === activeSource ? undefined : "2 2"}
              className="transition-colors duration-500"
              vectorEffect="non-scaling-stroke"
            />
          ))}
          {systemKeys.map((key, i) => (
            <path
              key={key}
              d={agentToSystemPath(i)}
              fill="none"
              stroke={!reducedMotion && i === activeSystem ? "var(--brand)" : "var(--border)"}
              strokeWidth={0.6}
              strokeDasharray={!reducedMotion && i === activeSystem ? undefined : "2 2"}
              className="transition-colors duration-500"
              vectorEffect="non-scaling-stroke"
            />
          ))}
          {!reducedMotion && (
            <>
              <circle r={1.4} fill="var(--brand)">
                <animateMotion
                  key={`source-${activeSource}`}
                  dur={`${CYCLE_MS / 1000}s`}
                  repeatCount="1"
                  path={sourceToAgentPath(activeSource)}
                />
              </circle>
              <circle r={1.4} fill="var(--brand)">
                <animateMotion
                  key={`system-${activeSystem}`}
                  dur={`${CYCLE_MS / 1000}s`}
                  repeatCount="1"
                  path={agentToSystemPath(activeSystem)}
                />
              </circle>
            </>
          )}
        </svg>

        <div className="flex flex-col gap-3">
          {sourceKeys.map((key, i) => {
            const Icon = SOURCE_ICONS[i]!;
            return (
              <Node
                key={key}
                icon={Icon}
                label={t(`${key}.label`)}
                sublabel={t(`${key}.sublabel`)}
                active={!reducedMotion && i === activeSource}
              />
            );
          })}
        </div>

        <div aria-hidden className="w-8" />

        <div className="flex flex-col gap-3">
          {systemKeys.map((key, i) => {
            const Icon = SYSTEM_ICONS[i]!;
            return (
              <Node
                key={key}
                icon={Icon}
                label={t(`${key}.label`)}
                sublabel={t(`${key}.sublabel`)}
                active={!reducedMotion && i === activeSystem}
              />
            );
          })}
        </div>
      </div>

      <div className="relative z-10 mt-4">
        <Node icon={Bot} label={t("agent.label")} sublabel={t("agent.sublabel")} active />
      </div>
    </div>
  );
}
```

Notes for the implementer:
- The `<animateMotion>` elements are re-mounted on every cycle via the
  `key={`source-${activeSource}`}` trick (a new `key` forces React to
  recreate the element, which restarts the SVG animation from the
  beginning) — this is what makes the dot travel once per cycle rather than
  looping mid-path or not restarting.
- `vectorEffect="non-scaling-stroke"` keeps line thickness visually
  consistent even though the `viewBox` is stretched non-uniformly by
  `preserveAspectRatio="none"` to fill the card's actual (non-square) aspect
  ratio.
- The center "AI Xodim" node keeps `active` always `true` (it's the
  permanent hub, matching today's `emphasis` styling which was also
  always-on for that node).

- [ ] **Step 2: Typecheck and lint**

Run: `npx tsc --noEmit -p tsconfig.json && npm run lint`
Expected: both clean, no errors.

- [ ] **Step 3: Manually verify in the browser**

With the dev server running, visit `/uz` and watch the hero diagram for at
least two full cycles (5+ seconds): confirm a source card highlights, a dot
travels from it to the center "AI Xodim" node, then a second dot travels
from the center to a system card which also highlights, and the active
source advances (Veb-sayt → Telegram → OLX.uz → repeat). Check both light
and dark mode. Then, in Chrome DevTools, enable "Emulate CSS media feature
prefers-reduced-motion: reduce" (Rendering tab), reload, and confirm the
diagram renders statically with no highlighting or motion.

- [ ] **Step 4: Run the full test suite**

Run: `npx vitest run && npm run build`
Expected: unit tests pass unchanged (no test covers this presentational
component); build succeeds.

- [ ] **Step 5: Commit**

```bash
git add src/components/marketing/agent-flow-panel.tsx
git commit -m "feat: animate the hero agent-flow diagram"
```
