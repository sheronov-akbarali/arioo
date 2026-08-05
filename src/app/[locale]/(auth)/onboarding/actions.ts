"use server";

import { redirect } from "next/navigation";
import { db } from "@/db/client";
import { organizations, memberships } from "@/db/schema/org";
import { verifySession } from "@/lib/auth/dal";
import { parseOrganizationInput } from "@/lib/org/schema";

export async function createOrganization(locale: string, formData: FormData): Promise<void> {
  const { user } = await verifySession(locale);
  const parsed = parseOrganizationInput({
    name: formData.get("name"),
    industry: formData.get("industry"),
  });
  if (!parsed.success) {
    redirect(`/${locale}/onboarding?error=${encodeURIComponent(parsed.error)}`);
  }

  const [organization] = await db.insert(organizations).values(parsed.data).returning();
  await db.insert(memberships).values({
    userId: user.id,
    organizationId: organization!.id,
    role: "owner",
  });

  redirect(`/${locale}/dashboard`);
}
