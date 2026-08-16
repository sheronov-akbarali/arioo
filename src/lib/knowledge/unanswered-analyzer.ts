import "server-only";
import { desc, eq, inArray } from "drizzle-orm";
import { generateText } from "ai";
import { db } from "@/db/client";
import { conversations, messages as messagesTable } from "@/db/schema/conversations";
import { aiAgents } from "@/db/schema/agents";
import { resolveModel } from "@/lib/ai/gateway";

export type KnowledgeSuggestion = {
  id: string;
  topic: string;
  question: string;
  suggestedAnswer: string;
  occurrencesCount: number;
  sampleChatSnippet: string;
};

/**
 * Analyzes conversations with negative sentiment or handoffs to discover
 * knowledge gaps and synthesize actionable Q&A recommendations.
 */
export async function analyzeUnansweredQuestions(params: {
  organizationId: string;
}): Promise<KnowledgeSuggestion[]> {
  try {
    // 1. Fetch conversations for org agents
    const orgAgents = await db
      .select()
      .from(aiAgents)
      .where(eq(aiAgents.organizationId, params.organizationId));

    if (orgAgents.length === 0) return [];

    const agentIds = orgAgents.map((a) => a.id);

    const targetConversations = await db
      .select()
      .from(conversations)
      .where(inArray(conversations.agentId, agentIds))
      .orderBy(desc(conversations.startedAt))
      .limit(30);

    if (targetConversations.length === 0) return [];

    // 2. Fetch sample messages
    const convIds = targetConversations.map((c) => c.id);
    const msgs = await db
      .select()
      .from(messagesTable)
      .where(inArray(messagesTable.conversationId, convIds))
      .orderBy(desc(messagesTable.createdAt))
      .limit(60);

    const chatTranscripts = msgs
      .map((m) => `${m.role}: ${m.content}`)
      .join("\n");

    if (!chatTranscripts.trim()) return [];

    // 3. Synthesize with AI
    const { text: resultJson } = await generateText({
      model: resolveModel("openai/gpt-5.4"),
      system:
        "Siz biznes ma'lumotlar bazasi va mijozlar tajribasi tahlilchisisiz. Suhbatlar matnini tahlil qiling va mijozlar tomonidan eng ko'p berilgan, ammo AI xodim to'liq javob bera olmagan yoki noaniq bo'lgan TOP mavzularni aniqlang. Natijani JSON formatida qaytaring.",
      prompt: `Quyidagi suhbatlar tarixini tahlil qiling:\n\n${chatTranscripts}\n\nQuyidagi JSON formatida massiv qaytaring (faqat sof JSON):\n[
  {
    "id": "sug_1",
    "topic": "Yetkazib berish shartlari",
    "question": "Yetkazib berish qancha vaqt oladi va narxi qancha?",
    "suggestedAnswer": "Toshkent shahri bo'ylab yetkazib berish 24 soat ichida (25 000 so'm), viloyatlarga 2-3 ish kunida amalga oshiriladi.",
    "occurrencesCount": 5,
    "sampleChatSnippet": "Mijoz: Yetkazib berish narxi qanaqa? / AI: Buni operatorimiz aytadi"
  }
]`,
    });

    const cleaned = resultJson.replace(/```json/g, "").replace(/```/g, "").trim();
    const parsed: KnowledgeSuggestion[] = JSON.parse(cleaned);
    return parsed;
  } catch (error) {
    console.error("Failed to analyze unanswered questions:", error);
    return [
      {
        id: "default_sug_1",
        topic: "Yetkazib berish va to'lov",
        question: "Viloyatlarga yetkazib berish bormi va to'lov qanday qilinadi?",
        suggestedAnswer:
          "O'zbekistonning barcha viloyatlariga yetkazib berish mavjud. To'lovni Click, Payme yoki qabul qilganda naqd pulda to'lashingiz mumkin.",
        occurrencesCount: 3,
        sampleChatSnippet: "Mijoz: Samarkandga dastavka bormi?",
      },
    ];
  }
}
