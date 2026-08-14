"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { channels } from "@/db/schema/channels";
import { requireOrganization } from "@/lib/auth/dal";

export async function connectTelegramBotAction(
  prevState: { success: boolean; error?: string },
  formData: FormData
) {
  try {
    const { organization } = await requireOrganization("uz");
    const agentId = formData.get("agentId") as string;
    const botToken = formData.get("botToken") as string;

    if (!agentId || !botToken) {
      return { success: false, error: "Barcha maydonlarni to'ldiring" };
    }

    // Tekshiramiz: Telegram API dan getMe qilib ko'ramiz
    const response = await fetch(`https://api.telegram.org/bot${botToken}/getMe`);
    const data = await response.json();

    if (!data.ok) {
      return { success: false, error: "Xato token! Bot topilmadi." };
    }

    const botUsername = data.result.username;

    // TODO: Webhook o'rnatish
    // const WEBHOOK_URL = `https://<sizning-domen.uz>/api/webhooks/telegram`;
    // await fetch(`https://api.telegram.org/bot${botToken}/setWebhook?url=${WEBHOOK_URL}`);

    // Bazaga yozamiz
    await db.insert(channels).values({
      organizationId: organization.id,
      agentId,
      type: "telegram",
      botToken,
      botUsername,
      isActive: true,
    });

    revalidatePath("/integrations");
    return { success: true };
  } catch (error) {
    console.error("Telegram bot ulashda xato:", error);
    return { success: false, error: "Kutilmagan xatolik yuz berdi" };
  }
}

export async function createWidgetChannelAction(
  prevState: { success: boolean; error?: string; channelId?: string },
  formData: FormData
) {
  try {
    const { organization } = await requireOrganization("uz");
    const agentId = formData.get("agentId") as string;

    if (!agentId) {
      return { success: false, error: "Agentni tanlang" };
    }

    const [channel] = await db
      .insert(channels)
      .values({
        organizationId: organization.id,
        agentId,
        type: "widget",
        isActive: true,
      })
      .returning();

    revalidatePath("/integrations");
    return { success: true, channelId: channel.id };
  } catch (error) {
    console.error("Vidjet yaratishda xato:", error);
    return { success: false, error: "Kutilmagan xatolik yuz berdi" };
  }
}

export async function connectWhatsappAction(
  prevState: { success: boolean; error?: string; channelId?: string },
  formData: FormData
) {
  try {
    const { organization } = await requireOrganization("uz");
    const agentId = formData.get("agentId") as string;
    const accessToken = formData.get("accessToken") as string;
    const phoneNumberId = formData.get("phoneNumberId") as string;

    if (!agentId || !accessToken || !phoneNumberId) {
      return { success: false, error: "Barcha maydonlarni to'ldiring" };
    }

    const [channel] = await db
      .insert(channels)
      .values({
        organizationId: organization.id,
        agentId,
        type: "whatsapp",
        botToken: accessToken,
        botUsername: phoneNumberId, // biz qulaylik uchun shu erga yozamiz
        isActive: true,
      })
      .returning();

    revalidatePath("/integrations");
    return { success: true, channelId: channel.id };
  } catch (error) {
    console.error("WhatsApp ulashda xato:", error);
    return { success: false, error: "Kutilmagan xatolik yuz berdi" };
  }
}

export async function connectOlxAction(
  prevState: { success: boolean; error?: string; channelId?: string },
  formData: FormData
) {
  try {
    const { organization } = await requireOrganization("uz");
    const agentId = formData.get("agentId") as string;

    if (!agentId) {
      return { success: false, error: "Agentni tanlang" };
    }

    const [channel] = await db
      .insert(channels)
      .values({
        organizationId: organization.id,
        agentId,
        type: "olx",
        isActive: true,
      })
      .returning();

    revalidatePath("/integrations");
    return { success: true, channelId: channel.id };
  } catch (error) {
    console.error("OLX ulashda xato:", error);
    return { success: false, error: "Kutilmagan xatolik yuz berdi" };
  }
}
