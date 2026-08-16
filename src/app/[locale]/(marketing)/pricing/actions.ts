"use server";

import { db } from "@/db/client";
import { tickets } from "@/db/schema/tickets";
import { getOptionalOrganization } from "@/lib/auth/dal";
import { createNotification } from "@/lib/notifications/actions";

/**
 * There is no self-service plan-change/checkout flow yet — this creates a
 * real support ticket an admin acts on, instead of sending an already
 * logged-in user to the anonymous marketing lead-capture form (which never
 * even sees their organization).
 */
export async function requestPlanChangeAction(
  locale: string,
  tierId: string,
  tierName: string
): Promise<{ success: boolean; error?: string }> {
  const context = await getOptionalOrganization();
  if (!context) return { success: false, error: "not_authenticated" };

  await db.insert(tickets).values({
    organizationId: context.organization.id,
    subject: `Tarif o'zgartirish so'rovi: ${tierName}`,
    description: `Tashkilot "${context.organization.name}" "${tierId}" tarifiga o'tishni so'ramoqda.`,
  });

  await createNotification(context.organization.id, {
    type: "system",
    title: "Tarif o'zgartirish so'rovi yuborildi",
    body: `"${tierName}" tarifiga o'tish so'rovingiz qabul qilindi, jamoamiz tez orada siz bilan bog'lanadi.`,
    link: `/${locale}/billing`,
  });

  return { success: true };
}
