"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { messageTemplates } from "@/db/schema/message-templates";
import { requireOrganization } from "@/lib/auth/dal";

export async function createMessageTemplateAction(
  locale: string,
  formData: FormData
) {
  const { organization } = await requireOrganization(locale);
  const title = (formData.get("title") as string)?.trim();
  const body = (formData.get("body") as string)?.trim();
  const category = (formData.get("category") as string) || "general";
  const agentId = (formData.get("agentId") as string) || null;

  if (!title || !body) {
    throw new Error("Sarlavha va shablon matni kiritilishi shart");
  }

  await db.insert(messageTemplates).values({
    organizationId: organization.id,
    agentId: agentId || null,
    title,
    body,
    category,
  });

  revalidatePath(`/${locale}/message-templates`);
}

export async function deleteMessageTemplateAction(
  locale: string,
  templateId: string
) {
  const { organization } = await requireOrganization(locale);

  await db
    .delete(messageTemplates)
    .where(
      and(
        eq(messageTemplates.id, templateId),
        eq(messageTemplates.organizationId, organization.id)
      )
    );

  revalidatePath(`/${locale}/message-templates`);
}
