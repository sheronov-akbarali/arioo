import { UZS_PER_USD } from "./pricing-data";

export type TokenPriceModel = {
  id: string;
  name: string;
  // USD price per single token, as returned by the AI Gateway pricing
  // endpoint (https://ai-gateway.vercel.sh/v1/models, fetched 2026-08-12).
  inputPerToken: number;
  outputPerToken: number;
};

export type TokenPriceProvider = {
  key: string;
  name: string;
  models: TokenPriceModel[];
};

// Source: https://ai-gateway.vercel.sh/v1/models (fetched 2026-08-12).
// A representative seed across 5 providers, not the endpoint's full
// 30+-provider catalog — see the design spec's "Token-pricing table
// sourcing decision" for why these specific numbers were chosen over
// worken.ru's own (unrelated) markup.
export const TOKEN_PRICING_PROVIDERS: TokenPriceProvider[] = [
  {
    key: "alibaba",
    name: "Alibaba (Qwen)",
    models: [
      { id: "qwen-3-14b", name: "Qwen3-14B", inputPerToken: 0.00000012, outputPerToken: 0.00000024 },
      { id: "qwen-3-30b", name: "Qwen3-30B-A3B", inputPerToken: 0.00000012, outputPerToken: 0.0000005 },
      { id: "qwen-3-32b", name: "Qwen 3 32B", inputPerToken: 0.00000016, outputPerToken: 0.00000064 },
      { id: "qwen-3-235b", name: "Qwen3 235B A22B", inputPerToken: 0.00000022, outputPerToken: 0.00000088 },
      { id: "qwen-3.5-flash", name: "Qwen 3.5 Flash", inputPerToken: 0.0000001, outputPerToken: 0.0000004 },
      { id: "qwen-3.6-plus", name: "Qwen 3.6 Plus", inputPerToken: 0.0000005, outputPerToken: 0.000003 },
      { id: "qwen-3.8-max", name: "Qwen 3.8 Max", inputPerToken: 0.000002, outputPerToken: 0.000006 },
      { id: "qwen-3.7-max", name: "Qwen 3.7 Max", inputPerToken: 0.0000025, outputPerToken: 0.0000075 },
    ],
  },
  {
    key: "amazon",
    name: "Amazon (Nova)",
    models: [
      { id: "nova-micro", name: "Nova Micro", inputPerToken: 0.000000035, outputPerToken: 0.00000014 },
      { id: "nova-lite", name: "Nova Lite", inputPerToken: 0.00000006, outputPerToken: 0.00000024 },
      { id: "nova-2-lite", name: "Nova 2 Lite", inputPerToken: 0.0000003, outputPerToken: 0.0000025 },
      { id: "nova-pro", name: "Nova Pro", inputPerToken: 0.0000008, outputPerToken: 0.0000032 },
    ],
  },
  {
    key: "anthropic",
    name: "Anthropic (Claude)",
    models: [
      { id: "claude-3-haiku", name: "Claude 3 Haiku", inputPerToken: 0.00000025, outputPerToken: 0.00000125 },
      { id: "claude-haiku-4.5", name: "Claude Haiku 4.5", inputPerToken: 0.000001, outputPerToken: 0.000005 },
      { id: "claude-sonnet-5", name: "Claude Sonnet 5", inputPerToken: 0.000002, outputPerToken: 0.00001 },
      { id: "claude-sonnet-4", name: "Claude Sonnet 4", inputPerToken: 0.000003, outputPerToken: 0.000015 },
      { id: "claude-opus-5", name: "Claude Opus 5", inputPerToken: 0.000005, outputPerToken: 0.000025 },
      { id: "claude-opus-4.5", name: "Claude Opus 4.5", inputPerToken: 0.000005, outputPerToken: 0.000025 },
      { id: "claude-opus-4", name: "Claude Opus 4", inputPerToken: 0.000015, outputPerToken: 0.000075 },
    ],
  },
  {
    key: "deepseek",
    name: "DeepSeek",
    models: [
      { id: "deepseek-v4-flash", name: "DeepSeek V4 Flash", inputPerToken: 0.0000002, outputPerToken: 0.0000004 },
      { id: "deepseek-v3", name: "DeepSeek V3 0324", inputPerToken: 0.00000027, outputPerToken: 0.00000112 },
      { id: "deepseek-r1", name: "DeepSeek-R1", inputPerToken: 0.00000135, outputPerToken: 0.0000054 },
    ],
  },
  {
    key: "cohere",
    name: "Cohere",
    models: [
      { id: "command-a", name: "Command A", inputPerToken: 0.0000025, outputPerToken: 0.00001 },
    ],
  },
];

export type EmbeddingPriceModel = {
  id: string;
  name: string;
  pricePerToken: number;
};

export const TOKEN_PRICING_EMBEDDINGS: EmbeddingPriceModel[] = [
  { id: "qwen3-embedding-0.6b", name: "Qwen3 Embedding 0.6B", pricePerToken: 0.00000001 },
  { id: "qwen3-embedding-4b", name: "Qwen3 Embedding 4B", pricePerToken: 0.00000002 },
  { id: "qwen3-embedding-8b", name: "Qwen3 Embedding 8B", pricePerToken: 0.00000005 },
  { id: "titan-embed-text-v2", name: "Titan Text Embeddings V2", pricePerToken: 0.00000002 },
  { id: "embed-v4.0", name: "Embed v4.0", pricePerToken: 0.00000012 },
];

// Both formatters take a USD-per-single-token rate and return the price for
// 1,000 tokens, matching this table's column headers (`promptColumn` /
// `completionColumn` / `priceColumn` all say "/ 1,000 tokens").
export function formatUzsPer1k(usdPerToken: number): string {
  const uzs = usdPerToken * 1000 * UZS_PER_USD;
  return uzs.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).replace(/,/g, " ");
}

export function formatUsdPer1k(usdPerToken: number): string {
  const usd = usdPerToken * 1000;
  return `$${usd.toFixed(6)}`;
}
