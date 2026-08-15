"use server";

import { revalidatePath } from "next/cache";
import { eq, sql } from "drizzle-orm";
import { clerkClient } from "@clerk/nextjs/server";
import { db } from "@/db/client";
import { announcements } from "@/db/schema/announcements";
import { tickets } from "@/db/schema/tickets";
import { promocodes } from "@/db/schema/marketing";
import { organizations } from "@/db/schema/org";
import { aiAgents } from "@/db/schema/agents";
import { organizationCredits, creditTransactions } from "@/db/schema/billing";
import { notifications } from "@/db/schema/notifications";

import {
  announcementSchema,
  promocodeSchema,
  ticketStatusSchema,
  orgPlanSchema,
} from "@/lib/validation/schemas";

// ==========================================
// 1. CLERK FOYDALANUVCHILARNI BOSHQARISH
// ==========================================

export async function adminChangeUserPasswordAction(userId: string, newPassword: string) {
  try {
    if (!userId || !newPassword || newPassword.length < 6) {
      return { error: "Parol kamida 6 ta belgidan iborat bo'lishi kerak" };
    }

    const client = await clerkClient();
    await client.users.updateUser(userId, {
      password: newPassword,
      skipPasswordChecks: true,
    });

    revalidatePath("/admin/users", "page");
    return { success: true };
  } catch (error: unknown) {
    console.error("Failed to change user password:", error);
    const err = error as { errors?: Array<{ message: string }>; message?: string };
    return { error: err.errors?.[0]?.message || err.message || "Parolni o'zgartirishda xatolik yuz berdi" };
  }
}

export async function adminToggleUserBanAction(userId: string, shouldBan: boolean) {
  try {
    const client = await clerkClient();
    if (shouldBan) {
      await client.users.banUser(userId);
    } else {
      await client.users.unbanUser(userId);
    }
    revalidatePath("/admin/users", "page");
    return { success: true };
  } catch (error: unknown) {
    console.error("Failed to toggle user ban:", error);
    const err = error as { message?: string };
    return { error: err.message || "Foydalanuvchi holatini o'zgartirishda xatolik" };
  }
}

export async function adminDeleteUserAction(userId: string) {
  try {
    const client = await clerkClient();
    await client.users.deleteUser(userId);
    revalidatePath("/admin/users", "page");
    return { success: true };
  } catch (error: unknown) {
    console.error("Failed to delete user:", error);
    const err = error as { message?: string };
    return { error: err.message || "Foydalanuvchini o'chirishda xatolik" };
  }
}

// ==========================================
// 2. TASHKILOTLAR VA BALANS (CREDITS) BOSHQARUVI
// ==========================================

export async function adminAdjustOrgBalanceAction(
  orgId: string,
  amountUzs: number,
  type: "topup" | "deduct",
  description: string
) {
  try {
    if (!orgId || !amountUzs || amountUzs <= 0) {
      return { error: "Noto'g'ri summa kiritildi" };
    }

    const delta = type === "topup" ? amountUzs : -amountUzs;

    await db
      .insert(organizationCredits)
      .values({
        organizationId: orgId,
        balance: Math.max(0, delta),
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: organizationCredits.organizationId,
        set: {
          balance: sql`GREATEST(0, ${organizationCredits.balance} + ${delta})`,
          updatedAt: new Date(),
        },
      });

    await db.insert(creditTransactions).values({
      id: crypto.randomUUID(),
      organizationId: orgId,
      type: type === "topup" ? "topup" : "usage",
      amount: amountUzs,
      description: description || `Admin tomonidan hisob ${type === "topup" ? "to'ldirildi" : "yechildi"}`,
    });

    await db.insert(notifications).values({
      id: crypto.randomUUID(),
      organizationId: orgId,
      type: "system",
      title: type === "topup" ? "Balans to'ldirildi (Admin)" : "Balans tuzatildi (Admin)",
      body: `${new Intl.NumberFormat("uz-UZ").format(amountUzs)} UZS miqdorida hisobingizga o'zgartirish kiritildi. Izoh: ${description || "Admin operatsiyasi"}`,
    });

    revalidatePath("/admin/users", "page");
    revalidatePath("/admin/billing", "page");
    return { success: true };
  } catch (error: unknown) {
    console.error("Failed to adjust balance:", error);
    const err = error as { message?: string };
    return { error: err.message || "Balansni o'zgartirishda xatolik" };
  }
}

export async function updateOrgAction(orgId: string, formData: FormData) {
  const name = formData.get("name") as string;
  const industry = formData.get("industry") as string;
  const plan = formData.get("plan") as string;

  const parsedPlan = orgPlanSchema.safeParse(plan);

  await db
    .update(organizations)
    .set({
      name,
      industry,
      plan: parsedPlan.success ? parsedPlan.data : "start",
    })
    .where(eq(organizations.id, orgId));

  revalidatePath("/admin/users", "page");
  revalidatePath("/admin/billing", "page");
  return { success: true };
}

