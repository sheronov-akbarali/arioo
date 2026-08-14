import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { channels } from "@/db/schema/channels";
import { conversations, messages } from "@/db/schema/conversations";
import { aiAgents } from "@/db/schema/agents";
import { generateText } from "ai";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ channelId: string }> }
) {
  try {
    const { channelId } = await params;
    const body = await req.json();

    const { chatId, message, advertisementId } = body;

    if (!chatId || !message) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    // 1. Kanalni topish
    const [channel] = await db
      .select()
      .from(channels)
      .where(eq(channels.id, channelId));

    if (!channel || !channel.isActive || channel.type !== "olx") {
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

    // 3. Suhbatni qidirish yoki yaratish
    let [conversation] = await db
      .select()
      .from(conversations)
      .where(eq(conversations.externalChatId, chatId.toString()));

    if (!conversation) {
      const [newConversation] = await db
        .insert(conversations)
        .values({
          agentId: agent.id,
          channel: "olx",
          channelId: channel.id,
          externalChatId: chatId.toString(),
          metadata: advertisementId ? JSON.stringify({ advertisementId }) : null,
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

    // 6. AI SDK orqali javob olish
    const { text: aiResponse } = await generateText({
      model: agent.model,
      system: agent.systemPrompt,
      messages: formattedHistory,
    });

    // 7. AI javobini bazaga yozish
    await db.insert(messages).values({
      conversationId: conversation.id,
      role: "assistant",
      content: aiResponse,
    });

    // 8. RPA bot uchun to'g'ridan-to'g'ri qaytarish
    return NextResponse.json({ response: aiResponse });
  } catch (error) {
    console.error("OLX webhook error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
