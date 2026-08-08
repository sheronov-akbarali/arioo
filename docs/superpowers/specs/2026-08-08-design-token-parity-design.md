# Design token parity with worken.ru (Phase A)

## Context

The user wants the product's visual design to fully match worken.ru — not
just page structure (already done in a prior spec/plan) but colors,
typography, and spacing, across the entire site: marketing pages and every
dashboard section. This is too large to spec and implement as one project,
so it splits into two phases:

- **Phase A (this spec):** replace the design token system (colors, font,
  radius) so every shadcn-based component across the whole app — buttons,
  cards, badges, inputs, the sidebar — picks up worken.ru's palette
  automatically, in both light and dark mode.
- **Phase B (separate, future spec):** page-by-page layout/box-arrangement
  comparison against worken.ru's equivalent page, for each of the 13+
  dashboard sections and the marketing pages. Out of scope here.

worken.ru is itself built on shadcn/ui, so its design tokens were read
directly from its live site via computed CSS custom properties (not
estimated from screenshots) — see the token tables below.

## Goal

After this change, every component that already consumes shadcn's CSS
variables (`bg-background`, `bg-card`, `bg-primary`, `bg-sidebar`, etc.)
renders in worken.ru's warm dark/cream palette instead of the current
neutral black/white + teal palette, in both `:root` (light) and `.dark`
mode, with worken's font (Inter) instead of Geist Sans. No component JSX,
no layout, no page structure changes.

## Scope

In scope:
- `src/app/globals.css` — replace every color token value in both the
  `:root` and `.dark` blocks, and `--radius`.
- `src/app/[locale]/layout.tsx` and `src/app/global-not-found.tsx` — swap
  the `Geist`/`Geist_Mono` font imports for `Inter` (keeping the mono font
  as Geist Mono, since worken.ru doesn't expose a distinct mono token and
  our codebase's only mono usage is incidental, not brand-critical).

Out of scope (Phase B or later):
- Any `.tsx` file's className changes (spacing, layout, component
  structure).
- The marketing hero's specific gradient-button treatment
  (`linear-gradient(135deg, ...)` + custom box-shadow) — worken's primary
  CTA button uses a bespoke gradient/shadow beyond the base token system;
  replicating that visual detail is a Phase B (per-page) concern, not a
  token concern.
- Any new custom CSS variables worken defines outside the standard shadcn
  set (e.g. its marketing-only `--bg-deep`, `--secondary-background`) —
  only the token names our `globals.css` already declares are in scope.

## Design

### Token values

All values are HSL triples (matching worken's format and Tailwind's
`hsl(var(--x))` consumption pattern used by shadcn). Extracted live from
worken.ru via `getComputedStyle(document.documentElement)` on both its
light and dark states.

**Light (`:root`):**

