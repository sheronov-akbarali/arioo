"use server";

import { revalidatePath } from "next/cache";
import { requireOrganization } from "@/lib/auth/dal";
import { performHandoff } from "@/lib/chats/handoff";

export async function handoffConversationAction(
  locale: string,
  conversationId: string,
  formData: FormData
) {
  const { organization } = await requireOrganization(locale);
  const targetAgentId = formData.get("targetAgentId") as string;
  const reason = (formData.get("reason") as string) || "Operator tomonidan uzatildi";

  if (!targetAgentId) return;

  await performHandoff({
    organizationId: organization.id,
    conversationId,
    targetAgentId,
    reason,
    notifyLocale: locale,
  });

  revalidatePath(`/${locale}/chats`);
}
