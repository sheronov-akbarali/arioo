import "server-only";
import { generateText, embed } from "ai";
import { eq, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { aiAgents } from "@/db/schema/agents";
import { messages as messagesTable } from "@/db/schema/conversations";
import { organizationCredits, creditTransactions } from "@/db/schema/billing";
import { abTests } from "@/db/schema/ab-tests";
import { retrieveRelevantChunks } from "./retrieval";
import { listAvailableModels, estimateCostUsd, EMBEDDING_MODEL } from "./gateway";

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

export async function executeAgentResponse(
  options: AgentExecutionOptions
): Promise<AgentExecutionResult> {
  const { agentId, conversationId, userMessage, history } = options;

  // 1. Fetch Agent & Org
  const [agent] = await db
    .select()
    .from(aiAgents)
    .where(eq(aiAgents.id, agentId));

  if (!agent) {
    throw new Error(`Agent not found: ${agentId}`);
  }

  // 2. Check active A/B test
  const [activeAbTest] = await db
    .select()
    .from(abTests)
    .where(eq(abTests.agentId, agentId));

  let systemPrompt = agent.systemPrompt;
  if (activeAbTest && activeAbTest.status === "running") {
    const randomPercent = Math.random() * 100;
    if (randomPercent < activeAbTest.trafficSplit) {
      systemPrompt = activeAbTest.variantAPrompt;
      await db
        .update(abTests)
        .set({ variantAConversations: sql`${abTests.variantAConversations} + 1` })
        .where(eq(abTests.id, activeAbTest.id));
    } else {
      systemPrompt = activeAbTest.variantBPrompt;
      await db
        .update(abTests)
        .set({ variantBConversations: sql`${abTests.variantBConversations} + 1` })
        .where(eq(abTests.id, activeAbTest.id));
    }
  }

  // 3. RAG Knowledge Base Retrieval
  let context = "";
  if (userMessage.trim()) {
    try {
      const { embedding } = await embed({
        model: EMBEDDING_MODEL,
        value: userMessage.trim(),
      });
      const chunks = await retrieveRelevantChunks(agentId, embedding, 4);
      if (chunks.length > 0) {
        context = `\n\nBilim bazasidan tegishli ma'lumotlar:\n${chunks.join("\n---\n")}`;
      }
    } catch (error) {
      console.warn("Knowledge base retrieval skipped or failed:", error);
    }
  }

  // 4. Generate AI response
  const fullSystemPrompt = systemPrompt + context;
  const { text: aiResponse, usage } = await generateText({
    model: agent.model,
    system: fullSystemPrompt,
    messages: history,
  });

  // 5. Cost & Usage Estimation
  let estimatedCost = 0;
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

  // 6. Save assistant message
  await db.insert(messagesTable).values({
    conversationId,
    role: "assistant",
    content: aiResponse,
    tokenCount: usage.totalTokens ?? null,
    estimatedCostUsd: estimatedCost,
  });

  // 7. Deduct from organization credits & log transaction (best effort)
  try {
    const costInCredits = Math.max(1, Math.round(estimatedCost * 13000)); // 1 USD approx 13000 UZS / 1 Credit
    await db
      .insert(organizationCredits)
      .values({
        organizationId: agent.organizationId,
        balance: -costInCredits,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: organizationCredits.organizationId,
        set: {
          balance: sql`${organizationCredits.balance} - ${costInCredits}`,
          updatedAt: new Date(),
        },
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

  return {
    text: aiResponse,
    tokenCount: usage.totalTokens,
    costUsd: estimatedCost,
  };
}
