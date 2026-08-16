import "server-only";
import { db } from "@/db/client";
import { crmDeals, crmContacts } from "@/db/schema/crm";
import { getClickCheckoutUrl, getPaymeCheckoutUrl } from "./payment-providers";

export type PaymentInvoiceParams = {
  organizationId: string;
  agentId?: string;
  contactId?: string;
  contactName?: string;
  contactPhone?: string;
  amountUzs: number;
  dealTitle: string;
  description?: string;
};

export type PaymentInvoiceResult = {
  invoiceId: string;
  dealId?: string;
  amountUzs: number;
  clickUrl: string | null;
  paymeUrl: string | null;
  uzumUrl?: string;
  formattedMessage: string;
};

/**
 * Generate in-chat payment invoice URLs and optionally link/create a CRM Deal
 */
export async function createPaymentInvoice(
  params: PaymentInvoiceParams
): Promise<PaymentInvoiceResult> {
  const invoiceId = `inv_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const clickServiceId = process.env.CLICK_SERVICE_ID;
  const clickMerchantId = process.env.CLICK_MERCHANT_ID;
  const paymeMerchantId = process.env.PAYME_MERCHANT_ID;

  // 1. Create or Find CRM Contact & Deal if possible
  let dealId: string | undefined;
  try {
    let contactId = params.contactId;
    if (!contactId && params.contactName) {
      const [newContact] = await db
        .insert(crmContacts)
        .values({
          organizationId: params.organizationId,
          name: params.contactName,
          phone: params.contactPhone || null,
          notes: "In-chat to'lov orqali avtomatik yaratildi",
        })
        .returning();
      contactId = newContact.id;
    }

    if (contactId) {
      const [newDeal] = await db
        .insert(crmDeals)
        .values({
          organizationId: params.organizationId,
          contactId,
          agentId: params.agentId || null,
          title: params.dealTitle,
          value: String(params.amountUzs),
          currency: "UZS",
          status: "negotiating",
        })
        .returning();
      dealId = newDeal.id;
    }
  } catch (err) {
    console.warn("CRM deal creation skipped for invoice:", err);
  }

  // 2. Generate URLs
  const transactionParam = dealId
    ? `deal_${dealId}_${params.organizationId}`
    : `${params.organizationId}_${invoiceId}`;

  const clickUrl = clickServiceId && clickMerchantId
    ? getClickCheckoutUrl({
        serviceId: clickServiceId,
        merchantId: clickMerchantId,
        amountUzs: params.amountUzs,
        transactionId: transactionParam,
        returnUrl: "https://arioo.uz",
      })
    : null;

  const paymeUrl = paymeMerchantId
    ? getPaymeCheckoutUrl({
        merchantId: paymeMerchantId,
        amountUzs: params.amountUzs,
        organizationId: params.organizationId,
        transactionId: transactionParam,
      })
    : null;

  const uzumUrl = clickMerchantId
    ? `https://pay.uzum.uz/pay?merchantId=${clickMerchantId}&amount=${params.amountUzs}&orderId=${transactionParam}`
    : undefined;

  const formattedAmount = new Intl.NumberFormat("uz-UZ").format(params.amountUzs);

  const paymentLines = [
    clickUrl ? `🔹 [Click orqali to'lash](${clickUrl})` : null,
    paymeUrl ? `🔹 [Payme orqali to'lash](${paymeUrl})` : null,
    uzumUrl ? `🔹 [Uzum Pay orqali to'lash](${uzumUrl})` : null,
  ].filter(Boolean);

  const formattedMessage = paymentLines.length > 0
    ? `💳 **To'lov uchun hisob:**\n\n📌 **Buyurtma:** ${params.dealTitle}\n💰 **Summa:** ${formattedAmount} so'm\n\nQuyidagi to'lov tizimlaridan biri orqali 1 ta bosishda to'lashingiz mumkin:\n\n${paymentLines.join("\n")}\n\nTo'lovingiz qabul qilingach, buyurtmangiz darhol faollashadi!`
    : `💳 **To'lov uchun hisob:**\n\n📌 **Buyurtma:** ${params.dealTitle}\n💰 **Summa:** ${formattedAmount} so'm\n\nTo'lov tizimi hozircha sozlanmagan — operator siz bilan bog'lanib to'lovni qabul qiladi.`;

  return {
    invoiceId,
    dealId,
    amountUzs: params.amountUzs,
    clickUrl,
    paymeUrl,
    uzumUrl,
    formattedMessage,
  };
}
