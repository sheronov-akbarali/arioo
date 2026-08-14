import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { channels } from "@/db/schema/channels";
import { conversations, messages } from "@/db/schema/conversations";
import { aiAgents } from "@/db/schema/agents";
import { executeAgentResponse } from "@/lib/ai/agent-executor";

// Meta Webhook Verification
export async function GET(
  req: Request,
  { params }: { params: Promise<{ channelId: string }> }
) {
  const { channelId } = await params;
  const url = new URL(req.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === channelId) {
    // Return challenge as text/plain
    return new NextResponse(challenge, { status: 200, headers: { "Content-Type": "text/plain" } });
  }
  
  return new NextResponse("Forbidden", { status: 403 });
}

// Meta Webhook Message Receiver
export async function POST(
  req: Request,
  { params }: { params: Promise<{ channelId: string }> }
) {
  try {
    const { channelId } = await params;
    const body = await req.json();

    // Faqat WhatsApp xabarlarini qayta ishlash
    if (body.object !== "whatsapp_business_account") {
      return NextResponse.json({ ok: true });
    }

    const entry = body.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;
    const message = value?.messages?.[0];

    // Xabar yo'q bo'lsa (masalan status update bo'lsa) o'tkazib yuboramiz
    if (!message || message.type !== "text") {
      return NextResponse.json({ ok: true });
    }

    const senderId = message.from; // Telefon raqam
    const text = message.text.body;
    const messageId = message.id;

    // 1. Kanalni topish
    const [channel] = await db
      .select()
      .from(channels)
      .where(eq(channels.id, channelId));

    if (!channel || !channel.isActive || channel.type !== "whatsapp" || !channel.botToken) {
      return NextResponse.json({ error: "Channel not found or inactive" }, { status: 404 });
    }

    const phoneNumberId = channel.botUsername; // Biz PhoneNumberId ni shu ustunga yozganmiz

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
      .where(eq(conversations.externalChatId, senderId));

    if (!conversation) {
      const [newConversation] = await db
        .insert(conversations)
        .values({
          agentId: agent.id,
          channel: "whatsapp",
          channelId: channel.id,
          externalChatId: senderId,
        })
        .returning();
      conversation = newConversation;
    }

    // 4. Foydalanuvchi xabarini bazaga yozish
    await db.insert(messages).values({
      conversationId: conversation.id,
      role: "user",
      content: text,
      externalMessageId: messageId,
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

    // 6. AI SDK orqali javob olish (RAG + A/B + Ledger)
    const { text: aiResponse } = await executeAgentResponse({
      agentId: agent.id,
      conversationId: conversation.id,
      userMessage: text,
      history: formattedHistory,
    });

    // 7. WhatsApp API orqali javob jo'natish
    const waRes = await fetch(
      `https://graph.facebook.com/v19.0/${phoneNumberId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${channel.botToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: senderId,
          type: "text",
          text: { body: aiResponse },
        }),
      }
    );

    const waData = await waRes.json();
    if (waData.messages?.[0]?.id) {
      await db
        .update(messages)
        .set({ externalMessageId: waData.messages[0].id })
        .where(eq(messages.conversationId, conversation.id));
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("WhatsApp webhook error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
