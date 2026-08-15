import { getTranslations } from "next-intl/server";
import { requireOrganization } from "@/lib/auth/dal";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { db } from "@/db/client";
import { aiAgents } from "@/db/schema/agents";
import { crmDeals } from "@/db/schema/crm";
import { conversations } from "@/db/schema/conversations";
import { knowledgeDocuments } from "@/db/schema/knowledge";
import { channels } from "@/db/schema/channels";
import { eq, count } from "drizzle-orm";
import { Bot, MessageSquare, Briefcase, Plus } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { OnboardingWizard } from "@/components/dashboard/onboarding-wizard";

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const { organization } = await requireOrganization(locale);
  const t = await getTranslations("dashboard.home");

  // Fetch real statistics for this organization
  const [agentsCountRow] = await db.select({ value: count() })
    .from(aiAgents)
    .where(eq(aiAgents.organizationId, organization.id));
    
  const [dealsCountRow] = await db.select({ value: count() })
    .from(crmDeals)
    .where(eq(crmDeals.organizationId, organization.id));

  const [chatsCountRow] = await db.select({ value: count() })
    .from(conversations)
    .innerJoin(aiAgents, eq(conversations.agentId, aiAgents.id))
    .where(eq(aiAgents.organizationId, organization.id));

  // Check onboarding prerequisites
  const [knowledgeCountRow] = await db.select({ value: count() })
    .from(knowledgeDocuments)
    .innerJoin(aiAgents, eq(knowledgeDocuments.agentId, aiAgents.id))
    .where(eq(aiAgents.organizationId, organization.id));

  const [channelsCountRow] = await db.select({ value: count() })
    .from(channels)
    .innerJoin(aiAgents, eq(channels.agentId, aiAgents.id))
    .where(eq(aiAgents.organizationId, organization.id));

  const firstAgent = await db.select({ id: aiAgents.id })
    .from(aiAgents)
    .where(eq(aiAgents.organizationId, organization.id))
    .limit(1);

  const stats = [
    {
      title: "Faol AI Xodimlar",
      value: agentsCountRow.value,
      icon: Bot,
      color: "text-blue-500",
      href: "/assistants"
    },
    {
      title: "CRM Bitimlar (Deals)",
      value: dealsCountRow.value,
      icon: Briefcase,
      color: "text-purple-500",
      href: "/crm"
    },
    {
      title: "Mijozlar bilan suhbatlar",
      value: chatsCountRow.value,
      icon: MessageSquare,
      color: "text-green-500",
      href: "/chats"
    }
  ];

  return (
    <div className="flex flex-col gap-6 w-full max-w-6xl mx-auto py-4">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("title", { org: organization.name })}</h1>
          <p className="text-muted-foreground mt-1">Platformadagi barcha natijalar va boshqaruv markazi</p>
        </div>
        <Button render={<Link href="/assistants/new" />}>
          <Plus className="size-4 mr-2" /> Yangi AI Xodim qo'shish
        </Button>
      </div>

      {/* Interactive Onboarding Wizard */}
      <OnboardingWizard
        hasAgents={agentsCountRow.value > 0}
        hasKnowledge={knowledgeCountRow.value > 0}
        hasChannels={channelsCountRow.value > 0}
        hasChats={chatsCountRow.value > 0}
        firstAgentId={firstAgent[0]?.id}
      />

      <div className="grid gap-4 md:grid-cols-3">
        {stats.map((stat, i) => (
          <Link key={i} href={stat.href} className="block transition-transform hover:scale-[1.01]">
            <Card className="h-full border-muted/50 hover:border-primary/50 transition-colors">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <stat.icon className={`size-5 ${stat.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{stat.value}</div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
