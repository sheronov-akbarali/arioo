import "server-only";
import { generateText } from "ai";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { aiAgents } from "@/db/schema/agents";

export type UzumReview = {
  id: string;
  rating: number; // 1 to 5
  customerName?: string;
  comment?: string;
  productTitle?: string;
  createdAt: string;
};

export type UzumQuestion = {
  id: string;
  customerName?: string;
  productTitle?: string;
  questionText: string;
  createdAt: string;
};

/**
 * Generate AI Response to an Uzum Market Review
 */
export async function generateUzumReviewReply(params: {
  review: UzumReview;
  agentId?: string;
  shopName?: string;
}): Promise<string> {
  let agentPrompt =
    "Siz Uzum Market do'koni uchun mas'ul mijozlarga xizmat ko'rsatish mutaxassisisiz. Xaridorlar sharhlariga o'zbek tilida (yoki sharh rus tilida bo'lsa rus tilida) muloyim, qisqa va professional javob bering.";

  let model = "openai/gpt-5.4";

  if (params.agentId) {
    const [agent] = await db
      .select()
      .from(aiAgents)
      .where(eq(aiAgents.id, params.agentId));
    if (agent) {
      agentPrompt = agent.systemPrompt;
      model = agent.model;
    }
  }

  const prompt = `Xaridor quyidagi sharh qoldirdi:
Xaridor ismi: ${params.review.customerName || "Xaridor"}
Baho: ${params.review.rating} / 5 yulduz
Mahsulot: ${params.review.productTitle || "Do'kon mahsuloti"}
Fikr: "${params.review.comment || "Baho qo'yildi"}"
Do'kon nomi: ${params.shopName || "Bizning do'kon"}

Qoidalar:
- Agar baho 4 yoki 5 yulduz bo'lsa: samimiy minnatdorchilik bildiring, do'kondan yana xarid qilishini taklif qiling.
- Agar baho 1, 2 yoki 3 yulduz bo'lsa: noqulaylik uchun uzr so'rang, do'kon support xizmatiga murojaat qilishni taklif qiling va muammoni hal qilishga tayyor ekanligingizni bildiring.
- Javob qisqa (2-3 jumla), xushmuomala bo'lsin.`;

  try {
    const { text } = await generateText({
      model,
      system: agentPrompt,
      prompt,
    });
    return text.trim();
  } catch (err) {
    console.error("Failed to generate Uzum review reply:", err);
    if (params.review.rating >= 4) {
      return "Xaridingiz va ijobiy bahoingiz uchun katta rahmat! Do'konimizda sizni yana kutib qolamiz.";
    }
    return "Fikringiz uchun rahmat. Yuzaga kelgan noqulaylik uchun uzr so'raymiz. Muammoni bartaraf etish uchun qo'llab-quvvatlash xizmatimizga murojaat qilishingizni so'raymiz.";
  }
}

/**
 * Generate AI Response to an Uzum Market Product Question
 */
export async function generateUzumQuestionReply(params: {
  question: UzumQuestion;
  agentId?: string;
  shopName?: string;
}): Promise<string> {
  let agentPrompt =
    "Siz Uzum Market do'konining professional sotuvchi-maslahatchisisiz. Tovar ostidagi savollarga aniq, to'g'ri va xushmuomala javob bering.";

  let model = "openai/gpt-5.4";

  if (params.agentId) {
    const [agent] = await db
      .select()
      .from(aiAgents)
      .where(eq(aiAgents.id, params.agentId));
    if (agent) {
      agentPrompt = agent.systemPrompt;
      model = agent.model;
    }
  }

  const prompt = `Xaridor mahsulot haqida quyidagi savolni berdi:
Xaridor: ${params.question.customerName || "Xaridor"}
Mahsulot: ${params.question.productTitle || "Tovar"}
Savol: "${params.question.questionText}"

Qoidalar:
- Savolga aniq, tushunarli va do'stona javob bering.
- Mahsulotni xarid qilishga undovchi ijobiy ohangda yakunlang.
- 2-4 jumladan oshmasin.`;

  try {
    const { text } = await generateText({
      model,
      system: agentPrompt,
      prompt,
    });
    return text.trim();
  } catch (err) {
    console.error("Failed to generate Uzum question reply:", err);
    return "Assalomu alaykum! Mahsulotimizga qiziqish bildirganingiz uchun rahmat. Savolingiz bo'yicha ma'lumotni do'konimiz sahifasida ko'rishingiz yoki buyurtma berishingiz mumkin.";
  }
}
