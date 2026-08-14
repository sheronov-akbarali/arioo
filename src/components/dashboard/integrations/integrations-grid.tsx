"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
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
import { INTEGRATION_PROVIDERS, type IntegrationCategory } from "@/lib/integrations/providers";
import { ListSearchInput } from "@/components/dashboard/list-search-input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TelegramConnectDialog } from "./telegram-connect-dialog";
import { WidgetConnectDialog } from "./widget-connect-dialog";
import { WhatsappConnectDialog } from "./whatsapp-connect-dialog";
import { OlxConnectDialog } from "./olx-connect-dialog";
import { ExternalCrmConnectDialog } from "./external-crm-connect-dialog";
import { CalendarConnectDialog } from "./calendar-connect-dialog";
import { McpConnectDialog } from "./mcp-connect-dialog";
import { SipConnectDialog } from "./sip-connect-dialog";

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  telegram: Send,
  whatsapp: MessageCircle,
  websiteWidget: Globe,
  olx: ShoppingBag,
  sip: Phone,
  amocrm: Building2,
  bitrix24: Building2,
  google: FileSpreadsheet,
  github: GitBranch,
  oneC: Building2,
  customMcp: Webhook,
  vk: MessageCircle,
  headhunter: Building2,
};

export function IntegrationsGrid({
  agents = [],
  channels = [],
}: {
  agents?: { id: string; name: string }[];
  channels?: { id: string; type: string; isActive: boolean; botUsername: string | null }[];
}) {
  const t = useTranslations("integrations");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<IntegrationCategory | null>(null);

  const availableCategories = [...new Set(INTEGRATION_PROVIDERS.flatMap((provider) => provider.categories))];

  const filtered = INTEGRATION_PROVIDERS.filter((provider) => {
    const matchesCategory =
      !category || (provider.categories as readonly IntegrationCategory[]).includes(category);
    const matchesQuery = t(`providers.${provider.id}.name`)
      .toLowerCase()
      .includes(query.trim().toLowerCase());
    return matchesCategory && matchesQuery;
  });

  return (
    <div className="flex flex-col gap-4">
      <ListSearchInput placeholder={t("searchPlaceholder")} value={query} onChange={setQuery} />
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant={!category ? "default" : "outline"} onClick={() => setCategory(null)}>
          {t("categoryFilters.all")}
        </Button>
        {availableCategories.map((cat) => (
          <Button
            key={cat}
            size="sm"
            variant={category === cat ? "default" : "outline"}
            onClick={() => setCategory(cat)}
          >
            {t(`categories.${cat}`)}
          </Button>
        ))}
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((provider) => {
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
                    {provider.categories.map((cat) => (
                      <Badge key={cat} variant="outline" className="text-xs">
                        {t(`categories.${cat}`)}
                      </Badge>
                    ))}
                  </div>
                  {provider.id === "telegram" ? (
                    channels.find((c) => c.type === "telegram" && c.isActive) ? (
                      <Badge variant="default" className="h-8 rounded-md bg-green-500/15 text-green-700 hover:bg-green-500/15 dark:bg-green-500/20 dark:text-green-400">
                        {t("connected")}
                      </Badge>
                    ) : (
                      <TelegramConnectDialog agents={agents} />
                    )
                  ) : provider.id === "websiteWidget" ? (
                    channels.find((c) => c.type === "widget" && c.isActive) ? (
                      <Badge variant="default" className="h-8 rounded-md bg-green-500/15 text-green-700 hover:bg-green-500/15 dark:bg-green-500/20 dark:text-green-400">
                        {t("connected")}
                      </Badge>
                    ) : (
                      <WidgetConnectDialog agents={agents} />
                    )
                  ) : provider.id === "whatsapp" ? (
                    channels.find((c) => c.type === "whatsapp" && c.isActive) ? (
                      <Badge variant="default" className="h-8 rounded-md bg-green-500/15 text-green-700 hover:bg-green-500/15 dark:bg-green-500/20 dark:text-green-400">
                        {t("connected")}
                      </Badge>
                    ) : (
                      <WhatsappConnectDialog agents={agents} />
                    )
                  ) : provider.id === "olx" ? (
                    channels.find((c) => c.type === "olx" && c.isActive) ? (
                      <Badge variant="default" className="h-8 rounded-md bg-green-500/15 text-green-700 hover:bg-green-500/15 dark:bg-green-500/20 dark:text-green-400">
                        {t("connected")}
                      </Badge>
                    ) : (
                      <OlxConnectDialog agents={agents} />
                    )
                  ) : provider.id === "sip" ? (
                    <SipConnectDialog />
                  ) : provider.id === "amocrm" ? (
                    <ExternalCrmConnectDialog type="amocrm" />
                  ) : provider.id === "bitrix24" ? (
                    <ExternalCrmConnectDialog type="bitrix24" />
                  ) : provider.id === "google" ? (
                    <CalendarConnectDialog />
                  ) : provider.id === "customMcp" ? (
                    <McpConnectDialog />
                  ) : (
                    <Button size="sm" variant="outline" disabled>
                      {t("connect")}
                      <span className="ml-1 text-xs opacity-70">{t("comingSoon")}</span>
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
