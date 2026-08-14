"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/db/client";
import { conversations, messages } from "@/db/schema/conversations";
import { notifications } from "@/db/schema/notifications";
import { requireOrganization } from "@/lib/auth/dal";
import { z } from "zod";

const startCallSchema = z.object({
  agentId: z.string().min(1),
  phone: z.string().min(5).max(30),
});

export async function startVoiceCallAction(
  locale: string,
  _prevState: unknown,
  formData: FormData
) {
  const { organization } = await requireOrganization(locale);
  const raw = {
    agentId: formData.get("agentId"),
    phone: formData.get("phone"),
  };

  const parsed = startCallSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: "Agent yoki telefon raqami noto'g'ri kiritildi" };
  }

  // Create conversation entry for call
  const [conv] = await db
    .insert(conversations)
    .values({
      agentId: parsed.data.agentId,
      channel: "widget",
      externalChatId: `call_${parsed.data.phone}_${Date.now()}`,
      metadata: JSON.stringify({ type: "voice_call", phone: parsed.data.phone }),
    })
    .returning();

  // Initial greeting
  await db.insert(messages).values({
    conversationId: conv.id,
    role: "assistant",
    content: "Assalomu alaykum! Arioo AI ovozli yordamchisi xizmatingizda. Sizga qanday yordam bera olaman?",
  });

  await db.insert(notifications).values({
    id: crypto.randomUUID(),
    organizationId: organization.id,
    type: "chat",
    title: `Ovozli qo'ng'iroq boshlandi: ${parsed.data.phone}`,
    body: `AI agent ovozli qo'ng'iroq orqali mijoz bilan bog'landi.`,
    link: `/${locale}/chats?conversation=${conv.id}`,
  });

  revalidatePath(`/${locale}/calls`);
  return { success: true, conversationId: conv.id };
}

export async function scheduleCallAction(
  locale: string,
  _prevState: unknown,
  formData: FormData
) {
  const { organization } = await requireOrganization(locale);
  const agentId = String(formData.get("agentId") ?? "");
  const phone = String(formData.get("phone") ?? "");
  const time = String(formData.get("scheduledTime") ?? "");

  if (!agentId || !phone || !time) {
    return { error: "Barcha maydonlarni to'ldiring" };
  }

  await db.insert(notifications).values({
    id: crypto.randomUUID(),
    organizationId: organization.id,
    type: "system",
    title: `Qo'ng'iroq rejalashtirildi: ${phone}`,
    body: `Vaqti: ${time}. AI agent belgilangan vaqtda avtomatik bog'lanadi.`,
  });

  revalidatePath(`/${locale}/calls`);
  return { success: true };
}
