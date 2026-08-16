import "server-only";
import { generateText, embed, stepCountIs } from "ai";
import { eq, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { aiAgents } from "@/db/schema/agents";
import { conversations, messages as messagesTable } from "@/db/schema/conversations";
import { organizationCredits, creditTransactions } from "@/db/schema/billing";
import { abTests } from "@/db/schema/ab-tests";
import { retrieveRelevantChunks } from "./retrieval";
import {
  listAvailableModels,
  estimateCostUsd,
  resolveModel,
  resolveEmbeddingModel,
  resolveEmbeddingProviderOptions,
  usingFreeGeminiFallback,
} from "./gateway";
import { buildAgentTools } from "./tools";
import { classifyAndReactToTurn } from "./sentiment";
import { assignAbVariant, readConversationMetadata } from "./ab-testing";
import { findMatchingMessageTemplate } from "@/lib/message-templates/suggest";

export type AgentExecutionOptions = {
  agentId: string;
  conversationId: string;
  userMessage: string;
  externalMessageId?: string | null;
  history: Array<{ role: "user" | "assistant" | "system"; content: string }>;
};

export type AgentExecutionResult = {
  text: string;
  tokenCount?: number;
  costUsd?: number | null;
};

// Emoji-stripping regex — covers the common emoji Unicode blocks.
const EMOJI_REGEX =
  /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{1F1E6}-\u{1F1FF}\u{2190}-\u{21FF}\u{2B00}-\u{2BFF}️]/gu;

function stripEmojis(text: string): string {
  return text.replace(EMOJI_REGEX, "").replace(/ {2,}/g, " ").trim();
}

function stripMarkdown(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/`(.*?)`/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/\[(.*?)\]\((.*?)\)/g, "$1 ($2)");
}

export async function executeAgentResponse(
  options: AgentExecutionOptions
): Promise<AgentExecutionResult> {
  const { agentId, conversationId, userMessage, history } = options;

  const [agent] = await db.select().from(aiAgents).where(eq(aiAgents.id, agentId));
  if (!agent) throw new Error(`Agent not found: ${agentId}`);

  const [conversation] = await db.select().from(conversations).where(eq(conversations.id, conversationId));
  const metadata = readConversationMetadata(conversation?.metadata ?? null);

  // 1. Active A/B test — variant assignment is sticky per conversation.
  const [activeAbTest] = await db.select().from(abTests).where(eq(abTests.agentId, agentId));
  let systemPrompt = agent.systemPrompt;
  if (activeAbTest && activeAbTest.status === "running") {
    const variant = await assignAbVariant(conversationId, metadata, activeAbTest);
    systemPrompt = variant === "A" ? activeAbTest.variantAPrompt : activeAbTest.variantBPrompt;
  }

  // 2. RAG Knowledge Base Retrieval
  let context = "";
  if (userMessage.trim()) {
    try {
      const { embedding } = await embed({
        model: resolveEmbeddingModel(),
        value: userMessage.trim(),
        providerOptions: resolveEmbeddingProviderOptions(),
      });
      const chunks = await retrieveRelevantChunks(agentId, embedding, 4);
      if (chunks.length > 0) {
        context = `\n\nBilim bazasidan tegishli ma'lumotlar:\n${chunks.join("\n---\n")}`;
      }
    } catch (error) {
      console.warn("Knowledge base retrieval skipped or failed:", error);
    }
  }

  // 3. Matching canned message template, offered as a suggestion (not forced)
  const templateSuggestion = await findMatchingMessageTemplate(agent.organizationId, userMessage);
  const templateContext = templateSuggestion
    ? `\n\nMos keluvchi tayyor shablon (kerak bo'lsa asos sifatida foydalaning, so'zma-so'z takrorlamang):\n"${templateSuggestion.body}"`
    : "";

  // 4. Build the tool set (integration tools the org enabled + always-on safety tools)
  const { tools, handoffPromptNote } = await buildAgentTools(agent, conversationId);

  const fullSystemPrompt =
    systemPrompt +
    context +
    templateContext +
    handoffPromptNote +
    `\n\nEslatma: Agar mijoz biror mahsulot yoki xizmatni xarid qilishga, buyurtma berishga yoki hisobni to'lashga rozi bo'lsa va 'createPaymentInvoice' vositasi mavjud bo'lsa, undan foydalaning.`;

  // 5. Recent-history window & real generation settings from the agent editor
  const windowedHistory = history.slice(-Math.max(2, agent.recentMessagesCount));

  const { text: rawResponse, usage } = await generateText({
    model: resolveModel(agent.model),
    system: fullSystemPrompt,
    messages: windowedHistory,
    tools,
    stopWhen: stepCountIs(Math.max(1, agent.maxStepsWithTools)),
    temperature: agent.temperature ?? undefined,
    topP: agent.topP ?? undefined,
    maxOutputTokens: agent.maxTokens ?? undefined,
  });

  let aiResponse = rawResponse;
  if (agent.removeMarkdown) aiResponse = stripMarkdown(aiResponse);
  if (agent.removeEmojis) aiResponse = stripEmojis(aiResponse);

  // 6. Cost & Usage Estimation
  let estimatedCost = 0;
  if (!usingFreeGeminiFallback) {
    try {
      const models = await listAvailableModels();
      estimatedCost =
        estimateCostUsd(models, agent.model, {
          inputTokens: usage.inputTokens,
          outputTokens: usage.outputTokens,
        }) ?? 0.0002;
    } catch {
      estimatedCost = 0.0002;
    }
  }

  // 7. Save assistant message
  await db.insert(messagesTable).values({
    conversationId,
    role: "assistant",
    content: aiResponse,
    tokenCount: usage.totalTokens ?? null,
    estimatedCostUsd: estimatedCost,
  });

  // 8. Deduct from organization credits & log transaction (best effort)
  try {
    const costInCredits = Math.max(1, Math.round(estimatedCost * 13000)); // 1 USD approx 13000 UZS / 1 Credit
    await db
      .insert(organizationCredits)
      .values({ organizationId: agent.organizationId, balance: -costInCredits, updatedAt: new Date() })
      .onConflictDoUpdate({
        target: organizationCredits.organizationId,
        set: { balance: sql`${organizationCredits.balance} - ${costInCredits}`, updatedAt: new Date() },
      });

    await db.insert(creditTransactions).values({
      organizationId: agent.organizationId,
      type: "usage",
      amount: -costInCredits,
      description: `AI xabari (${agent.name} / ${agent.model})`,
    });
  } catch (err) {
    console.warn("Credit deduction notice:", err);
  }

  // 9. Sentiment classification + auto-lead/notification reaction (best effort)
  await classifyAndReactToTurn({
    organizationId: agent.organizationId,
    agentId: agent.id,
    conversationId,
    agentName: agent.name,
    agentModel: agent.model,
    userMessage,
    channel: conversation?.channel ?? "playground",
    externalChatId: conversation?.externalChatId,
  });

  return { text: aiResponse, tokenCount: usage.totalTokens, costUsd: estimatedCost };
}
