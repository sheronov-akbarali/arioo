"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/db/client";
import { tickets } from "@/db/schema/tickets";
import { requireOrganization } from "@/lib/auth/dal";
import { createNotification } from "@/lib/notifications/actions";

/** Affiliate (agency reseller) tier is approval-gated, unlike the automatic
 * base Referral program — this creates a real, admin-actionable application
 * for the logged-in org instead of sending them to the anonymous public
 * marketing lead form, which never even sees who they are. */
export async function applyForAffiliateProgramAction(locale: string): Promise<{ success: boolean }> {
  const { organization } = await requireOrganization(locale);

  await db.insert(tickets).values({
    organizationId: organization.id,
    subject: "Hamkorlik (Affiliate) dasturiga ariza",
    description: `Tashkilot "${organization.name}" Affiliate hamkorlik dasturiga qo'shilish uchun ariza yubordi.`,
  });

  await createNotification(organization.id, {
    type: "system",
    title: "Ariza yuborildi",
    body: "Affiliate hamkorlik dasturiga arizangiz qabul qilindi, jamoamiz tez orada siz bilan bog'lanadi.",
    link: `/${locale}/affiliate-program`,
  });

  revalidatePath(`/${locale}/affiliate-program`);
  return { success: true };
}
