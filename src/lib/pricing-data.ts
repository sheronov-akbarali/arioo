export type PricingTier = {
  id: "freemium" | "businessS" | "businessM" | "businessL" | "enterprise";
  priceUZSMonthly: number | null;
  priceUZSAnnual: number | null;
  priceUSDApprox: number | null;
  isPopular: boolean;
  isCustom: boolean;
};

// MVP placeholder pricing — review with the project owner before real billing goes live.
export const PRICING_TIERS: PricingTier[] = [
  { id: "freemium", priceUZSMonthly: 0, priceUZSAnnual: 0, priceUSDApprox: 0, isPopular: false, isCustom: false },
  { id: "businessS", priceUZSMonthly: 190000, priceUZSAnnual: 1900000, priceUSDApprox: 150, isPopular: false, isCustom: false },
  { id: "businessM", priceUZSMonthly: 390000, priceUZSAnnual: 3900000, priceUSDApprox: 310, isPopular: true, isCustom: false },
  { id: "businessL", priceUZSMonthly: 990000, priceUZSAnnual: 9900000, priceUSDApprox: 790, isPopular: false, isCustom: false },
  { id: "enterprise", priceUZSMonthly: null, priceUZSAnnual: null, priceUSDApprox: null, isPopular: false, isCustom: true },
];

export function formatUZS(amount: number): string {
  return new Intl.NumberFormat("uz-UZ").format(amount) + " so'm";
}
