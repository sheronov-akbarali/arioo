# Design Token Parity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the app's shadcn design tokens (colors, radius) and base font with worken.ru's exact values, so every existing shadcn-based component across the marketing site and all dashboard sections picks up worken's warm dark/cream + amber palette automatically, in both light and dark mode.

**Architecture:** A single CSS file (`src/app/globals.css`) holds every color token in a `:root` (light) block and a `.dark` block; swapping the values inside those two blocks is the entire visual change, since every component already consumes them via Tailwind's `@theme inline` mapping (`bg-background`, `bg-card`, `bg-primary`, `bg-sidebar`, etc.). Two font-loading call sites (`src/app/[locale]/layout.tsx`, which shells the whole app including the dashboard, and `src/app/global-not-found.tsx`, a separate document shell for unmatched routes) get `Geist` swapped for `Inter`.

**Tech Stack:** Next.js App Router, Tailwind CSS v4, shadcn/ui, `next/font/google`.

## Global Constraints

- Token values must match worken.ru's exact HSL triples, extracted live from its site (see the spec's tables) — do not approximate or round further.
- `--chart-1` through `--chart-5` are identical in both light and dark mode (worken doesn't vary them).
- Keep the CSS variable name `--font-geist-sans` when swapping to Inter — do not rename it, since `globals.css`'s `@theme inline` block and both files' template-literal `className` strings reference that exact name.
- `Geist_Mono` stays unchanged in `[locale]/layout.tsx` — only the sans font swaps.
- No `.tsx` component, layout, or page structure changes in this plan — colors and font are the entire scope. Page-by-page layout parity is a separate future plan (Phase B).

---

## Task 1: Replace color tokens, radius, and font

**Files:**
- Modify: `src/app/globals.css` (both `:root` and `.dark` blocks, plus `--radius` inside `:root`)
- Modify: `src/app/[locale]/layout.tsx:3,14-17` (font import and init)
- Modify: `src/app/global-not-found.tsx:2,11-14` (font import and init)

**Interfaces:** None — this task has no consumers within the plan; it's a leaf change to values already wired into every component via existing Tailwind class names (`bg-background`, `text-foreground`, `bg-brand`, etc.).

- [ ] **Step 1: Replace the `:root` block in `src/app/globals.css`**

Find:

```css
:root {
  --background: oklch(1 0 0);
  --foreground: oklch(0.145 0 0);
  --brand: oklch(0.6 0.11 175);
  --brand-foreground: oklch(0.98 0 0);
  --card: oklch(1 0 0);
  --card-foreground: oklch(0.145 0 0);
  --popover: oklch(1 0 0);
  --popover-foreground: oklch(0.145 0 0);
  --primary: oklch(0.205 0 0);
  --primary-foreground: oklch(0.985 0 0);
  --secondary: oklch(0.97 0 0);
  --secondary-foreground: oklch(0.205 0 0);
  --muted: oklch(0.97 0 0);
  --muted-foreground: oklch(0.556 0 0);
  --accent: oklch(0.97 0 0);
  --accent-foreground: oklch(0.205 0 0);
  --destructive: oklch(0.577 0.245 27.325);
  --border: oklch(0.922 0 0);
  --input: oklch(0.922 0 0);
  --ring: oklch(0.708 0 0);
  --chart-1: oklch(0.87 0 0);
  --chart-2: oklch(0.556 0 0);
  --chart-3: oklch(0.439 0 0);
  --chart-4: oklch(0.371 0 0);
  --chart-5: oklch(0.269 0 0);
  --radius: 0.625rem;
  --sidebar: oklch(0.985 0 0);
  --sidebar-foreground: oklch(0.145 0 0);
  --sidebar-primary: oklch(0.205 0 0);
  --sidebar-primary-foreground: oklch(0.985 0 0);
  --sidebar-accent: oklch(0.97 0 0);
  --sidebar-accent-foreground: oklch(0.205 0 0);
  --sidebar-border: oklch(0.922 0 0);
  --sidebar-ring: oklch(0.708 0 0);
}
```

Replace with:

```css
:root {
  --background: hsl(37 45% 97%);
  --foreground: hsl(22 50% 15%);
  --brand: hsl(32 95% 44%);
  --brand-foreground: hsl(37 45% 97%);
  --card: hsl(30 30% 94%);
  --card-foreground: hsl(22 50% 15%);
  --popover: hsl(37 45% 97%);
  --popover-foreground: hsl(22 50% 15%);
  --primary: hsl(22 50% 15%);
  --primary-foreground: hsl(37 45% 97%);
  --secondary: hsl(37 30% 90%);
  --secondary-foreground: hsl(22 50% 15%);
  --muted: hsl(30 25% 92%);
  --muted-foreground: hsl(22 20% 35%);
  --accent: hsl(37 30% 90%);
  --accent-foreground: hsl(22 50% 15%);
  --destructive: hsl(0 84.2% 60.2%);
  --border: hsl(30 20% 85%);
  --input: hsl(30 20% 85%);
  --ring: hsl(22 50% 15%);
  --chart-1: hsl(220 70% 50%);
  --chart-2: hsl(160 60% 45%);
  --chart-3: hsl(30 80% 55%);
  --chart-4: hsl(280 65% 60%);
  --chart-5: hsl(340 75% 55%);
  --radius: 0.5rem;
  --sidebar: hsl(37 42% 95%);
  --sidebar-foreground: hsl(22 35% 22%);
  --sidebar-primary: hsl(22 50% 15%);
  --sidebar-primary-foreground: hsl(37 45% 97%);
  --sidebar-accent: hsl(37 32% 88%);
  --sidebar-accent-foreground: hsl(22 50% 15%);
  --sidebar-border: hsl(30 20% 85%);
  --sidebar-ring: hsl(32 95% 44%);
}
```

- [ ] **Step 2: Replace the `.dark` block in `src/app/globals.css`**

Find:

```css
.dark {
  --background: oklch(0.145 0 0);
  --foreground: oklch(0.985 0 0);
  --brand: oklch(0.72 0.13 175);
  --brand-foreground: oklch(0.15 0 0);
  --card: oklch(0.205 0 0);
  --card-foreground: oklch(0.985 0 0);
  --popover: oklch(0.205 0 0);
  --popover-foreground: oklch(0.985 0 0);
  --primary: oklch(0.922 0 0);
  --primary-foreground: oklch(0.205 0 0);
  --secondary: oklch(0.269 0 0);
  --secondary-foreground: oklch(0.985 0 0);
  --muted: oklch(0.269 0 0);
  --muted-foreground: oklch(0.708 0 0);
  --accent: oklch(0.269 0 0);
  --accent-foreground: oklch(0.985 0 0);
  --destructive: oklch(0.704 0.191 22.216);
  --border: oklch(1 0 0 / 10%);
  --input: oklch(1 0 0 / 15%);
  --ring: oklch(0.556 0 0);
  --chart-1: oklch(0.87 0 0);
  --chart-2: oklch(0.556 0 0);
  --chart-3: oklch(0.439 0 0);
  --chart-4: oklch(0.371 0 0);
  --chart-5: oklch(0.269 0 0);
  --sidebar: oklch(0.205 0 0);
  --sidebar-foreground: oklch(0.985 0 0);
  --sidebar-primary: oklch(0.488 0.243 264.376);
  --sidebar-primary-foreground: oklch(0.985 0 0);
  --sidebar-accent: oklch(0.269 0 0);
  --sidebar-accent-foreground: oklch(0.985 0 0);
  --sidebar-border: oklch(1 0 0 / 10%);
  --sidebar-ring: oklch(0.556 0 0);
}
```

Replace with:

```css
.dark {
  --background: hsl(320 18% 8%);
  --foreground: hsl(28 46% 94%);
  --brand: hsl(38 92% 50%);
  --brand-foreground: hsl(320 18% 10%);
  --card: hsl(320 18% 11%);
  --card-foreground: hsl(28 46% 94%);
  --popover: hsl(320 18% 11%);
  --popover-foreground: hsl(28 46% 94%);
  --primary: hsl(28 46% 94%);
  --primary-foreground: hsl(320 18% 10%);
  --secondary: hsl(320 14% 15%);
  --secondary-foreground: hsl(28 46% 94%);
  --muted: hsl(320 15% 14%);
  --muted-foreground: hsl(24 15% 67%);
  --accent: hsl(320 14% 15%);
  --accent-foreground: hsl(28 46% 94%);
  --destructive: hsl(0 62.8% 30.6%);
  --border: hsl(320 12% 20%);
  --input: hsl(320 12% 20%);
  --ring: hsl(38 92% 50%);
  --chart-1: hsl(220 70% 50%);
  --chart-2: hsl(160 60% 45%);
  --chart-3: hsl(30 80% 55%);
  --chart-4: hsl(280 65% 60%);
  --chart-5: hsl(340 75% 55%);
  --sidebar: hsl(320 16% 10%);
  --sidebar-foreground: hsl(28 40% 92%);
  --sidebar-primary: hsl(38 92% 50%);
  --sidebar-primary-foreground: hsl(320 18% 8%);
  --sidebar-accent: hsl(320 14% 16%);
  --sidebar-accent-foreground: hsl(28 46% 94%);
  --sidebar-border: hsl(320 12% 20%);
  --sidebar-ring: hsl(38 92% 50%);
}
```

Leave the `@theme inline` block, the `@layer base` block, and the file's
imports untouched — only the two variable blocks change.

- [ ] **Step 3: Swap the font in `src/app/[locale]/layout.tsx`**

Change:

```ts
import { Geist, Geist_Mono } from "next/font/google";
```

to:

```ts
import { Inter, Geist_Mono } from "next/font/google";
```

Change:

```ts
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});
```

to:

```ts
const geistSans = Inter({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});
```

Keep the constant name `geistSans` and the CSS variable name
`--font-geist-sans` exactly as they are — only the imported font function
and its call change. This keeps line 72's
`className={\`${geistSans.variable} ${geistMono.variable}\`}` correct
with no further edits needed.

- [ ] **Step 4: Swap the font in `src/app/global-not-found.tsx`**

Change:

```ts
import { Geist } from "next/font/google";
```

to:

```ts
import { Inter } from "next/font/google";
```

Change:

```ts
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});
```

to:

```ts
const geistSans = Inter({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});
```

Same rule as Step 3: keep the constant and variable names unchanged so
line 23's `className={\`dark ${geistSans.variable}\`}` needs no edit.

- [ ] **Step 5: Run the unit test suite**

Run: `npm test`
Expected: all existing tests still pass (35/35 as of this plan) — no test
asserts on color values, so this is a sanity check that the change didn't
break anything functional.

- [ ] **Step 6: Build**

Run: `npm run build`
Expected: succeeds with no errors (this also validates the CSS is
syntactically correct and both font modules resolve).

- [ ] **Step 7: Commit**

```bash
git add src/app/globals.css "src/app/[locale]/layout.tsx" src/app/global-not-found.tsx
git commit -m "feat: replace design tokens and font with worken.ru's exact values"
```

---

## Task 2: Visual verification across light/dark and marketing/dashboard

**Files:** none (verification only)

- [ ] **Step 1: Start the dev server**

Run: `npm run dev`

- [ ] **Step 2: Check the marketing homepage in dark mode**

Visit `/uz` (or whichever locale) with dark mode active (the default, or
toggle via the theme switcher in the header). Confirm: page background is
a deep warm plum-brown (not black or teal-tinted gray), body text is warm
cream (not pure white), and any element using `bg-brand`/`text-brand`
(e.g. the header's "Bepul boshlash" button, badges) renders in amber/gold
rather than teal.

- [ ] **Step 3: Check the marketing homepage in light mode**

Toggle to light mode via the theme switcher. Confirm: background is warm
cream (not pure white), text is dark warm brown (not pure black), and
`bg-brand` elements render in amber/gold.

- [ ] **Step 4: Check a dashboard page in dark mode**

Sign in and visit `/assistants` (or any dashboard route) in dark mode.
Confirm: the sidebar background is a distinct deep plum tone from the
main content background (per the `--sidebar` vs `--background` values),
the active/hovered sidebar item highlights in amber
(`--sidebar-primary`), and cards render with the warm dark card color
rather than the previous neutral gray.

- [ ] **Step 5: Check a dashboard page in light mode**

Same page, light mode. Confirm the sidebar and content area both use the
warm cream palette and the active nav item highlights in amber.

- [ ] **Step 6: Confirm text stays legible in all four checks**

For each of the four combinations above, confirm body text, muted text
(e.g. card descriptions, timestamps), and button labels are all clearly
readable against their backgrounds — no low-contrast pairing introduced
by the token swap.

- [ ] **Step 7: Stop the dev server**

No commit needed — this task is verification-only. If any check fails,
fix the offending value in Task 1's files and re-run from Step 1.
