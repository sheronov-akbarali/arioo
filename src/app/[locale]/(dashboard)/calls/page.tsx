import { getTranslations } from "next-intl/server";
import { Phone, Calendar, Radio, PhoneCall, PhoneOff, Megaphone, History } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

const STAT_CARDS = [
  { key: "live", icon: Radio, iconClass: "bg-blue-500/10 text-blue-500" },
  { key: "completedToday", icon: PhoneCall, iconClass: "bg-green-500/10 text-green-500" },
  { key: "failed", icon: PhoneOff, iconClass: "bg-red-500/10 text-red-500" },
] as const;

const TAB_ITEMS = [
  { key: "queue", icon: Phone },
  { key: "campaigns", icon: Megaphone },
  { key: "history", icon: History },
] as const;

export default async function CallsPage() {
  const t = await getTranslations("calls");

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
          <Button size="sm" variant="outline" disabled>
            <Phone className="size-3.5" data-icon="inline-start" />
            {t("startCall")}
            <span className="ml-1 text-xs opacity-70">{t("comingSoon")}</span>
          </Button>
          <Button size="sm" variant="default" disabled>
            <Calendar className="size-3.5" data-icon="inline-start" />
            {t("scheduleCall")}
            <span className="ml-1 text-xs opacity-70">{t("comingSoon")}</span>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {STAT_CARDS.map(({ key, icon: Icon, iconClass }) => (
          <Card key={key}>
            <CardContent className="flex items-center gap-3 pt-6">
              <span className={"flex size-10 shrink-0 items-center justify-center rounded-full " + iconClass}>
                <Icon className="size-5" />
              </span>
              <div>
                <p className="text-3xl font-bold">0</p>
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
                <PhoneOff className="size-6" />
              </span>
              <div>
                <p className="font-medium">{t("empty")}</p>
                <p className="text-sm text-muted-foreground">{t("emptyHint")}</p>
              </div>
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
