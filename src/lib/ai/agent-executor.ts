import "server-only";
import { generateText, embed, tool } from "ai";
import { z } from "zod";
import { eq, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { aiAgents } from "@/db/schema/agents";
import { messages as messagesTable } from "@/db/schema/conversations";
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
import { createPaymentInvoice } from "@/lib/billing/in-chat-payments";

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

  // 4. Generate AI response with In-Chat Payment Tool
  const fullSystemPrompt =
    systemPrompt +
    context +
    `\n\nEslatma: Agar mijoz biror mahsulot yoki xizmatni xarid qilishga, buyurtma berishga yoki hisobni to'lashga rozi bo'lsa, 'createPaymentInvoice' funksiyasidan foydalanib to'lov havolasini generatsiya qiling va mijozga taqdim eting.`;

  const paymentTool = tool({
    description:
      "Mijoz mahsulot yoki xizmatni xarid qilishga rozi bo'lganda to'lov havolalarini (Click, Payme, Uzum) yaratish.",
    parameters: z.object({
      amountUzs: z.number().describe("To'lov summasi (so'mda)"),
      dealTitle: z.string().describe("Mahsulot yoki xizmat nomi"),
      customerName: z.string().optional().describe("Xaridor ismi"),
      customerPhone: z.string().optional().describe("Xaridor telefon raqami"),
    }) as any,
    execute: async (input: any) => {
      try {
        const invoice = await createPaymentInvoice({
          organizationId: agent.organizationId,
          agentId: agent.id,
          amountUzs: Number(input?.amountUzs || 0),
          dealTitle: String(input?.dealTitle || "Buyurtma"),
          contactName: input?.customerName,
          contactPhone: input?.customerPhone,
        });
        return invoice;
      } catch (err) {
        console.error("Failed to create in-chat payment invoice:", err);
        return { error: "To'lov havolasini yaratib bo'lmadi" };
      }
    },
  } as any);

  const { text: aiResponse, usage } = await generateText({
    model: resolveModel(agent.model),
    system: fullSystemPrompt,
    messages: history,
    tools: {
      createPaymentInvoice: paymentTool,
    },
  });

  // 5. Cost & Usage Estimation
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
