import { eq } from "drizzle-orm";
import { requireOrganization } from "@/lib/auth/dal";
import { db } from "@/db/client";
import { crmDeals, crmContacts } from "@/db/schema/crm";
import { aiAgents } from "@/db/schema/agents";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { uz } from "date-fns/locale";

export default async function CrmDealsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const { organization } = await requireOrganization(locale);

  const rawDeals = await db
    .select({
      deal: crmDeals,
      contact: crmContacts,
      agent: aiAgents,
    })
    .from(crmDeals)
    .leftJoin(crmContacts, eq(crmDeals.contactId, crmContacts.id))
    .leftJoin(aiAgents, eq(crmDeals.agentId, aiAgents.id))
    .where(eq(crmDeals.organizationId, organization.id))
    .orderBy(crmDeals.createdAt);

  // Kanban ustunlari
  const columns = [
    { id: "new", title: "Yangi lid" },
    { id: "negotiating", title: "Muzokara" },
    { id: "won", title: "Muvaffaqiyatli" },
    { id: "lost", title: "Bekor qilingan" },
  ];

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex justify-end">
        <Button size="sm" className="gap-2">
          <Plus className="size-4" /> Deal yaratish
        </Button>
      </div>

      <div className="flex h-full flex-1 items-start gap-4 overflow-x-auto pb-4">
        {columns.map((col) => {
          const columnDeals = rawDeals.filter((d) => d.deal.status === col.id);
          
          return (
            <div key={col.id} className="flex h-full w-[300px] shrink-0 flex-col gap-3 rounded-lg bg-muted/40 p-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-sm">{col.title}</h3>
                <span className="flex h-5 items-center rounded-full bg-muted px-2 text-xs font-medium">
                  {columnDeals.length}
                </span>
              </div>
              
              <div className="flex flex-col gap-2 overflow-y-auto">
                {columnDeals.map(({ deal, contact, agent }) => (
                  <Card key={deal.id} className="cursor-grab hover:border-brand/50 active:cursor-grabbing">
                    <CardHeader className="p-3 pb-2">
                      <CardTitle className="text-sm font-medium leading-none">
                        {deal.title}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-3 pt-0 flex flex-col gap-2 text-xs">
                      {deal.value ? (
                        <p className="font-semibold text-brand">
                          {new Intl.NumberFormat("uz-UZ", {
                            style: "currency",
                            currency: deal.currency || "UZS",
                            maximumFractionDigits: 0
                          }).format(Number(deal.value))}
                        </p>
                      ) : null}
                      <div className="flex flex-col gap-1 text-muted-foreground">
                        <span className="truncate">👤 {contact?.name || "Noma'lum"}</span>
                        {agent && <span className="truncate">🤖 {agent.name}</span>}
                        <span>🕒 {formatDistanceToNow(deal.createdAt, { addSuffix: true, locale: uz })}</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
