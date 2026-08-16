import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { channels } from "@/db/schema/channels";
import { conversations, messages } from "@/db/schema/conversations";
import { aiAgents } from "@/db/schema/agents";
import { executeAgentResponse } from "@/lib/ai/agent-executor";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function POST(req: Request) {
  try {
    const { channelId, sessionId, message } = await req.json();

    if (!channelId || !sessionId || !message) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400, headers: corsHeaders });
    }

    // 1. Kanalni topish
    const [channel] = await db
      .select()
      .from(channels)
      .where(eq(channels.id, channelId));

    if (!channel || !channel.isActive || channel.type !== "widget") {
      return NextResponse.json({ error: "Channel not found or inactive" }, { status: 404, headers: corsHeaders });
    }

    // 2. Agentni topish
    const [agent] = await db
      .select()
      .from(aiAgents)
      .where(eq(aiAgents.id, channel.agentId));

    if (!agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404, headers: corsHeaders });
    }

    // 3. Suhbatni (conversation) qidirish yoki yaratish
    let [conversation] = await db
      .select()
      .from(conversations)
      .where(eq(conversations.externalChatId, sessionId));

    if (!conversation) {
      const [newConversation] = await db
        .insert(conversations)
        .values({
          agentId: agent.id,
          channel: "widget",
          channelId: channel.id,
          externalChatId: sessionId,
        })
        .returning();
      conversation = newConversation;
    }

    // 4. Foydalanuvchi xabarini bazaga yozish
    await db.insert(messages).values({
      conversationId: conversation.id,
      role: "user",
      content: message,
    });

    // 5. Oldingi xabarlarni olish (AI konteksti uchun)
    const history = await db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, conversation.id))
      .orderBy(messages.createdAt);

    const formattedHistory = history.map((m) => ({
      role: m.role as "user" | "assistant" | "system",
      content: m.content,
    }));

    // 6. Javob generatsiya qilish — RAG, tools, agent sozlamalari, sentiment
    // va A/B test bilan birga (assistant xabari executeAgentResponse ichida
    // saqlanadi, shu sababli bu yerda qayta insert qilinmaydi)
    const { text: aiResponse } = await executeAgentResponse({
      agentId: agent.id,
      conversationId: conversation.id,
      userMessage: message,
      history: formattedHistory,
    });

    return NextResponse.json({ response: aiResponse }, { headers: corsHeaders });
  } catch (error) {
    console.error("Widget webhook error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500, headers: corsHeaders });
  }
}
