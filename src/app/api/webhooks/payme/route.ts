import { NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { eq, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { organizationCredits, creditTransactions } from "@/db/schema/billing";
import { crmDeals } from "@/db/schema/crm";
import { notifications } from "@/db/schema/notifications";

/**
 * Payme JSON-RPC 2.0 Merchant Webhook Handler
 * Documentation: https://developer.help.paycom.uz/metody-merchant-api
 */

// Payme signs every request with HTTP Basic Auth: login "Paycom", password =
// the merchant key from the Payme Business cabinet. Constant-time compare to
// avoid a timing side-channel; fail closed if the key isn't configured.
export function isAuthorizedPaymeRequest(req: Request): boolean {
  const merchantKey = process.env.PAYME_MERCHANT_KEY;
  if (!merchantKey) return false;

  const authHeader = req.headers.get("authorization") || "";
  const expected = `Basic ${Buffer.from(`Paycom:${merchantKey}`).toString("base64")}`;

  const a = Buffer.from(authHeader);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { method, params, id } = body;

    if (!isAuthorizedPaymeRequest(req)) {
      return NextResponse.json({
        error: { code: -32504, message: { uz: "Ruxsat yo'q", ru: "Недостаточно привилегий", en: "Not authorized" } },
        id: id ?? null,
      });
    }

    // CheckPerformTransaction
    if (method === "CheckPerformTransaction") {
      const amount = params?.amount; // in tiyins
      const orgId = params?.account?.org_id;

      if ((!orgId && !params?.account?.tx_id) || !amount || amount < 500000) {
        return NextResponse.json({
          error: { code: -31001, message: { uz: "Noto'g'ri summa yoki hisob topilmadi" } },
          id,
        });
      }

      return NextResponse.json({
        result: { allow: true },
        id,
      });
    }

    // PerformTransaction / CreateTransaction
    if (method === "PerformTransaction" || method === "CreateTransaction") {
      const amountTiyins = params?.amount ?? 0;
      const amountUzs = Math.round(amountTiyins / 100);
      const orgId = params?.account?.org_id;
      const txId = params?.account?.tx_id as string | undefined;
      const paymeTxId = params?.id || crypto.randomUUID();

      // Payme retries PerformTransaction on network hiccups — guard against
      // double-crediting the same transaction twice.
      const [existingTx] = await db
        .select({ id: creditTransactions.id })
        .from(creditTransactions)
        .where(eq(creditTransactions.id, `payme_${paymeTxId}`));

      if (existingTx) {
        return NextResponse.json({
          result: { transaction: paymeTxId, perform_time: Date.now(), state: 2 },
          id,
        });
      }

      // Check if this payment is for a CRM Deal (format: deal_<dealId>_<orgId>)
      if (txId?.startsWith("deal_")) {
        const parts = txId.split("_");
        const dealId = parts[1];
        const dealOrgId = parts[2] || orgId;

        if (dealId) {
          await db
            .update(crmDeals)
            .set({ status: "won" })
            .where(eq(crmDeals.id, dealId));
        }

        if (dealOrgId) {
          await db.insert(notifications).values({
            organizationId: dealOrgId,
            type: "lead",
            title: "🎉 To'lov qabul qilindi!",
            body: `Payme orqali ${amountUzs.toLocaleString()} so'm to'lov muvaffaqiyatli amalga oshirildi (Bitim #${dealId?.substring(0, 6)}).`,
          });
        }
      } else if (orgId && amountUzs > 0) {
        // Standard Topup
        await db
          .insert(organizationCredits)
          .values({
            organizationId: orgId,
            balance: amountUzs,
            bonusBalance: Math.round(amountUzs * 0.05),
            updatedAt: new Date(),
          })
          .onConflictDoUpdate({
            target: organizationCredits.organizationId,
            set: {
              balance: sql`${organizationCredits.balance} + ${amountUzs}`,
              bonusBalance: sql`${organizationCredits.bonusBalance} + ${Math.round(amountUzs * 0.05)}`,
              updatedAt: new Date(),
            },
          });

        await db.insert(creditTransactions).values({
          id: `payme_${paymeTxId}`,
          organizationId: orgId,
          type: "topup",
          amount: amountUzs,
          description: `Payme to'lovi (ID: ${paymeTxId})`,
        });
      }

      return NextResponse.json({
        result: {
          transaction: paymeTxId,
          perform_time: Date.now(),
          state: 2,
        },
        id,
      });
    }

    return NextResponse.json({
      result: { success: true },
      id,
    });
  } catch (error) {
    console.error("Payme webhook error:", error);
    return NextResponse.json({
      error: { code: -32400, message: "Internal server error" },
      id: 1,
    });
  }
}
