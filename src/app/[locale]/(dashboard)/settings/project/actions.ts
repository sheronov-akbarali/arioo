"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { organizations } from "@/db/schema/org";
import { requireOrganization } from "@/lib/auth/dal";
import { parseOrganizationInput } from "@/lib/org/schema";
import type { ProjectSettingsState } from "@/lib/org/project-settings-state";

export async function updateProjectAction(
  locale: string,
  _prevState: ProjectSettingsState,
  formData: FormData,
): Promise<ProjectSettingsState> {
  const { organization, membership } = await requireOrganization(locale);
  if (membership.role !== "owner" && membership.role !== "admin") {
    return { status: "error", error: "forbidden" };
  }

  const parsed = parseOrganizationInput({
    name: formData.get("name"),
    industry: formData.get("industry"),
  });
  if (!parsed.success) {
    return { status: "error", error: parsed.error };
  }

  await db.update(organizations).set(parsed.data).where(eq(organizations.id, organization.id));
  revalidatePath(`/${locale}/settings/project`);
  return { status: "success" };
}
