import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { channels } from "@/db/schema/channels";
import { conversations, messages } from "@/db/schema/conversations";
import { aiAgents } from "@/db/schema/agents";
import { executeAgentResponse } from "@/lib/ai/agent-executor";
import { transcribeAudio, analyzeImageWithVision } from "@/lib/ai/multimodal";
import {
  cancelPendingFollowUps,
  scheduleFollowUpsForConversation,
} from "@/lib/follow-ups/scheduler";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ channelId: string }> }
) {
  try {
    const { channelId } = await params;
    const body = await req.json();

    if (!body.message) {
      return NextResponse.json({ ok: true });
    }

    const {
      chat: { id: chatId },
      message_id: messageId,
      text: incomingText,
      caption,
      voice,
      audio,
      photo,
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

    // Check for TMA (/app or /start)
    const rawText = (incomingText || caption || "").trim();
    if (rawText === "/app" || rawText.startsWith("/tma")) {
      const tmaUrl = process.env.NEXT_PUBLIC_APP_URL
        ? `${process.env.NEXT_PUBLIC_APP_URL}/uz/tma`
        : "https://arioo.uz/uz/tma";

      await fetch(`https://api.telegram.org/bot${channel.botToken}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: "🚀 **Arioo Mobil Boshqaruv Kabineti**\n\nQuyidagi tugmani bosib Telegram ichida boshqaruv panelini ochishingiz mumkin:",
          parse_mode: "Markdown",
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: "📱 Arioo Kabinetni Ochish",
                  web_app: { url: tmaUrl },
                },
              ],
            ],
          },
        }),
      });
      return NextResponse.json({ ok: true });
    }

    // 3. Process Multimodal content (Voice / Audio or Photo)
    let processedUserText = rawText;

    if (voice || audio) {
      const fileId = (voice || audio).file_id;
      try {
        const fileInfoRes = await fetch(
          `https://api.telegram.org/bot${channel.botToken}/getFile?file_id=${fileId}`
        );
        const fileInfo = await fileInfoRes.json();
        if (fileInfo.ok && fileInfo.result?.file_path) {
          const fileUrl = `https://api.telegram.org/file/bot${channel.botToken}/${fileInfo.result.file_path}`;
          const transcribed = await transcribeAudio({
            audioUrl: fileUrl,
            mimeType: voice ? "audio/ogg" : "audio/mpeg",
          });
          processedUserText = `[Ovozli xabar]: ${transcribed}`;
        }
      } catch (err) {
        console.error("Voice processing error:", err);
        processedUserText = "[Ovozli xabarni qabul qilishda xatolik]";
      }
    } else if (photo && Array.isArray(photo) && photo.length > 0) {
      const bestPhoto = photo[photo.length - 1];
      try {
        const fileInfoRes = await fetch(
          `https://api.telegram.org/bot${channel.botToken}/getFile?file_id=${bestPhoto.file_id}`
        );
        const fileInfo = await fileInfoRes.json();
        if (fileInfo.ok && fileInfo.result?.file_path) {
          const fileUrl = `https://api.telegram.org/file/bot${channel.botToken}/${fileInfo.result.file_path}`;
          const visionAnalysis = await analyzeImageWithVision({
            imageUrl: fileUrl,
            prompt: caption,
          });
          processedUserText = `[Tasvir tahlili]: ${visionAnalysis.description}`;
          if (caption) {
            processedUserText += `\n[Foydalanuvchi izohi]: ${caption}`;
          }
        }
      } catch (err) {
        console.error("Photo processing error:", err);
        processedUserText = "[Rasmni tahlil qilishda xatolik]";
      }
    }

    if (!processedUserText.trim()) {
      return NextResponse.json({ ok: true });
    }

    // 4. Suhbatni (conversation) qidirish yoki yaratish
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

    // Cancel pending follow-ups since user replied
    await cancelPendingFollowUps(conversation.id);

    // 5. Foydalanuvchi xabarini bazaga yozish
    await db.insert(messages).values({
      conversationId: conversation.id,
      role: "user",
      content: processedUserText,
      externalMessageId: messageId.toString(),
    });

    // 6. Oldingi xabarlarni olish (AI konteksti uchun)
    const history = await db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, conversation.id))
      .orderBy(messages.createdAt);

    const formattedHistory = history.map((m) => ({
      role: m.role as "user" | "assistant" | "system",
      content: m.content,
    }));

    // 7. AI javobini generatsiya qilish (RAG + Tools + A/B test)
    const { text: aiResponse } = await executeAgentResponse({
      agentId: agent.id,
      conversationId: conversation.id,
      userMessage: processedUserText,
      history: formattedHistory,
    });

    // 8. Telegram API orqali javobni yuborish
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
          parse_mode: "Markdown",
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

    // 9. Schedule automated follow-ups for customer re-engagement
    await scheduleFollowUpsForConversation({
      conversationId: conversation.id,
      organizationId: agent.organizationId,
      agentId: agent.id,
      channel: "telegram",
      externalChatId: chatId.toString(),
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Telegram webhook error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
