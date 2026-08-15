"use server";

import { randomBytes } from "node:crypto";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { siteAnalyticsSites } from "@/db/schema/site-analytics";
import { requireOrganization } from "@/lib/auth/dal";
import { normalizeDomain } from "./normalize-domain";

export async function registerSiteAnalyticsDomainAction(locale: string, formData: FormData): Promise<void> {
  const { organization } = await requireOrganization(locale);
  const domain = normalizeDomain(String(formData.get("domain") ?? ""));

  if (!domain) {
    redirect(`/${locale}/statistics/marketing?siteAnalyticsError=invalid_domain`);
  }

  const [existing] = await db
    .select({ id: siteAnalyticsSites.id })
    .from(siteAnalyticsSites)
    .where(eq(siteAnalyticsSites.organizationId, organization.id));

  if (!existing) {
    await db.insert(siteAnalyticsSites).values({
      organizationId: organization.id,
      domain,
      trackingKey: randomBytes(16).toString("hex"),
    });
  }

  revalidatePath(`/${locale}/statistics/marketing`);
}
