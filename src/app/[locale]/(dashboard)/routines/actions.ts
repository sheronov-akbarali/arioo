"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { routines, routineTriggerType, routineActionType } from "@/db/schema/routines";
import { requireOrganization } from "@/lib/auth/dal";
import { executeRoutine } from "@/lib/routines/executor";

export async function createRoutineAction(locale: string, formData: FormData): Promise<void> {
  const { organization } = await requireOrganization(locale);
  const name = String(formData.get("name") ?? "").trim();
  const triggerType = String(formData.get("triggerType") ?? "");
  const resource = String(formData.get("resource") ?? "").trim();
  const actionType = String(formData.get("actionType") ?? "notify");

  if (!name || !resource || !routineTriggerType.enumValues.includes(triggerType as never)) {
    return;
  }
  if (!routineActionType.enumValues.includes(actionType as never)) return;

  const actionConfig: Record<string, string> = {};
  if (actionType === "notify") {
    actionConfig.title = String(formData.get("notifyTitle") ?? name);
    actionConfig.body = String(formData.get("notifyBody") ?? "");
  } else if (actionType === "webhook") {
    actionConfig.url = String(formData.get("webhookUrl") ?? "");
  } else if (actionType === "handoff") {
    actionConfig.targetAgentId = String(formData.get("targetAgentId") ?? "");
  }

  await db.insert(routines).values({
    organizationId: organization.id,
    name,
    triggerType: triggerType as (typeof routineTriggerType.enumValues)[number],
    resource,
    actionType: actionType as (typeof routineActionType.enumValues)[number],
    actionConfig,
    status: "active",
  });

  revalidatePath(`/${locale}/routines`);
}

export async function executeRoutineNowAction(locale: string, routineId: string) {
  const { organization } = await requireOrganization(locale);

  const [routine] = await db
    .select()
    .from(routines)
    .where(and(eq(routines.id, routineId), eq(routines.organizationId, organization.id)));

  if (!routine) return { error: "Rutina topilmadi" };

  await executeRoutine(routine, {});

  revalidatePath(`/${locale}/routines`);
  return { success: true };
}

export async function toggleRoutineAction(
  locale: string,
  routineId: string,
  newStatus: "active" | "paused"
) {
  const { organization } = await requireOrganization(locale);

  await db
    .update(routines)
    .set({ status: newStatus })
    .where(and(eq(routines.id, routineId), eq(routines.organizationId, organization.id)));

  revalidatePath(`/${locale}/routines`);
  return { success: true };
}

export async function deleteRoutineAction(locale: string, routineId: string) {
  const { organization } = await requireOrganization(locale);

  await db
    .delete(routines)
    .where(and(eq(routines.id, routineId), eq(routines.organizationId, organization.id)));

  revalidatePath(`/${locale}/routines`);
  return { success: true };
}
