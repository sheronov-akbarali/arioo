"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { channels } from "@/db/schema/channels";
import { integrations, integrationEvents } from "@/db/schema/integrations";
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

    // Bazaga yozamiz — bitta tashkilot uchun faol Telegram kanali mavjud bo'lsa,
    // yangi qator qo'shish o'rniga uni yangilaymiz (ikki nusxa yaratmaslik uchun).
    const [existingChannel] = await db
      .select({ id: channels.id })
      .from(channels)
      .where(and(eq(channels.organizationId, organization.id), eq(channels.type, "telegram"), eq(channels.isActive, true)));

    let channelId: string;
    if (existingChannel) {
      await db
        .update(channels)
        .set({ agentId, botToken, botUsername, updatedAt: new Date() })
        .where(eq(channels.id, existingChannel.id));
      channelId = existingChannel.id;
    } else {
      const [newChannel] = await db
        .insert(channels)
        .values({
          organizationId: organization.id,
          agentId,
          type: "telegram",
          botToken,
          botUsername,
          isActive: true,
        })
        .returning({ id: channels.id });
      channelId = newChannel.id;
    }

    // Telegram'ga xabarlarni qayerga yuborishni aytamiz — bunisiz bot hech
    // qachon xabar qabul qilmaydi, faqat token tekshirilgan bo'lib qoladi.
    const appUrl = process.env.NEXT_PUBLIC_APP_URL;
    if (!appUrl) {
      return { success: false, error: "NEXT_PUBLIC_APP_URL sozlanmagan — webhook o'rnatib bo'lmadi" };
    }
    const webhookUrl = `${appUrl}/api/webhooks/telegram/${channelId}`;
    const setWebhookRes = await fetch(
      `https://api.telegram.org/bot${botToken}/setWebhook?url=${encodeURIComponent(webhookUrl)}`
    );
    const setWebhookData = await setWebhookRes.json();
    if (!setWebhookData.ok) {
      return { success: false, error: `Bot topildi, lekin webhook o'rnatilmadi: ${setWebhookData.description || "noma'lum xato"}` };
    }

    const [integrationRow] = await db
      .insert(integrations)
      .values({
        organizationId: organization.id,
        providerId: "telegram_bot",
        connectionMode: "special",
        status: "active",
        agentId,
        lastVerifiedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [integrations.organizationId, integrations.providerId],
        set: { status: "active", agentId, lastVerifiedAt: new Date(), lastError: null, updatedAt: new Date() },
      })
      .returning({ id: integrations.id });
    await db.insert(integrationEvents).values({ integrationId: integrationRow.id, type: "verified" });

    revalidatePath("/uz/integrations");
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
    const wabaId = formData.get("wabaId") as string;

    if (!agentId || !accessToken || !phoneNumberId || !wabaId) {
      return { success: false, error: "Barcha maydonlarni to'ldiring" };
    }

    // Meta'ga ilovani ushbu WhatsApp Business Account'ga xabar yubortirishga
    // obuna qilamiz — bunisiz webhook URL Meta konsolida to'g'ri bo'lsa ham
    // hech qanday xabar kelmaydi.
    const subscribeRes = await fetch(
      `https://graph.facebook.com/v21.0/${wabaId}/subscribed_apps`,
      { method: "POST", headers: { Authorization: `Bearer ${accessToken}` } }
    );
    const subscribeData = await subscribeRes.json();
    if (!subscribeRes.ok || !subscribeData.success) {
      return {
        success: false,
        error: `Meta'ga obuna bo'lishda xatolik: ${subscribeData.error?.message || "token yoki WABA ID noto'g'ri"}`,
      };
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
