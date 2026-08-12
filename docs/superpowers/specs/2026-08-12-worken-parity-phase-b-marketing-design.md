# worken.ru Parity — Phase B: Marketing Site Pixel-Parity — Design

**Goal:** Close the remaining structural gaps between Arioo's marketing site
and worken.ru's, per the live-Chrome audit and Phase A's already-matched
color tokens: the hero diagram gets a department tab-switcher and a Calls
column, the pricing page gets a real per-model token-pricing table, the
footer gets a Telegram CTA, and the mobile menu becomes a dropdown panel
instead of a full drawer.

**Context:** Explored current Arioo marketing components (`hero.tsx`,
`agent-flow-panel.tsx`, `pricing-table.tsx`, `pricing-data.ts`,
`partners/page.tsx` and its sub-components, `footer.tsx`, `mobile-nav.tsx`,
`header.tsx`) — most of the site already structurally matches worken.ru
(2-column hero, 3-column footer, near-identical partners page). The gaps
below are the genuine deltas found.

**Explicitly out of scope (per user decision):** worken's "Worken Drive"
desktop-app promo band — already flagged in CLAUDE.md's roadmap as "not on
our roadmap at all, needs its own product decision," unchanged by this
phase.

**Token-pricing table sourcing decision:** worken.ru's own token-pricing
table shows worken's markup on ~30 providers' models. The user chose **not**
to copy worken's specific numbers, but to show real, current AI-provider
pricing instead — since Arioo's own stack already uses Vercel AI Gateway
(per CLAUDE.md's tech stack section), and AI Gateway publishes a public,
unauthenticated pricing endpoint (`https://ai-gateway.vercel.sh/v1/models`)
that is the actual source of truth for what Arioo would pay per model. Live
values pulled from that endpoint on 2026-08-12 are used below (5 providers
+ embeddings — the endpoint lists ~30+ providers total; this phase seeds the
table with a representative slice covering major-model tiers per provider,
not an exhaustive transcription, since the goal is an honest, accurate
table rather than a maximal one).

---

## Part 1: Hero diagram — department tabs + Calls column

**Current state:** `agent-flow-panel.tsx` (`src/components/marketing/agent-flow-panel.tsx`)
is a prop-free client component with a fixed 3-source → 1-agent → 2-system
layout (Website/Telegram/OLX.uz → AI Xodim → CRM/Bilim bazasi), animated via
`setInterval` cycling `activeSource`, no department concept, no tab UI.

**Change:**
- Add a 3-tab switcher above the diagram card (Sales / HR / Marketing —
  mirroring worken's "💼 Sales / 🧑 HR / 📣 Marketing" pattern, translated),
  matching Arioo's own stated 4-department scope minus one: Arioo's product
  concept (per CLAUDE.md's top-level description) is "sotuv, qo'llab-quvvatlash,
  HR va marketing" (sales, support, HR, marketing) — 4 departments, not
  worken's 3. Use Arioo's own 4: **Sotuv (Sales) / Qo'llab-quvvatlash
  (Support) / HR / Marketing** — this is a deliberate content deviation from
  worken's exact tab count, justified because Arioo's own product already
  defines its department scope differently in CLAUDE.md, and copying
  worken's 3-tab split would misrepresent Arioo's actual 4-department
  product.
- Each tab swaps which department's role-line renders on the center "AI
  Xodim" node (e.g., Sales → "AI Sotuv — Lidlarni malakalashtiradi"), and
  which 2 systems highlight in the systems column — reuse the existing
  `hero.diagram.*` sources (unchanged, all 4 departments still flow through
  the same Website/Telegram/OLX.uz sources) but add a per-department
  role/sublabel pair and a per-department systems pair to the translation
  data (e.g., Sales → CRM + Knowledge base; Support → Knowledge base +
  Approvals-queue; HR → CRM + Knowledge base; Marketing → Knowledge base +
  Products).
- Add a **Calls** source card as a 4th source (alongside Website/Telegram/
  OLX.uz), matching worken's dedicated "CALLS" column — this maps directly
  to Arioo's own existing `/calls` feature (already built, per CLAUDE.md's
  competitor-parity table), so it's not a new concept, just a missing entry
  in this specific diagram.
- Animation mechanism (SVG paths, `animateMotion`, `prefers-reduced-motion`
  handling) stays exactly as Phase-A-adjacent work already built it — only
  the data driving which department/sources/systems are shown changes.

## Part 2: Pricing page — token-pricing table

**Current state:** `pricing-table.tsx` + `pricing-data.ts` show 5 flat
UZS-subscription tiers (Freemium/Business S/M/L/Enterprise) with a 2-bullet
feature list each — no per-model usage-based pricing exists anywhere on the
page.

**Change:** Add a new section below the existing 5-tier grid on
`/pricing`, titled to match worken's "Detailed pricing for every plan" /
token-cost framing, explaining that plan credits are consumed per token
(mirrors worken's own "billed per 1,000 tokens" framing) — new component
`src/components/marketing/token-pricing-table.tsx`, grouped by provider,
each row: model name, Prompt price / 1,000 tokens, Completion price / 1,000
tokens — **UZS primary, USD secondary** (per this project's existing pricing
convention). Static data file `src/lib/token-pricing-data.ts`, seeded from
the AI Gateway endpoint values below (USD per-token, converted to UZS per
1,000 tokens at the same fixed rate `pricing-data.ts` already uses for its
own UZS/USD display — reuse that existing constant rather than introducing
a second exchange rate).

Seed data (source: `https://ai-gateway.vercel.sh/v1/models`, fetched
2026-08-12; USD price per single token as returned by the endpoint):

```
Alibaba (Qwen):
  qwen-3-14b        in $0.00000012  out $0.00000024
  qwen-3-30b        in $0.00000012  out $0.0000005
  qwen-3-32b        in $0.00000016  out $0.00000064
  qwen-3-235b       in $0.00000022  out $0.00000088
  qwen-3.5-flash    in $0.0000001   out $0.0000004
  qwen-3.6-plus     in $0.0000005   out $0.000003
  qwen-3.8-max      in $0.000002    out $0.000006
  qwen-3.7-max      in $0.0000025   out $0.0000075

Amazon (Nova):
  nova-micro        in $0.000000035 out $0.00000014
  nova-lite         in $0.00000006  out $0.00000024
  nova-2-lite       in $0.0000003   out $0.0000025
  nova-pro          in $0.0000008   out $0.0000032

Anthropic (Claude):
  claude-3-haiku    in $0.00000025  out $0.00000125
  claude-haiku-4.5  in $0.000001    out $0.000005
  claude-sonnet-5   in $0.000002    out $0.00001
  claude-sonnet-4   in $0.000003    out $0.000015
  claude-opus-5     in $0.000005    out $0.000025
  claude-opus-4.5   in $0.000005    out $0.000025
  claude-opus-4     in $0.000015    out $0.000075

DeepSeek:
  deepseek-v4-flash in $0.0000002   out $0.0000004
  deepseek-v3       in $0.00000027  out $0.00000112
  deepseek-r1       in $0.00000135  out $0.0000054

Cohere:
  command-a         in $0.0000025   out $0.00001

Embedding models (no separate output price — matches worken's own "Free —
cost included in plan" framing is NOT used here since these ARE priced by
AI Gateway; show a single "Price / 1,000 tokens" column instead of
Prompt/Completion for this sub-table):
  alibaba/qwen3-embedding-0.6b   $0.00000001
  alibaba/qwen3-embedding-4b     $0.00000002
  alibaba/qwen3-embedding-8b     $0.00000005
  amazon/titan-embed-text-v2     $0.00000002
  cohere/embed-v4.0              $0.00000012
```

This is a **representative seed**, not an exhaustive copy of every model
the Gateway lists (it lists 30+ providers) — the implementation task should
present exactly these rows, grouped and ordered as above, with a small note
below the table ("more models available in your assistant's model
selector") since the full live list already exists inside the AI SDK
integration (`/assistants/:id` model dropdown, per the worken audit's
description of that page) — this table is marketing-page informational
content, not the actual runtime model catalog.

## Part 3: Footer — Telegram CTA

**Current state:** `footer.tsx` col 1 has the Arioo wordmark + tagline only,
no CTA button.

**Change:** Add a "Telegram orqali yozing" button below the tagline in
column 1. **Confirmed via grep: no public support/sales Telegram handle
exists anywhere in the codebase today** (the only Telegram integration is
the internal lead-notification bot, `TELEGRAM_BOT_TOKEN`/
`TELEGRAM_LEADS_CHAT_ID`, which posts *into* a private chat — not a public
contact link visitors can open). Render the button **disabled with a
tooltip** ("Tez orada" / "Coming soon", matching the exact convention this
codebase already uses for other not-yet-wired CTAs — e.g. the
`/integrations` "Connect" buttons and `/billing` "Hisobni to'ldirish"
button per CLAUDE.md) rather than linking to a placeholder or fake URL.

## Part 4: Mobile nav — dropdown panel instead of full drawer

**Current state:** `mobile-nav.tsx` uses a `Sheet` (full-height slide-in
drawer, shadcn/ui default side positioning).

**Change:** Reposition the mobile menu to render as a **dropdown-style
panel anchored top-left** below the hamburger button (worken's pattern: a
rounded-bottom-corner panel over a dimmed backdrop, not a full-height side
sheet) — check whether the existing `Sheet` primitive supports a
non-full-height "popover from trigger" configuration, or whether this needs
a `Popover`/`DropdownMenu` primitive swap instead. Content/order inside
stays the same (Pricing, Partners, dashboard/sign-in link, language +
theme toggles) — only the container's positioning/animation changes.

---

## Testing

- No new unit-testable logic (Parts 1, 3, 4 are presentational; Part 2's
  token-pricing data is static and rendered, not computed) — typecheck +
  lint + build is the verification bar, consistent with this codebase's
  existing precedent for presentational marketing components (no test
  covers `AgentFlowPanel` today either).
- `tests/e2e/marketing.spec.ts` already loads the homepage and asserts on
  the lead-form CTA scroll — must keep passing unchanged since no `id`s or
  copy it depends on are changing.
- Manual verification in the browser: cycle all 4 hero tabs, confirm the
  Calls source renders, scroll to the new token-pricing table and confirm
  UZS/USD formatting matches the existing tier cards' formatting, open the
  mobile menu and confirm the new dropdown-panel positioning, click the new
  footer Telegram button (or confirm its disabled/tooltip state if no real
  handle exists yet).

## Out of scope

- worken's desktop-app promo band (per user decision, this phase).
- Any change to the 5-tier UZS pricing structure itself (`pricing-data.ts`'s
  tiers, prices, and feature bullets are untouched — only a new section is
  added below them).
- Expanding the token-pricing table beyond the seed list above to the
  Gateway's full 30+-provider catalog — a mechanical follow-up, not a design
  question, that can be done in a later pass once this structure is in
  place.
