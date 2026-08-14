import { eq } from "drizzle-orm";
import { requireOrganization } from "@/lib/auth/dal";
import { db } from "@/db/client";
import { crmDeals, crmContacts } from "@/db/schema/crm";
import { aiAgents } from "@/db/schema/agents";
import { CreateDealDialog } from "@/components/dashboard/crm/create-deal-dialog";
import { KanbanBoard, type KanbanDeal } from "@/components/dashboard/crm/kanban-board";

export default async function CrmDealsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const { organization } = await requireOrganization(locale);

  const [rawDeals, rawContacts, rawAgents] = await Promise.all([
    db
      .select({
        deal: crmDeals,
        contact: crmContacts,
        agent: aiAgents,
      })
      .from(crmDeals)
      .leftJoin(crmContacts, eq(crmDeals.contactId, crmContacts.id))
      .leftJoin(aiAgents, eq(crmDeals.agentId, aiAgents.id))
      .where(eq(crmDeals.organizationId, organization.id))
      .orderBy(crmDeals.createdAt),

    db
      .select({ id: crmContacts.id, name: crmContacts.name })
      .from(crmContacts)
      .where(eq(crmContacts.organizationId, organization.id)),

    db
      .select({ id: aiAgents.id, name: aiAgents.name })
      .from(aiAgents)
      .where(eq(aiAgents.organizationId, organization.id)),
  ]);

  const kanbanDeals: KanbanDeal[] = rawDeals.map(({ deal, contact, agent }) => ({
    id: deal.id,
    title: deal.title,
    value: deal.value,
    currency: deal.currency ?? "UZS",
    status: deal.status,
    createdAt: deal.createdAt,
    contactName: contact?.name || null,
    agentName: agent?.name || null,
  }));

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold">Bitimlar va Savdo Voronkasi</h1>
          <p className="text-xs text-muted-foreground">
            Barcha mijozlar bilan jarayondagi va yakunlangan savdolarni boshqaring
          </p>
        </div>
        <CreateDealDialog
          locale={locale}
          contacts={rawContacts}
          agents={rawAgents}
        />
      </div>

      <KanbanBoard locale={locale} initialDeals={kanbanDeals} />
    </div>
  );
}
