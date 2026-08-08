# Homepage structural parity with worken.ru

## Context

worken.ru's homepage (the site this product's concept is based on) has a section
order our homepage doesn't currently match: Hero → "how it works" → **pricing
table embedded on the page** → a name/phone lead-capture form ("Get a
consultation") → a desktop-app promo → footer.

Our homepage currently has only Hero + WorkZonesSection. Pricing lives on a
separate `/pricing` page. The lead-capture form (`src/lib/consultation/*`,
`LeadForm` component) was deleted in commit `7d7dfb3` after a request to
remove it — that request turns out to have meant only "don't link it from the
navbar," not "delete the feature." This spec restores it and brings the
homepage to structural (not yet visual) parity with worken.ru.

## Goal

Match worken.ru's homepage section composition and CTA behavior. Visual
differentiation (colors, typography, layout style distinct from worken.ru) is
an explicit **Phase 2**, out of scope here.

## Scope

In scope: the homepage (`src/app/[locale]/page.tsx`) only.

Out of scope, no changes:
- `/partners` page — keeps its current `/sign-up` CTA.
- `/(dashboard)/billing` page — its "Request invoice" button stays removed.
- `/pricing` page — stays as its own full page; homepage gets an embedded copy
  of the same `<PricingTable>` component, not a redirect.
- worken.ru's "Worken Drive" desktop-app promo section — skipped entirely;
  we have no desktop app and won't advertise one.

## Design

### 1. Restore the consultation/lead-form feature

Revert these specific files to their state just before commit `7d7dfb3`
(rather than a blanket `git revert`, since unrelated changes have landed on
top of that commit since):

- `src/lib/consultation/actions.ts`
- `src/lib/consultation/schema.ts` + `schema.test.ts`
- `src/lib/consultation/rate-limit.ts` + `rate-limit.test.ts`
- `src/lib/consultation/telegram.ts` + `telegram.test.ts`
- `src/components/marketing/lead-form.tsx`
- i18n: the `leadForm` block in `messages/{en,ru,uz}.json`
- `.env.example`: `TELEGRAM_BOT_TOKEN` / `TELEGRAM_LEADS_CHAT_ID` lines back
  (values already exist in Vercel project env vars and local `.env.local`
  from before the deletion — no new secrets need sourcing)

`partners.formTitle` / `partners.formSubtitle` i18n keys are **not** restored
— the partners page is out of scope and doesn't use `LeadForm`.

### 2. New homepage section order

```
Hero → WorkZonesSection → PricingTable (new) → LeadForm (restored) → Footer
```

`Footer` is already rendered by the locale layout, not the page itself, so no
change needed there — it naturally ends up last.

The homepage's new pricing block wraps the existing `<PricingTable />`
component (the same one `/pricing` renders) with a heading, matching the
`/pricing` page's own heading pattern:

```tsx
<section className="mx-auto max-w-6xl px-6 py-20">
  <div className="mx-auto max-w-2xl text-center">
    <h2>{t("pricing.title")}</h2>
    <p>{t("pricing.subtitle")}</p>
  </div>
  <div className="mt-12"><PricingTable /></div>
</section>
```

### 3. CTA routing changes

| Location | Text | Target |
|---|---|---|
| Header (navbar) CTA | "Bepul boshlash" / "Start for free" / "Начать бесплатно" | `/sign-up` — **unchanged** |
| Hero primary button | reverts to "Konsultatsiya olish" / "Get Consultation" / "Получить консультацию" | `/#lead-form` |
| `PricingTable` tier buttons ("Tanlash" / "Choose" / "Выбрать") | text unchanged | `/#lead-form` |

Only `hero.ctaPrimary` text reverts. `nav.cta` (header) keeps its current
"Start for free" text and `/sign-up` target — that split is the whole point
of the earlier clarification.

## Testing

- `npm run build` succeeds (build already tests that `LeadForm`'s server
  action imports resolve correctly).
- `npm test` — the restored `src/lib/consultation/*.test.ts` files pass.
- Manual check: homepage renders all five sections in order, in all three
  locales; hero and pricing CTAs scroll to the lead form; header CTA still
  goes to sign-up; form submission still posts to Telegram (reuses existing
  bot token, no new integration setup).
