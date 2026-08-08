import { getTranslations } from "next-intl/server";
import {
  Send,
  MessageCircle,
  Globe,
  ShoppingBag,
  Phone,
  Building2,
  FileSpreadsheet,
  GitBranch,
  Webhook,
} from "lucide-react";
import { INTEGRATION_PROVIDERS } from "@/lib/integrations-data";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  telegram: Send,
  whatsapp: MessageCircle,
  websiteWidget: Globe,
  olx: ShoppingBag,
  sip: Phone,
  amocrm: Building2,
  bitrix24: Building2,
  googleWorkspace: FileSpreadsheet,
  github: GitBranch,
  oneC: Building2,
  customMcp: Webhook,
};

export default async function IntegrationsPage() {
  const t = await getTranslations("integrations");

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold">{t("title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("subtitle")}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {INTEGRATION_PROVIDERS.map((provider) => {
          const Icon = ICONS[provider.id];
          return (
            <Card key={provider.id}>
              <CardContent className="flex flex-col gap-3 pt-6">
                <div className="flex items-center gap-3">
                  <span className="flex size-10 items-center justify-center rounded-lg bg-brand/10 text-brand">
                    <Icon className="size-5" />
                  </span>
                  <div>
                    <p className="font-medium">{t(`providers.${provider.id}.name`)}</p>
                    <p className="text-xs text-muted-foreground">{t(`providers.${provider.id}.description`)}</p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex gap-1">
                    {provider.categories.map((category) => (
                      <Badge key={category} variant="outline" className="text-xs">
                        {t(`categories.${category}`)}
                      </Badge>
                    ))}
                  </div>
                  <Button size="sm" variant="outline" disabled>
                    {t("connect")}
                    <span className="ml-1 text-xs opacity-70">{t("comingSoon")}</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
