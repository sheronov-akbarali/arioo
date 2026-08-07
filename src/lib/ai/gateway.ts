import "server-only";
import { gateway } from "ai";

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
