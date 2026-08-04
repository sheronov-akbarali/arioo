export type PricingTier = {
  id: "freemium" | "businessS" | "businessM" | "businessL" | "enterprise";
  priceUZSMonthly: number | null;
  priceUZSAnnual: number | null;
  isPopular: boolean;
  isCustom: boolean;
};

// MVP placeholder pricing — review with the project owner before real billing goes live.
// Annual price = monthly * 8 (i.e. pay for 8 months, get 12) so it actually
// matches the "33% tejash / Экономия 33% / 33% savings" badge in messages/*.json
// (8/12 = 66.7% of monthly*12 => a genuine 33.3% discount, not an arbitrary round number).
export const PRICING_TIERS: PricingTier[] = [
  { id: "freemium", priceUZSMonthly: 0, priceUZSAnnual: 0, isPopular: false, isCustom: false },
  { id: "businessS", priceUZSMonthly: 190000, priceUZSAnnual: 1520000, isPopular: false, isCustom: false },
  { id: "businessM", priceUZSMonthly: 390000, priceUZSAnnual: 3120000, isPopular: true, isCustom: false },
  { id: "businessL", priceUZSMonthly: 990000, priceUZSAnnual: 7920000, isPopular: false, isCustom: false },
  { id: "enterprise", priceUZSMonthly: null, priceUZSAnnual: null, isPopular: false, isCustom: true },
];

// Approximate, rounded reference rate for the secondary USD display only —
// not a live FX rate. Revisit before real billing goes live.
const UZS_PER_USD = 12700;

// `currency` is the already-translated currency label (messages `pricing.currency`).
// This module is a pure data/formatting helper with no access to next-intl, so
// the caller passes the localized label in.
export function formatUZS(amount: number, currency: string): string {
  // `Intl.NumberFormat("uz-UZ")` renders a different grouping separator on
  // the server (Node's ICU) than in the browser (Chromium's ICU), causing a
  // React hydration mismatch. "en-US" grouping is stable across every JS
  // engine, so we format with that and swap in the space Uzbek convention
  // actually uses for thousands separators.
  return `${amount.toLocaleString("en-US").replace(/,/g, " ")} ${currency}`;
}

// Derives the secondary USD figure from whichever UZS price is currently
// displayed (monthly or annual), so it always matches the period shown
// instead of being pinned to one fixed value.
export function formatUSDApprox(uzsAmount: number): string {
  return `≈ $${Math.round(uzsAmount / UZS_PER_USD)}`;
}
