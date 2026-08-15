import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { channels } from "@/db/schema/channels";
import { conversations, messages } from "@/db/schema/conversations";
import { aiAgents } from "@/db/schema/agents";
import { executeAgentResponse } from "@/lib/ai/agent-executor";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ channelId: string }> }
) {
  try {
    const { channelId } = await params;
    const body = await req.json();

    // Faqat xabarlarni qabul qilamiz
    if (!body.message || !body.message.text) {
      return NextResponse.json({ ok: true });
    }

    const {
      chat: { id: chatId },
      text,
      message_id: messageId,
    } = body.message;

    // 1. Kanalni topish
    const [channel] = await db
      .select()
      .from(channels)
      .where(eq(channels.id, channelId));

    if (!channel || !channel.isActive || !channel.botToken) {
      return NextResponse.json({ error: "Channel not found or inactive" }, { status: 404 });
    }

    // 2. Agentni topish
    const [agent] = await db
      .select()
      .from(aiAgents)
      .where(eq(aiAgents.id, channel.agentId));

    if (!agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    // 3. Suhbatni (conversation) qidirish yoki yaratish
    let [conversation] = await db
      .select()
      .from(conversations)
      .where(eq(conversations.externalChatId, chatId.toString()));

    if (!conversation) {
      const [newConversation] = await db
        .insert(conversations)
        .values({
          agentId: agent.id,
          channel: "telegram",
          channelId: channel.id,
          externalChatId: chatId.toString(),
        })
        .returning();
      conversation = newConversation;
    }

    // 4. Foydalanuvchi xabarini bazaga yozish
    await db.insert(messages).values({
      conversationId: conversation.id,
      role: "user",
      content: text,
      externalMessageId: messageId.toString(),
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

    // 6. AI javobini generatsiya qilish (RAG + A/B test + Ledger orqali)
    const { text: aiResponse } = await executeAgentResponse({
      agentId: agent.id,
      conversationId: conversation.id,
      userMessage: text,
      history: formattedHistory,
    });

    // 7. Telegram API orqali javobni yuborish
    const telegramRes = await fetch(
      `https://api.telegram.org/bot${channel.botToken}/sendMessage`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          chat_id: chatId,
          text: aiResponse,
        }),
      }
    );

    const telegramData = await telegramRes.json();
    if (telegramData.ok && telegramData.result?.message_id) {
      await db
        .update(messages)
        .set({ externalMessageId: telegramData.result.message_id.toString() })
        .where(eq(messages.conversationId, conversation.id));
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Telegram webhook error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
