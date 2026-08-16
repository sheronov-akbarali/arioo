"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { organizations } from "@/db/schema/org";
import { requireOrganization } from "@/lib/auth/dal";

/** -1 is a sentinel meaning "user dismissed onboarding" — distinct from the
 * default 1..5 step progress so it survives even if every step later gets done. */
export async function dismissOnboardingAction(locale: string): Promise<void> {
  const { organization } = await requireOrganization(locale);
  await db.update(organizations).set({ onboardingStep: -1 }).where(eq(organizations.id, organization.id));
  revalidatePath(`/${locale}/dashboard`);
}
