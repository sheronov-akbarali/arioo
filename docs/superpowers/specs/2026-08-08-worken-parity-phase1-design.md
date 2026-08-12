# worken.ru Parity — Phase 1 (Partners Lead-Form + Pricing Icons) — Design

**Goal:** Close two concrete, low-risk gaps found by a live walkthrough of
worken.ru's public pages against ours: (1) our `/partners` page ends in a
plain "sign up" button where worken.ru has a working inline application
form, and (2) our pricing tier cards lack the small per-tier icon worken.ru
shows. Both are achievable with existing infrastructure — no new backend,
no new dependency.

**Context:** Full comparison was done live in Chrome across worken.ru's
homepage, `/pricing` (called `/price-main` there), `/partners`, and footer.
Most of our marketing site already matches worken.ru's structure closely
(5-tier pricing cards with monthly/annual toggle, partner stats/steps/why/
levels sections, a footer with matching menu/legal link groups and a
"systems operational" status dot). worken.ru's per-token AI-model pricing
table and its "Worken Drive" desktop app are explicitly **out of scope** —
the former requires metered AI-Gateway billing infrastructure we don't have
yet (a future phase, tracked in `CLAUDE.md`'s roadmap), the latter is an
entirely separate product not in our roadmap at all. Full dashboard-wide
visual polish (worken.ru's authenticated panel, already deep-audited in
`CLAUDE.md`'s comparison table) is Phase 2, tracked separately — this spec
covers only the two public-page gaps below.

---

## Part 1: Partners page — embedded application form

**Current state:** `src/app/[locale]/(marketing)/partners/page.tsx` ends
with `<PartnerLevels/>` and its only call-to-action is the hero's "sign up"
button (`page.tsx:22-27`, links to `/sign-up`) — there's no way to submit a
partner inquiry without going through full account signup.

**worken.ru's pattern:** a "Become a partner in AI employee hiring" section
near the page bottom with a real form (Full name / Phone / Telegram
optional / Business area) that submits an inquiry — no account required.

**Our fix:** reuse `src/components/marketing/lead-form.tsx` (`LeadForm`),
the same component already embedded on the homepage for consultation
requests. It already accepts `title`/`subtitle`/`submitLabel` props, already
collects name + phone, and already submits through the existing
`submitConsultationAction` → Telegram pipeline (`src/lib/consultation/
actions.ts`, `telegram.ts`) — the exact infrastructure worken.ru's own form
implies (a lead notification channel), already working in this codebase.
No schema change: the existing name+phone fields are sufficient for a
partner inquiry (worken.ru's extra "business area" field is a nice-to-have,
not required — adding a new field would mean touching the Zod schema, the
Telegram message formatter, and their tests, which is disproportionate to
what this gap needs).

Add `<LeadForm title={...} subtitle={...} submitLabel={...} />` to the
bottom of `PartnersPage`, after `<PartnerLevels/>`, with partner-specific
copy (new i18n keys under a `partners.leadForm.*` namespace in all three
`messages/*.json` files — do not reuse the homepage's `leadForm.title`
key, since "Konsultatsiya oling" doesn't fit a partner-application context).
`LeadForm` already renders its own `<section id="lead-form">` wrapper, so
no extra markup is needed around it — but since it reuses the DOM id
`lead-form`, and the homepage also has one, this is fine because they're
never rendered on the same page (`id` uniqueness is per-page, not
site-wide).

## Part 2: Pricing tier cards — per-tier icon

**Current state:** `src/components/marketing/pricing-table.tsx` renders
each `PRICING_TIERS` entry as a `Card` with a title/description/price/CTA
— no icon (`pricing-table.tsx:35-43`).

**worken.ru's pattern:** each tier card has a small icon left of or above
the tier name (sparkle for Freemium, sparkle for Business S, a gem for
Business M, a bolt/lightning for Business L, a crown for Enterprise).

**Our fix:** add a `PRICING_TIER_ICONS` lookup keyed by `PricingTier["id"]`
in `pricing-table.tsx` using `lucide-react` icons already used elsewhere in
this codebase's marketing components (`Sparkles`, `Gem`, `Zap`, `Crown`),
rendered in a small icon chip (reuse the same visual treatment as
`agent-flow-panel.tsx`'s node icon chip: `flex size-8 items-center
justify-center rounded-lg bg-muted text-muted-foreground`, or `bg-brand
text-brand-foreground` for the `isPopular` tier) placed inside `CardHeader`
above the `CardTitle`. No new dependency — `lucide-react` is already
installed and these specific icons exist in it (verify import at
implementation time; if a name doesn't exist in the installed version,
implementer picks the closest available icon of the same visual family and
notes the substitution).

---

## Out of scope (tracked for later, not this spec)

- worken.ru's per-AI-model token pricing table — requires metered AI
  Gateway billing (future phase).
- "Worken Drive" desktop app — not in our roadmap at all.
- Dashboard-wide visual polish across all already-built authenticated pages
  — a much larger effort (15+ pages), tracked as Phase 2, separate spec.
- A "Contact us" footer link/button — worken.ru's points at a public
  Telegram handle; we don't have one on file, and fabricating a Telegram
  URL is not acceptable. Add later once the actual handle is provided.
- worken.ru's Sales/HR/Marketing tab-switching on the hero diagram — our
  hero was already redone (dashboard-shell-and-hero-animation branch); the
  4-way role split is already covered by the separate work-zones section
  below the hero, so adding tabs to the hero diagram itself would duplicate
  that, not fill a gap.
