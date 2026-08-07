"use server";

import { redirect } from "next/navigation";
import { db } from "@/db/client";
import { aiAgents } from "@/db/schema/agents";
import { requireOrganization } from "@/lib/auth/dal";
import { parseAgentInput } from "@/lib/agents/schema";

export async function createAgentAction(locale: string, formData: FormData): Promise<void> {
  const { organization } = await requireOrganization(locale);
  const parsed = parseAgentInput({
    name: formData.get("name"),
    role: formData.get("role"),
    systemPrompt: formData.get("systemPrompt"),
    model: formData.get("model"),
  });
  if (!parsed.success) {
    redirect(`/${locale}/assistants/new?error=${encodeURIComponent(parsed.error)}`);
  }

  const [agent] = await db
    .insert(aiAgents)
    .values({ ...parsed.data, organizationId: organization.id })
    .returning();

  redirect(`/${locale}/assistants/${agent!.id}`);
}
