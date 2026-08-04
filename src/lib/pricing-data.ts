export type PricingTier = {
  id: "freemium" | "businessS" | "businessM" | "businessL" | "enterprise";
  priceUZSMonthly: number | null;
  priceUZSAnnual: number | null;
  priceUSDApprox: number | null;
  isPopular: boolean;
  isCustom: boolean;
};

// MVP placeholder pricing — review with the project owner before real billing goes live.
// Annual price = monthly * 8 (i.e. pay for 8 months, get 12) so it actually
// matches the "33% tejash / Экономия 33% / 33% savings" badge in messages/*.json
// (8/12 = 66.7% of monthly*12 => a genuine 33.3% discount, not an arbitrary round number).
export const PRICING_TIERS: PricingTier[] = [
  { id: "freemium", priceUZSMonthly: 0, priceUZSAnnual: 0, priceUSDApprox: 0, isPopular: false, isCustom: false },
  { id: "businessS", priceUZSMonthly: 190000, priceUZSAnnual: 1520000, priceUSDApprox: 120, isPopular: false, isCustom: false },
  { id: "businessM", priceUZSMonthly: 390000, priceUZSAnnual: 3120000, priceUSDApprox: 245, isPopular: true, isCustom: false },
  { id: "businessL", priceUZSMonthly: 990000, priceUZSAnnual: 7920000, priceUSDApprox: 625, isPopular: false, isCustom: false },
  { id: "enterprise", priceUZSMonthly: null, priceUZSAnnual: null, priceUSDApprox: null, isPopular: false, isCustom: true },
];

export function formatUZS(amount: number): string {
  return new Intl.NumberFormat("uz-UZ").format(amount) + " so'm";
}
