"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/db/client";
import { routines, routineTriggerType } from "@/db/schema/routines";
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
