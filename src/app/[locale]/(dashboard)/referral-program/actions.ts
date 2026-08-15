"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/db/client";
import { tickets } from "@/db/schema/tickets";
import { notifications } from "@/db/schema/notifications";
import { requireOrganization } from "@/lib/auth/dal";
import { z } from "zod";

const payoutSchema = z.object({
  amount: z.number().min(50000, "Minimal yechish summasi 50 000 UZS"),
  cardNumber: z.string().min(16, "Karta raqami 16 ta raqamdan iborat bo'lishi kerak"),
  cardHolder: z.string().min(3, "Karta egasining ismini kiriting"),
});

export async function requestPayoutAction(
  locale: string,
  _prevState: unknown,
  formData: FormData
) {
  const { organization } = await requireOrganization(locale);
  const amount = Number(formData.get("amount") || 0);
  const cardNumber = String(formData.get("cardNumber") || "").replace(/\s/g, "");
  const cardHolder = String(formData.get("cardHolder") || "");

  const parsed = payoutSchema.safeParse({ amount, cardNumber, cardHolder });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || "Ma'lumotlar noto'g'ri" };
  }

  // Create Payout Request Ticket in DB
  await db.insert(tickets).values({
    organizationId: organization.id,
    subject: `Pul yechish so'rovi: ${new Intl.NumberFormat("uz-UZ").format(amount)} UZS`,
    description: `Karta raqami: ${cardNumber}\nKarta egasi: ${cardHolder}\nSumma: ${amount} UZS`,
    status: "open",
  });

  // Notify organization
  await db.insert(notifications).values({
    id: crypto.randomUUID(),
    organizationId: organization.id,
    type: "system",
    title: "Pul yechish so'rovi qabul qilindi",
    body: `${new Intl.NumberFormat("uz-UZ").format(amount)} UZS miqdoridagi mablag'ni yechish so'rovi moderatorlarimiz tomonidan ko'rib chiqilmoqda.`,
  });

  revalidatePath(`/${locale}/referral-program`);
  revalidatePath(`/${locale}/affiliate-program`);
  return { success: true };
}
