"use server";

import { revalidatePath } from "next/cache";
import { sql } from "drizzle-orm";
import { db } from "@/db/client";
import { organizationCredits, creditTransactions } from "@/db/schema/billing";
import { requireOrganization } from "@/lib/auth/dal";
import { getPaymeCheckoutUrl, getClickCheckoutUrl } from "@/lib/billing/payment-providers";

export type TopUpResult = {
  success: boolean;
  redirectUrl?: string;
  error?: string;
};

export async function initiateTopUpAction(
  locale: string,
  amount: number,
  method: "payme" | "click" | "test"
): Promise<TopUpResult> {
  const { organization } = await requireOrganization(locale);

  if (amount < 5000) {
    return { success: false, error: "Minimal to'lov summasi 5 000 UZS" };
  }

  const transactionId = crypto.randomUUID();

  // Test to'lov rejimi (darhol balansga qo'shiladi) — faqat production bo'lmagan
  // muhitda ochiq, aks holda istalgan foydalanuvchi to'lovsiz balans olishi mumkin edi.
  if (method === "test") {
    if (process.env.NODE_ENV === "production") {
      return { success: false, error: "Test to'lov rejimi production muhitida mavjud emas" };
    }

    await db
      .insert(organizationCredits)
      .values({
        organizationId: organization.id,
        balance: amount,
        bonusBalance: Math.round(amount * 0.1), // 10% bonus
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: organizationCredits.organizationId,
        set: {
          balance: sql`${organizationCredits.balance} + ${amount}`,
          bonusBalance: sql`${organizationCredits.bonusBalance} + ${Math.round(amount * 0.1)}`,
          updatedAt: new Date(),
        },
      });

    await db.insert(creditTransactions).values({
      id: transactionId,
      organizationId: organization.id,
      type: "topup",
      amount,
      description: `Hisob to'ldirildi (Test rejimi / Instant Top-Up)`,
    });

    revalidatePath(`/${locale}/billing`);
    return { success: true };
  }

  // Payme Merchant checkout
  if (method === "payme") {
    const paymeMerchantId = process.env.PAYME_MERCHANT_ID;
    if (!paymeMerchantId) {
      return { success: false, error: "Payme to'lov tizimi hozircha sozlanmagan, administrator bilan bog'laning" };
    }
    const checkoutUrl = getPaymeCheckoutUrl({
      merchantId: paymeMerchantId,
      amountUzs: amount,
      organizationId: organization.id,
      transactionId,
    });
    return { success: true, redirectUrl: checkoutUrl };
  }

  // Click Shop checkout
  if (method === "click") {
    const clickServiceId = process.env.CLICK_SERVICE_ID;
    const clickMerchantId = process.env.CLICK_MERCHANT_ID;
    if (!clickServiceId || !clickMerchantId) {
      return { success: false, error: "Click to'lov tizimi hozircha sozlanmagan, administrator bilan bog'laning" };
    }
    const checkoutUrl = getClickCheckoutUrl({
      serviceId: clickServiceId,
      merchantId: clickMerchantId,
      amountUzs: amount,
      transactionId,
      returnUrl: `https://arioo.uz/${locale}/billing`,
    });
    return { success: true, redirectUrl: checkoutUrl };
  }

  return { success: false, error: "Noma'lum to'lov usuli" };
}
