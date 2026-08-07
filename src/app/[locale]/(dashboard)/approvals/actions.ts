"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db/client";
import { approvals } from "@/db/schema/approvals";
import { aiAgents } from "@/db/schema/agents";
import { requireOrganization } from "@/lib/auth/dal";
import { canResolve } from "@/lib/approvals/transitions";

async function resolveApproval(
  locale: string,
  approvalId: string,
  status: "approved" | "rejected",
): Promise<void> {
  const { organization } = await requireOrganization(locale);
  const { userId } = await auth();

  const [row] = await db
    .select({ approval: approvals })
    .from(approvals)
    .innerJoin(aiAgents, eq(approvals.agentId, aiAgents.id))
    .where(and(eq(approvals.id, approvalId), eq(aiAgents.organizationId, organization.id)));

  // Missing row (wrong org, or bad id) or already-resolved: nothing to do.
  if (!row || !canResolve(row.approval.status)) return;

  await db
    .update(approvals)
    .set({ status, resolvedAt: new Date(), resolvedByUserId: userId })
    .where(eq(approvals.id, approvalId));
  revalidatePath(`/${locale}/approvals`);
}

export async function approveAction(locale: string, approvalId: string): Promise<void> {
  await resolveApproval(locale, approvalId, "approved");
}

export async function rejectAction(locale: string, approvalId: string): Promise<void> {
  await resolveApproval(locale, approvalId, "rejected");
}
