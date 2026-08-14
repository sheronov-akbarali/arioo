import { eq } from "drizzle-orm";
import { getTranslations } from "next-intl/server";
import { Phone, Radio, PhoneCall, PhoneOff, Megaphone, History } from "lucide-react";
import { db } from "@/db/client";
import { aiAgents } from "@/db/schema/agents";
import { requireOrganization } from "@/lib/auth/dal";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { StartCallDialog, ScheduleCallDialog } from "@/components/dashboard/calls/call-modal";

const STAT_CARDS = [
  { key: "live", icon: Radio, iconClass: "bg-blue-500/10 text-blue-500", count: 0 },
  { key: "completedToday", icon: PhoneCall, iconClass: "bg-green-500/10 text-green-500", count: 12 },
  { key: "failed", icon: PhoneOff, iconClass: "bg-red-500/10 text-red-500", count: 0 },
] as const;

const TAB_ITEMS = [
  { key: "queue", icon: Phone },
  { key: "campaigns", icon: Megaphone },
  { key: "history", icon: History },
] as const;

export default async function CallsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const { organization } = await requireOrganization(locale);
  const t = await getTranslations("calls");

  const orgAgents = await db
    .select({ id: aiAgents.id, name: aiAgents.name })
    .from(aiAgents)
    .where(eq(aiAgents.organizationId, organization.id));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand">
            <Phone className="size-5" />
          </span>
          <div>
            <h1 className="text-xl font-semibold">{t("title")}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{t("subtitle")}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <StartCallDialog locale={locale} agents={orgAgents} />
          <ScheduleCallDialog locale={locale} agents={orgAgents} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {STAT_CARDS.map(({ key, icon: Icon, iconClass, count }) => (
          <Card key={key}>
            <CardContent className="flex items-center gap-3 pt-6">
              <span className={"flex size-10 shrink-0 items-center justify-center rounded-full " + iconClass}>
                <Icon className="size-5" />
              </span>
              <div>
                <p className="text-3xl font-bold">{count}</p>
                <p className="mt-1 text-sm text-muted-foreground">{t(`stats.${key}`)}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="queue">
        <TabsList>
          {TAB_ITEMS.map(({ key, icon: Icon }) => (
            <TabsTrigger key={key} value={key}>
              <Icon className="size-3.5" data-icon="inline-start" />
              {t(`tabs.${key}`)}
            </TabsTrigger>
          ))}
        </TabsList>
        {TAB_ITEMS.map(({ key }) => (
          <TabsContent key={key} value={key}>
            <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border py-16 text-center">
              <span className="flex size-12 items-center justify-center rounded-full bg-brand/10 text-brand">
                <Phone className="size-6" />
              </span>
              <div>
                <p className="font-medium">Ovozli qo'ng'iroqlar navbati bo'sh</p>
                <p className="text-sm text-muted-foreground">Yangi qo'ng'iroq boshlash yoki rejalashtirish uchun yuqoridagi tugmalardan foydalaning.</p>
              </div>
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
