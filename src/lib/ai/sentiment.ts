import "server-only";
import { generateObject } from "ai";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { conversations } from "@/db/schema/conversations";
import { crmContacts, crmDeals } from "@/db/schema/crm";
import { createNotification } from "@/lib/notifications/actions";
import { resolveModel } from "./gateway";

const classificationSchema = z.object({
  sentiment: z.enum(["positive", "neutral", "negative"]),
  readyToBuy: z.boolean().describe("Mijoz aniq xarid qilishga yoki buyurtma berishga tayyorligini bildirdimi"),
});

/**
 * Classifies the customer's latest message and reacts to it: persists
 * sentiment on the conversation, notifies the team on a negative signal, and
 * auto-creates a CRM lead when the customer signals purchase intent.
 * Best-effort — failures here must never break the main chat response.
 */
export async function classifyAndReactToTurn(params: {
  organizationId: string;
  agentId: string;
  conversationId: string;
  agentName: string;
  agentModel: string;
  userMessage: string;
  channel: string;
  externalChatId?: string | null;
}): Promise<void> {
  const { organizationId, agentId, conversationId, agentName, agentModel, userMessage, channel, externalChatId } = params;
  if (!userMessage.trim()) return;

  try {
    const { object } = await generateObject({
      model: resolveModel(agentModel),
      schema: classificationSchema,
      prompt: `Mijozning quyidagi xabarini tahlil qiling va kayfiyatini (sentiment) hamda xarid qilishga tayyorligini (readyToBuy) aniqlang.\n\nXabar: "${userMessage}"`,
    });

    await db.update(conversations).set({ sentiment: object.sentiment }).where(eq(conversations.id, conversationId));

    if (object.sentiment === "negative") {
      await createNotification(organizationId, {
        type: "chat",
        title: "😡 Norozi mijoz aniqlandi",
        body: `"${agentName}" agenti bilan suhbatda mijoz noroziligi AI tomonidan aniqlandi.`,
        link: `/uz/chats?conversation=${conversationId}`,
      });
    }

    if (object.readyToBuy) {
      const [existingDeal] = await db
        .select({ id: crmDeals.id })
        .from(crmDeals)
        .innerJoin(crmContacts, eq(crmDeals.contactId, crmContacts.id))
        .where(eq(crmContacts.notes, `auto:${conversationId}`))
        .limit(1);

      if (!existingDeal) {
        const [contact] = await db
          .insert(crmContacts)
          .values({
            organizationId,
            name: `${channel} mijozi ${externalChatId ? `(${externalChatId})` : ""}`.trim(),
            notes: `auto:${conversationId}`,
          })
          .returning();
        await db.insert(crmDeals).values({
          organizationId,
          contactId: contact.id,
          agentId,
          title: "AI aniqladi: xarid qilishga tayyor",
          status: "new",
        });
        await createNotification(organizationId, {
          type: "lead",
          title: "🎯 Yangi qiziqqan lid",
          body: `AI mijozning xarid qilishga tayyorligini aniqladi va CRM'ga avtomatik qo'shdi.`,
          link: `/uz/crm`,
        });
      }
    }
  } catch (error) {
    console.warn("Sentiment classification skipped:", error);
  }
}
