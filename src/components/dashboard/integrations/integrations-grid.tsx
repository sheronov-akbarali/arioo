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
import { INTEGRATION_PROVIDERS, type IntegrationCategory } from "@/lib/integrations-data";
import { ListSearchInput } from "@/components/dashboard/list-search-input";
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

export function IntegrationsGrid() {
  const t = useTranslations("integrations");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<IntegrationCategory | null>(null);

  const availableCategories = [...new Set(INTEGRATION_PROVIDERS.flatMap((provider) => provider.categories))];

  const filtered = INTEGRATION_PROVIDERS.filter((provider) => {
    const matchesCategory = !category || provider.categories.includes(category);
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
