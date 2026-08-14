"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { routines, routineTriggerType } from "@/db/schema/routines";
import { notifications } from "@/db/schema/notifications";
import { requireOrganization } from "@/lib/auth/dal";

export async function createRoutineAction(locale: string, formData: FormData): Promise<void> {
  const { organization } = await requireOrganization(locale);
  const name = String(formData.get("name") ?? "").trim();
  const triggerType = String(formData.get("triggerType") ?? "");
  const resource = String(formData.get("resource") ?? "").trim();

  if (!name || !resource || !routineTriggerType.enumValues.includes(triggerType as never)) {
    return;
  }

  await db.insert(routines).values({
    organizationId: organization.id,
    name,
    triggerType: triggerType as (typeof routineTriggerType.enumValues)[number],
    resource,
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

  // Log notification for execution
  await db.insert(notifications).values({
    id: crypto.randomUUID(),
    organizationId: organization.id,
    type: "system",
    title: `Rutina bajarildi: ${routine.name}`,
    body: `Resurs: ${routine.resource} (${routine.triggerType}) muvaffaqiyatli ishga tushirildi.`,
    link: `/${locale}/routines`,
  });

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
