"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { organizations } from "@/db/schema/org";
import { requireOrganization } from "@/lib/auth/dal";
import { whitelabelSchema } from "@/lib/validation/schemas";
import { createNotification } from "@/lib/notifications/actions";

export async function saveWhitelabelAction(
  locale: string,
  formData: FormData
) {
  const { organization } = await requireOrganization(locale);

  const parsed = whitelabelSchema.safeParse({
    appName: formData.get("appName"),
    logoUrl: formData.get("logoUrl") || "",
    primaryColor: formData.get("primaryColor") || "#0284c7",
    customDomain: formData.get("customDomain") || null,
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message || "Noto'g'ri brending ma'lumotlari");
  }

  const whitelabelJson = JSON.stringify(parsed.data);

  await db
    .update(organizations)
    .set({
      whitelabel: whitelabelJson,
    })
    .where(eq(organizations.id, organization.id));

  await createNotification(organization.id, {
    type: "system",
    title: "White-label brending saqlandi",
    body: `Agentlik brendingi ("${parsed.data.appName}") muvaffaqiyatli yangilandi.`,
    link: `/${locale}/settings/whitelabel`,
  });

  revalidatePath(`/${locale}/settings/whitelabel`);
}
