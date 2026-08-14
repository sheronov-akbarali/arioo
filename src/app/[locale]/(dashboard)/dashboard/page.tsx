import { getTranslations } from "next-intl/server";
import { requireOrganization } from "@/lib/auth/dal";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { db } from "@/db/client";
import { aiAgents } from "@/db/schema/agents";
import { crmDeals } from "@/db/schema/crm";
import { conversations } from "@/db/schema/conversations";
import { eq, count } from "drizzle-orm";
import { Bot, MessageSquare, Briefcase, Plus } from "lucide-react";
import { Link } from "@/i18n/navigation";

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
    <div className="flex flex-col gap-8 w-full max-w-6xl mx-auto py-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("title", { org: organization.name })}</h1>
          <p className="text-muted-foreground mt-1">Platformadagi barcha natijalar va boshqaruv markazi</p>
        </div>
        <Button render={<Link href="/assistants/new" />}>
          <Plus className="size-4 mr-2" /> Yangi AI Xodim qo'shish
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {stats.map((stat, i) => (
          <Link key={i} href={stat.href} className="block transition-transform hover:scale-[1.02]">
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
      
      {agentsCountRow.value === 0 && (
        <div className="flex flex-col items-center justify-center p-12 text-center border rounded-xl border-dashed bg-muted/10 mt-4">
          <Bot className="size-12 text-muted-foreground mb-4 opacity-20" />
          <h2 className="text-xl font-semibold mb-2">Hali hech qanday AI Xodim yaratmadingiz</h2>
          <p className="text-muted-foreground max-w-md mb-6">
            Sotuv, qo'llab-quvvatlash yoki HR vazifalari uchun o'zingizning birinchi sun'iy intellekt xodimingizni yarating.
          </p>
          <Button render={<Link href="/assistants/new" />} size="lg">
            Boshlash
          </Button>
        </div>
      )}
    </div>
  );
}
