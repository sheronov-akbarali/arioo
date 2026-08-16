import "server-only";
import { gateway, type LanguageModel, type EmbeddingModel } from "ai";
import type { SharedV4ProviderOptions } from "@ai-sdk/provider";
import { google } from "@ai-sdk/google";

export type GatewayModel = {
  id: string;
  name: string;
  pricing?: { input: string; output: string };
};

const FALLBACK_MODELS: GatewayModel[] = [
  { id: "anthropic/claude-sonnet-4.5", name: "Claude Sonnet 4.5" },
  { id: "openai/gpt-5.4", name: "GPT-5.4" },
];

export const DEFAULT_MODEL = "anthropic/claude-sonnet-4.5";
export const EMBEDDING_MODEL = "openai/text-embedding-3-small";

// AI Gateway requires a card on file (even for its free monthly credits) — see
// https://vercel.com/docs/ai-gateway. Until that's added, fall back to Google's
// genuinely free (no card) Gemini API directly, bypassing the gateway entirely.
export const usingFreeGeminiFallback = Boolean(process.env.GOOGLE_GENERATIVE_AI_API_KEY);

/** Resolves a stored gateway model id (e.g. "anthropic/claude-sonnet-4.5") to
 * whatever model actually works right now — Gemini direct when no gateway
 * billing is configured, otherwise the gateway string as-is. */
export function resolveModel(_modelId: string): LanguageModel {
  if (usingFreeGeminiFallback) return google("gemini-2.5-flash");
  return _modelId;
}

export function resolveEmbeddingModel(): EmbeddingModel {
  if (usingFreeGeminiFallback) return google.textEmbeddingModel("gemini-embedding-001");
  return EMBEDDING_MODEL;
}

// The knowledge_chunk.embedding pgvector column is fixed at 1536 dimensions
// (matching text-embedding-3-small). gemini-embedding-001 supports truncating
// its output to any dimension via this provider option, so results stay
// compatible without a schema migration.
export function resolveEmbeddingProviderOptions(): SharedV4ProviderOptions | undefined {
  return usingFreeGeminiFallback ? { google: { outputDimensionality: 1536 } } : undefined;
}

export async function listAvailableModels(): Promise<GatewayModel[]> {
  try {
    const { models } = await gateway.getAvailableModels();
    return models.map((model) => ({
      id: model.id,
      name: model.name,
      pricing: model.pricing
        ? { input: model.pricing.input, output: model.pricing.output }
        : undefined,
    }));
  } catch (error) {
    console.error("Failed to fetch AI Gateway models, using fallback list", error);
    return FALLBACK_MODELS;
  }
}

export function estimateCostUsd(
  models: GatewayModel[],
  modelId: string,
  usage: { inputTokens?: number; outputTokens?: number },
): number | null {
  const model = models.find((candidate) => candidate.id === modelId);
  if (!model?.pricing) return null;
  const inputCost = (usage.inputTokens ?? 0) * Number(model.pricing.input);
  const outputCost = (usage.outputTokens ?? 0) * Number(model.pricing.output);
  return inputCost + outputCost;
}