export async function updateOrgPlanAction(formData: FormData) {
  const orgId = formData.get("orgId") as string;
  const plan = formData.get("plan") as string;
  const parsedPlan = orgPlanSchema.safeParse(plan);

  if (!orgId || !parsedPlan.success) return;

  await db
    .update(organizations)
    .set({ plan: parsedPlan.data })
    .where(eq(organizations.id, orgId));

  revalidatePath("/admin/billing", "page");
  revalidatePath("/admin/users", "page");
}

// ==========================================
// 3. AI AGENTLARNI SUPERADMIN TAHRIRLASH
// ==========================================

export async function adminEditAgentAction(
  agentId: string,
  formData: FormData
) {
  const name = String(formData.get("name") ?? "").trim();
  const role = String(formData.get("role") ?? "sales") as "sales" | "support" | "hr" | "marketing";
  const systemPrompt = String(formData.get("systemPrompt") ?? "").trim();
  const status = String(formData.get("status") ?? "active") as "active" | "draft";

  if (!agentId || !name) {
    return { error: "Agent nomi kiritilishi shart" };
  }

  const validRoles = ["sales", "support", "hr", "marketing"] as const;
  const finalRole = validRoles.includes(role) ? role : "sales";

  await db
    .update(aiAgents)
    .set({
      name,
      role: finalRole,
      systemPrompt: systemPrompt || undefined,
      status: status === "active" ? "active" : "draft",
    })
    .where(eq(aiAgents.id, agentId));

  revalidatePath("/admin/agents", "page");
  return { success: true };
}

export async function toggleAgentStatusAction(formData: FormData) {
  const agentId = formData.get("agentId") as string;
  if (!agentId) return;

  const [agent] = await db
    .select({ status: aiAgents.status })
    .from(aiAgents)
    .where(eq(aiAgents.id, agentId));

  if (!agent) return;

  const newStatus = agent.status === "active" ? "draft" : "active";

  await db
    .update(aiAgents)
    .set({ status: newStatus })
    .where(eq(aiAgents.id, agentId));

  revalidatePath("/admin/agents", "page");
}

export async function deleteAgentAction(formData: FormData) {
  const agentId = formData.get("agentId") as string;
  if (!agentId) return;

  await db.delete(aiAgents).where(eq(aiAgents.id, agentId));
  revalidatePath("/admin/agents", "page");
}

// ==========================================
// 4. PUL YECHISH SO'ROVLARI (PAYOUTS) & TICKETS
// ==========================================

export async function adminApprovePayoutAction(ticketId: string, orgId: string, amount: number) {
  try {
    await db
      .update(tickets)
      .set({
        status: "closed",
        updatedAt: new Date(),
      })
      .where(eq(tickets.id, ticketId));

    await db.insert(notifications).values({
      id: crypto.randomUUID(),
      organizationId: orgId,
      type: "system",
      title: "Pul o'tkazmasi muvaffaqiyatli yakunlandi! 💸",
      body: `${new Intl.NumberFormat("uz-UZ").format(amount)} UZS miqdoridagi mablag' kartangizga muvaffaqiyatli o'tkazib berildi.`,
    });

    revalidatePath("/admin/billing", "page");
    revalidatePath("/admin/tickets", "page");
    return { success: true };
  } catch (error: unknown) {
    console.error("Failed to approve payout:", error);
    const err = error as { message?: string };
    return { error: err.message || "To'lovni tasdiqlashda xatolik" };
  }
}

export async function updateTicketStatusAction(
  id: string,
  status: "open" | "in_progress" | "closed"
) {
  const parsedStatus = ticketStatusSchema.safeParse(status);
  if (!parsedStatus.success) return;

  await db
    .update(tickets)
    .set({
      status: parsedStatus.data,
      updatedAt: new Date(),
    })
    .where(eq(tickets.id, id));

  revalidatePath("/admin/tickets", "page");
}

// ==========================================
// 5. E'LONLAR VA MARKETING
// ==========================================

export async function createAnnouncementAction(formData: FormData) {
  const parsed = announcementSchema.safeParse({
    title: formData.get("title"),
    content: formData.get("content"),
    type: formData.get("type") || "info",
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message || "Noto'g'ri ma'lumot kiritildi");
  }

  await db.insert(announcements).values({
    title: parsed.data.title,
    content: parsed.data.content || "",
    type: parsed.data.type,
    isActive: true,
  });

  revalidatePath("/admin/announcements", "page");
}

export async function deleteAnnouncementAction(id: string) {
  await db.delete(announcements).where(eq(announcements.id, id));
  revalidatePath("/admin/announcements", "page");
}

export async function createPromocodeAction(formData: FormData) {
  const parsed = promocodeSchema.safeParse({
    code: (formData.get("code") as string)?.toUpperCase(),
    discount: formData.get("discount"),
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message || "Noto'g'ri promokod ma'lumoti");
  }

  await db.insert(promocodes).values({
    code: parsed.data.code,
    discount: parsed.data.discount,
  });

  revalidatePath("/admin/marketing", "page");
}

export async function deletePromocodeAction(id: string) {
  await db.delete(promocodes).where(eq(promocodes.id, id));
  revalidatePath("/admin/marketing", "page");
}
