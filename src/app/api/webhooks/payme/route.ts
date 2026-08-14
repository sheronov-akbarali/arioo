import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/db/client";
import { organizationCredits, creditTransactions } from "@/db/schema/billing";

/**
 * Payme JSON-RPC 2.0 Merchant Webhook Handler
 * Documentation: https://developer.help.paycom.uz/metody-merchant-api
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { method, params, id } = body;

    // CheckPerformTransaction
    if (method === "CheckPerformTransaction") {
      const amount = params?.amount; // in tiyins
      const orgId = params?.account?.org_id;

      if (!orgId || !amount || amount < 500000) {
        return NextResponse.json({
          error: { code: -31001, message: { uz: "Noto'g'ri summa yoki tashkilot topilmadi" } },
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
      const paymeTxId = params?.id || crypto.randomUUID();

      if (orgId && amountUzs > 0) {
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
