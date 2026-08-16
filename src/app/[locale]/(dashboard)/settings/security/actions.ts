"use server";

import { eq, inArray } from "drizzle-orm";
import { db } from "@/db/client";
import { organizations } from "@/db/schema/org";
import { aiAgents } from "@/db/schema/agents";
import { conversations, messages } from "@/db/schema/conversations";
import { crmContacts, crmDeals } from "@/db/schema/crm";
import { channels } from "@/db/schema/channels";
import { knowledgeDocuments } from "@/db/schema/knowledge";
import { requireOrganization } from "@/lib/auth/dal";

/** Real data export — every table that stores organization-scoped personal
 * or business data, gathered into one downloadable JSON snapshot. */
export async function exportOrganizationDataAction(locale: string): Promise<{
  success: boolean;
  data?: string;
  error?: string;
}> {
  try {
    const { organization } = await requireOrganization(locale);
    const orgId = organization.id;

    const agents = await db.select().from(aiAgents).where(eq(aiAgents.organizationId, orgId));
    const agentIds = agents.map((a) => a.id);

    const [convs, contacts, deals, chans, docs] = await Promise.all([
      agentIds.length ? db.select().from(conversations).where(inArray(conversations.agentId, agentIds)) : [],
      db.select().from(crmContacts).where(eq(crmContacts.organizationId, orgId)),
      db.select().from(crmDeals).where(eq(crmDeals.organizationId, orgId)),
      db.select().from(channels).where(eq(channels.organizationId, orgId)),
      agentIds.length ? db.select().from(knowledgeDocuments).where(inArray(knowledgeDocuments.agentId, agentIds)) : [],
    ]);

    const conversationIds = convs.map((c) => c.id);
    const msgs = conversationIds.length
      ? await db.select().from(messages).where(inArray(messages.conversationId, conversationIds))
      : [];

    const exportPayload = {
      exportedAt: new Date().toISOString(),
      organization,
      agents,
      conversations: convs,
      messages: msgs,
      crmContacts: contacts,
      crmDeals: deals,
      channels: chans,
      knowledgeDocuments: docs,
    };

    return { success: true, data: JSON.stringify(exportPayload, null, 2) };
  } catch (error) {
    console.error("Organization data export failed:", error);
    return { success: false, error: "Eksport qilishda xatolik yuz berdi" };
  }
}

export async function deleteOrganizationAction(
  locale: string,
  confirmationName: string
): Promise<{ success: boolean; error?: string }> {
  const { organization, membership } = await requireOrganization(locale);

  if (membership.role !== "owner") {
    return { success: false, error: "Faqat tashkilot egasi (owner) o'chirishi mumkin" };
  }
  if (confirmationName.trim() !== organization.name) {
    return { success: false, error: "Tashkilot nomi noto'g'ri kiritildi" };
  }

  // organizations FK cascades (memberships, aiAgents, conversations,
  // crmContacts/Deals, channels, integrations, ...) handle the rest.
  await db.delete(organizations).where(eq(organizations.id, organization.id));

  return { success: true };
}
