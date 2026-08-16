import { NextResponse } from "next/server";
import { eq, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { organizationCredits, creditTransactions } from "@/db/schema/billing";
import { crmDeals } from "@/db/schema/crm";
import { notifications } from "@/db/schema/notifications";

/**
 * Click Shop Merchant Webhook Handler
 * Documentation: https://docs.click.uz/merchant-api/
 */
export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const clickTransId = formData.get("click_trans_id") as string;
    const clickPaydocId = formData.get("click_paydoc_id") as string;
    const merchantTransId = formData.get("merchant_trans_id") as string;
    const amount = Number(formData.get("amount") || 0);
    const action = Number(formData.get("action") || 0);
    const error = Number(formData.get("error") || 0);

    // Action 0: Prepare
    if (action === 0) {
      return NextResponse.json({
        click_trans_id: clickTransId,
        merchant_trans_id: merchantTransId,
        merchant_prepare_id: clickTransId,
        error: 0,
        error_note: "Success",
      });
    }

    // Action 1: Complete
    if (action === 1 && error === 0) {
      // Check if this payment is for a CRM Deal (format: deal_<dealId>_<orgId>)
      if (merchantTransId?.startsWith("deal_")) {
        const parts = merchantTransId.split("_");
        const dealId = parts[1];
        const orgId = parts[2];

        if (dealId) {
          await db
            .update(crmDeals)
            .set({ status: "won" })
            .where(eq(crmDeals.id, dealId));
        }

        if (orgId) {
          await db.insert(notifications).values({
            organizationId: orgId,
            type: "lead",
            title: "🎉 To'lov qabul qilindi!",
            body: `Click orqali ${amount.toLocaleString()} so'm to'lov muvaffaqiyatli amalga oshirildi (Bitim #${dealId?.substring(0, 6)}).`,
          });
        }
      } else {
        // Standard Balance Topup
        const orgId = merchantTransId?.split("_")[0];
        if (orgId && amount > 0) {
          await db
            .insert(organizationCredits)
            .values({
              organizationId: orgId,
              balance: amount,
              bonusBalance: Math.round(amount * 0.05),
              updatedAt: new Date(),
            })
            .onConflictDoUpdate({
              target: organizationCredits.organizationId,
              set: {
                balance: sql`${organizationCredits.balance} + ${amount}`,
                bonusBalance: sql`${organizationCredits.bonusBalance} + ${Math.round(amount * 0.05)}`,
                updatedAt: new Date(),
              },
            });

          await db.insert(creditTransactions).values({
            id: `click_${clickTransId || clickPaydocId}`,
            organizationId: orgId,
            type: "topup",
            amount,
            description: `Click to'lovi (ID: ${clickTransId})`,
          });
        }
      }

      return NextResponse.json({
        click_trans_id: clickTransId,
        merchant_trans_id: merchantTransId,
        merchant_confirm_id: clickTransId,
        error: 0,
        error_note: "Success",
      });
    }

    return NextResponse.json({
      click_trans_id: clickTransId,
      merchant_trans_id: merchantTransId,
      error: -8,
      error_note: "Unknown action",
    });
  } catch (error) {
    console.error("Click webhook error:", error);
    return NextResponse.json({
      error: -8,
      error_note: "Internal Server Error",
    });
  }
}
