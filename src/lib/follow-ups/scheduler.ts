import "server-only";
import { and, eq, lte } from "drizzle-orm";
import { generateText } from "ai";
import { db } from "@/db/client";
import { followUpSchedules } from "@/db/schema/follow-ups";
import { channels } from "@/db/schema/channels";
import { aiAgents } from "@/db/schema/agents";
import { messages as messagesTable } from "@/db/schema/conversations";
import { resolveModel } from "@/lib/ai/gateway";

/**
 * Schedule automated 2h and 24h follow-ups when assistant responds to a user
 */
export async function scheduleFollowUpsForConversation(params: {
  conversationId: string;
  organizationId: string;
  agentId?: string | null;
  channel: "telegram" | "whatsapp";
  externalChatId: string;
}): Promise<void> {
  try {
    const now = Date.now();
    const twoHoursLater = new Date(now + 2 * 60 * 60 * 1000);
    const twentyFourHoursLater = new Date(now + 24 * 60 * 60 * 1000);

    // Cancel existing pending follow-ups first
    await db
      .update(followUpSchedules)
      .set({ status: "cancelled" })
      .where(
        and(
          eq(followUpSchedules.conversationId, params.conversationId),
          eq(followUpSchedules.status, "pending")
        )
      );

    // Insert new 2h and 24h schedules
    await db.insert(followUpSchedules).values([
      {
        organizationId: params.organizationId,
        conversationId: params.conversationId,
        agentId: params.agentId || null,
        channel: params.channel,
        externalChatId: params.externalChatId,
        triggerHours: 2,
        scheduledFor: twoHoursLater,
        status: "pending",
      },
      {
        organizationId: params.organizationId,
        conversationId: params.conversationId,
        agentId: params.agentId || null,
        channel: params.channel,
        externalChatId: params.externalChatId,
        triggerHours: 24,
        scheduledFor: twentyFourHoursLater,
        status: "pending",
      },
    ]);
  } catch (error) {
    console.error("Failed to schedule follow-ups:", error);
  }
}

/**
 * Cancel pending follow-ups when user writes back
 */
export async function cancelPendingFollowUps(conversationId: string): Promise<void> {
  try {
    await db
      .update(followUpSchedules)
      .set({ status: "cancelled" })
      .where(
        and(
          eq(followUpSchedules.conversationId, conversationId),
          eq(followUpSchedules.status, "pending")
        )
      );
  } catch (error) {
    console.error("Failed to cancel follow-ups:", error);
  }
}

/**
 * Process due follow-ups (Invoked by cron worker)
 */
export async function processDueFollowUps(): Promise<{ processedCount: number; errorsCount: number }> {
  let processedCount = 0;
  let errorsCount = 0;

  try {
    const dueItems = await db
      .select()
      .from(followUpSchedules)
      .where(
        and(
          eq(followUpSchedules.status, "pending"),
          lte(followUpSchedules.scheduledFor, new Date())
        )
      )
      .limit(20);

    for (const item of dueItems) {
      try {
        // 1. Get recent messages in conversation
        const recentMessages = await db
          .select()
          .from(messagesTable)
          .where(eq(messagesTable.conversationId, item.conversationId))
          .orderBy(messagesTable.createdAt)
          .limit(8);

        // If last message was from user, skip follow-up and cancel
        const lastMsg = recentMessages[recentMessages.length - 1];
        if (lastMsg && lastMsg.role === "user") {
          await db
            .update(followUpSchedules)
            .set({ status: "cancelled" })
            .where(eq(followUpSchedules.id, item.id));
          continue;
        }

        // 2. Generate Follow-up Text with AI
        let agentModel = "openai/gpt-5.4";
        let agentPrompt =
          "Siz professional mijozlarga xizmat ko'rsatish mutaxassisisiz. Suhbatda javob bermay to'xtab qolgan mijozga muloyim, qisqa (1-2 jumla) eslatma yuboring.";

        if (item.agentId) {
          const [agent] = await db
            .select()
            .from(aiAgents)
            .where(eq(aiAgents.id, item.agentId));
          if (agent) {
            agentModel = agent.model;
            agentPrompt = agent.systemPrompt;
          }
        }

        const promptInstruction =
          item.triggerHours === 2
            ? "Mijoz oxirgi xabaringizga 2 soatdan beri javob bermadi. Unga mahsulot/xizmat bo'yicha savollari qoldimi yoki yordam kerakmi deb juda muloyim qisqa xabar yozing."
            : "Mijozga 24 soat o'tdi. Unga maxsus taklif yoki buyurtmani rasmiylashtirishda yordam berishni taklif qiluvchi do'stona xabar yozing.";

        const { text: followUpMessage } = await generateText({
          model: resolveModel(agentModel),
          system: agentPrompt,
          messages: [
            ...recentMessages.map((m) => ({
              role: m.role as "user" | "assistant",
              content: m.content,
            })),
            { role: "user", content: `[Tizim]: ${promptInstruction}` },
          ],
        });

        // 3. Send message via Telegram or WhatsApp
        if (item.channel === "telegram") {
          const [channel] = await db
            .select()
            .from(channels)
            .where(
              and(
                eq(channels.organizationId, item.organizationId),
                eq(channels.type, "telegram"),
                eq(channels.isActive, true)
              )
            )
            .limit(1);

          if (channel?.botToken) {
            await fetch(`https://api.telegram.org/bot${channel.botToken}/sendMessage`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                chat_id: item.externalChatId,
                text: followUpMessage,
                parse_mode: "Markdown",
              }),
            });
          }
        }

        // 4. Save to conversation messages
        await db.insert(messagesTable).values({
          conversationId: item.conversationId,
          role: "assistant",
          content: followUpMessage,
        });

        // 5. Mark as sent
        await db
          .update(followUpSchedules)
          .set({ status: "sent", sentAt: new Date() })
          .where(eq(followUpSchedules.id, item.id));

        processedCount++;
      } catch (err) {
        console.error(`Error processing follow-up ID ${item.id}:`, err);
        await db
          .update(followUpSchedules)
          .set({ status: "failed" })
          .where(eq(followUpSchedules.id, item.id));
        errorsCount++;
      }
    }
  } catch (error) {
    console.error("Failed to process due follow-ups:", error);
  }

  return { processedCount, errorsCount };
}