| Token | New value |
|---|---|
| `--background` | `37 45% 97%` |
| `--foreground` | `22 50% 15%` |
| `--card` | `30 30% 94%` |
| `--card-foreground` | `22 50% 15%` |
| `--popover` | `37 45% 97%` |
| `--popover-foreground` | `22 50% 15%` |
| `--primary` | `22 50% 15%` |
| `--primary-foreground` | `37 45% 97%` |
| `--secondary` | `37 30% 90%` |
| `--secondary-foreground` | `22 50% 15%` |
| `--muted` | `30 25% 92%` |
| `--muted-foreground` | `22 20% 35%` |
| `--accent` | `37 30% 90%` |
| `--accent-foreground` | `22 50% 15%` |
| `--destructive` | `0 84.2% 60.2%` |
| `--border` | `30 20% 85%` |
| `--input` | `30 20% 85%` |
| `--ring` | `22 50% 15%` |
| `--sidebar` | `37 42% 95%` |
| `--sidebar-foreground` | `22 35% 22%` |
| `--sidebar-primary` | `22 50% 15%` |
| `--sidebar-primary-foreground` | `37 45% 97%` |
| `--sidebar-accent` | `37 32% 88%` |
| `--sidebar-accent-foreground` | `22 50% 15%` |
| `--sidebar-border` | `30 20% 85%` |
| `--sidebar-ring` | `32 95% 44%` |
| `--radius` | `0.5rem` |
| `--brand` *(our extra token)* | `32 95% 44%` (reuses worken's light-mode amber sidebar-ring — worken has no dedicated light-mode brand accent, so this is the closest equivalent) |
| `--brand-foreground` | `37 45% 97%` (same as `--primary-foreground`, for contrast against the amber) |

**Dark (`.dark`):**

| Token | New value |
|---|---|
| `--background` | `320 18% 8%` |
| `--foreground` | `28 46% 94%` |
| `--card` | `320 18% 11%` |
| `--card-foreground` | `28 46% 94%` |
| `--popover` | `320 18% 11%` |
| `--popover-foreground` | `28 46% 94%` |
| `--primary` | `28 46% 94%` |
| `--primary-foreground` | `320 18% 10%` |
| `--secondary` | `320 14% 15%` |
| `--secondary-foreground` | `28 46% 94%` |
| `--muted` | `320 15% 14%` |
| `--muted-foreground` | `24 15% 67%` |
| `--accent` | `320 14% 15%` |
| `--accent-foreground` | `28 46% 94%` |
| `--destructive` | `0 62.8% 30.6%` |
| `--border` | `320 12% 20%` |
| `--input` | `320 12% 20%` |
| `--ring` | `38 92% 50%` |
| `--sidebar` | `320 16% 10%` |
| `--sidebar-foreground` | `28 40% 92%` |
| `--sidebar-primary` | `38 92% 50%` |
| `--sidebar-primary-foreground` | `320 18% 8%` |
| `--sidebar-accent` | `320 14% 16%` |
| `--sidebar-accent-foreground` | `28 46% 94%` |
| `--sidebar-border` | `320 12% 20%` |
| `--sidebar-ring` | `38 92% 50%` |
| `--brand` *(our extra token)* | `38 92% 50%` (worken's amber accent — used for its sidebar active-state highlight, focus rings, and gradient headline text) |
| `--brand-foreground` | `320 18% 10%` (same as `--primary-foreground`, for contrast against the amber) |

`--chart-1` through `--chart-5` are identical in both modes on worken (it
doesn't vary chart colors by theme), so both `:root` and `.dark` get:
`220 70% 50%`, `160 60% 45%`, `30 80% 55%`, `280 65% 60%`, `340 75% 55%`.

**Format note:** our current `globals.css` uses `oklch(...)` function
syntax; worken's tokens are plain HSL triples consumed via
`hsl(var(--x))` in its Tailwind config. Our `@theme inline` block maps
`--color-background: var(--background)` etc. and Tailwind v4's `oklch()`
function accepts space-separated triples the same way `hsl()` does — but
since these are HSL triples, not OKLCH ones, they must be written as
`hsl(37 45% 97%)` (wrapped in the `hsl()` function), not bare inside an
`oklch()`-flavored declaration. Each `:root`/`.dark` variable declaration
becomes `--background: hsl(37 45% 97%);` (function wrapper added), not a
bare triple — this differs from the current file's bare `oklch(...)`
style only in which function wraps the value, keeping the same
"CSS variable holds a complete color function call" pattern the file
already uses.

### Font swap

Replace:
```ts
import { Geist, Geist_Mono } from "next/font/google";
const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
```
with:
```ts
import { Inter, Geist_Mono } from "next/font/google";
const inter = Inter({ variable: "--font-geist-sans", subsets: ["latin"] });
```
Keeping the CSS variable name `--font-geist-sans` (not renaming to
`--font-inter`) avoids touching `globals.css`'s `@theme inline` block's
`--font-sans: var(--font-geist-sans)` line and the `className` string in
both layout files that reference that variable name — this is a font
swap, not a variable rename, so the blast radius stays limited to the two
import/init lines in each of the two files. `Geist_Mono` is unchanged
(worken doesn't expose a mono font token, and our own mono usage is
incidental).

## Testing

- `npm run build` succeeds.
- `npm test` — no test currently asserts on color values, so the existing
  suite should stay green untouched; this confirms the change didn't
  break anything functional.
- Manual check: load the homepage and at least one dashboard page
  (`/assistants`) in both light and dark mode, confirm the background,
  card, sidebar, and button colors visually match worken.ru's
  corresponding light/dark screenshots (already captured during
  research), and that text stays legible (sufficient contrast) in all
  four combinations (light/dark × marketing/dashboard).
