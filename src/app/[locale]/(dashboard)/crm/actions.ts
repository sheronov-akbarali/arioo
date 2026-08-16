"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { crmDeals, crmContacts } from "@/db/schema/crm";
import { requireOrganization } from "@/lib/auth/dal";
import { fireRoutinesForEvent } from "@/lib/routines/executor";
import { z } from "zod";

const createDealSchema = z.object({
  title: z.string().min(2).max(100),
  value: z.string().optional(),
  currency: z.string().default("UZS"),
  status: z.enum(["new", "negotiating", "won", "lost"]).default("new"),
  contactId: z.string().optional(),
  contactName: z.string().optional(),
  contactPhone: z.string().optional(),
  agentId: z.string().optional(),
});

export async function createDealAction(locale: string, _prevState: unknown, formData: FormData) {
  const { organization } = await requireOrganization(locale);

  const rawData = {
    title: formData.get("title"),
    value: formData.get("value") || undefined,
    currency: formData.get("currency") || "UZS",
    status: formData.get("status") || "new",
    contactId: formData.get("contactId") || undefined,
    contactName: formData.get("contactName") || undefined,
    contactPhone: formData.get("contactPhone") || undefined,
    agentId: formData.get("agentId") || undefined,
  };

  const parsed = createDealSchema.safeParse(rawData);
  if (!parsed.success) {
    return { error: "Ma'lumotlar to'liq yoki to'g'ri kiritilmadi" };
  }

  let finalContactId = parsed.data.contactId;

  // Agar kontakt ID tanlanmagan bo'lsa, yaratamiz
  if (!finalContactId) {
    const [newContact] = await db
      .insert(crmContacts)
      .values({
        organizationId: organization.id,
        name: parsed.data.contactName || "Yangi mijoz",
        phone: parsed.data.contactPhone || null,
      })
      .returning();
    finalContactId = newContact.id;
  }

  await db.insert(crmDeals).values({
    organizationId: organization.id,
    title: parsed.data.title,
    value: parsed.data.value ? String(parsed.data.value) : null,
    currency: parsed.data.currency || "UZS",
    status: parsed.data.status,
    contactId: finalContactId,
    agentId: parsed.data.agentId || null,
  });

  revalidatePath(`/${locale}/crm`);
  return { success: true };
}

export async function updateDealStatusAction(
  locale: string,
  dealId: string,
  newStatus: "new" | "negotiating" | "won" | "lost"
) {
  const { organization } = await requireOrganization(locale);

  await db
    .update(crmDeals)
    .set({ status: newStatus, updatedAt: new Date() })
    .where(and(eq(crmDeals.id, dealId), eq(crmDeals.organizationId, organization.id)));

  await fireRoutinesForEvent(organization.id, "crm_event", `deal_status:${newStatus}`, { dealId });

  revalidatePath(`/${locale}/crm`);
  return { success: true };
}

export async function deleteDealAction(locale: string, dealId: string) {
  const { organization } = await requireOrganization(locale);

  await db
    .delete(crmDeals)
    .where(and(eq(crmDeals.id, dealId), eq(crmDeals.organizationId, organization.id)));

  revalidatePath(`/${locale}/crm`);
  return { success: true };
}
