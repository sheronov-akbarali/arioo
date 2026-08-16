import { NextResponse } from "next/server";
import { createHash, timingSafeEqual } from "crypto";
import { eq, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { organizationCredits, creditTransactions } from "@/db/schema/billing";
import { crmDeals } from "@/db/schema/crm";
import { notifications } from "@/db/schema/notifications";

/**
 * Click Shop Merchant Webhook Handler
 * Documentation: https://docs.click.uz/merchant-api/
 */

// Click signs every request with an MD5 sign_string built from the shared
// secret key configured in the Click Merchant cabinet. Fail closed if the
// secret isn't configured.
export function isValidClickSignature(params: {
  clickTransId: string;
  merchantTransId: string;
  amount: string;
  action: string;
  signTime: string;
  signString: string;
  merchantPrepareId?: string;
}): boolean {
  const secretKey = process.env.CLICK_SECRET_KEY;
  if (!secretKey) return false;

  const parts = [
    params.clickTransId,
    process.env.CLICK_SERVICE_ID || "",
    secretKey,
    params.merchantTransId,
  ];
  if (params.merchantPrepareId) parts.push(params.merchantPrepareId);
  parts.push(params.amount, params.action, params.signTime);

  const expected = createHash("md5").update(parts.join("")).digest("hex");

  const a = Buffer.from(params.signString);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const clickTransId = formData.get("click_trans_id") as string;
    const clickPaydocId = formData.get("click_paydoc_id") as string;
    const merchantTransId = formData.get("merchant_trans_id") as string;
    const merchantPrepareId = formData.get("merchant_prepare_id") as string | null;
    const amount = Number(formData.get("amount") || 0);
    const action = Number(formData.get("action") || 0);
    const error = Number(formData.get("error") || 0);
    const signTime = formData.get("sign_time") as string;
    const signString = formData.get("sign_string") as string;

    const signatureValid = isValidClickSignature({
      clickTransId,
      merchantTransId,
      amount: formData.get("amount") as string,
      action: String(action),
      signTime,
      signString,
      merchantPrepareId: action === 1 ? merchantPrepareId || undefined : undefined,
    });

    if (!signatureValid) {
      return NextResponse.json({
        click_trans_id: clickTransId,
        merchant_trans_id: merchantTransId,
        error: -1,
        error_note: "SIGN CHECK FAILED!",
      });
    }

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
      const idempotencyId = `click_${clickTransId || clickPaydocId}`;
      const [existingTx] = await db
        .select({ id: creditTransactions.id })
        .from(creditTransactions)
        .where(eq(creditTransactions.id, idempotencyId));

      if (existingTx) {
        return NextResponse.json({
          click_trans_id: clickTransId,
          merchant_trans_id: merchantTransId,
          merchant_confirm_id: clickTransId,
          error: 0,
          error_note: "Success",
        });
      }

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
