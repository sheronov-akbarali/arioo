import { getTranslations } from "next-intl/server";
import { PhoneOff } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

const STATS = ["live", "completedToday", "failed"] as const;
const TABS = ["queue", "campaigns", "history"] as const;

export default async function CallsPage() {
  const t = await getTranslations("calls");

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">{t("title")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" disabled>
            {t("startCall")}
            <span className="ml-1 text-xs opacity-70">{t("comingSoon")}</span>
          </Button>
          <Button size="sm" variant="outline" disabled>
            {t("scheduleCall")}
            <span className="ml-1 text-xs opacity-70">{t("comingSoon")}</span>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {STATS.map((stat) => (
          <Card key={stat}>
            <CardContent className="pt-6">
              <p className="text-3xl font-bold">0</p>
              <p className="mt-1 text-sm text-muted-foreground">{t(`stats.${stat}`)}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="queue">
        <TabsList>
          {TABS.map((tab) => (
            <TabsTrigger key={tab} value={tab}>
              {t(`tabs.${tab}`)}
            </TabsTrigger>
          ))}
        </TabsList>
        {TABS.map((tab) => (
          <TabsContent key={tab} value={tab}>
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
