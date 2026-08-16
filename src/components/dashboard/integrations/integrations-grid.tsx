"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import {
  Send,
  MessageCircle,
  Globe,
  Phone,
  Building2,
  FileSpreadsheet,
  GitBranch,
  Webhook,
} from "lucide-react";
import {
  INTEGRATION_PROVIDERS,
  type ConnectionMode,
  type IntegrationCategory,
  type ProviderConfig,
} from "@/lib/integrations/providers";
import { ListSearchInput } from "@/components/dashboard/list-search-input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TelegramChoiceDialog } from "./telegram-choice-dialog";
import { WidgetConnectDialog } from "./widget-connect-dialog";
import { WhatsappConnectDialog } from "./whatsapp-connect-dialog";
import { OAuthConnectButton } from "./oauth-connect-button";
import { OneCConnectDialog } from "./onec-connect-dialog";
import { McpConnectDialog } from "./mcp-connect-dialog";
import { SipConnectDialog } from "./sip-connect-dialog";
import { IntegrationStatusDashboard } from "./integration-status-dashboard";
import { IntegrationFilters } from "./integration-filters";
import { countByStatus, type IntegrationStatus } from "@/lib/integrations/status";

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  telegram: Send,
  whatsapp: MessageCircle,
  websiteWidget: Globe,
  sip: Phone,
  amocrm: Building2,
  bitrix24: Building2,
  google: FileSpreadsheet,
  github: GitBranch,
  oneC: Building2,
  customMcp: Webhook,
  headhunter: Building2,
};

export function IntegrationsGrid({
  agents = [],
  channels = [],
  integrationRows = [],
  isOAuthConfigured = {},
  locale,
  mtprotoConnected = false,
}: {
  agents?: { id: string; name: string }[];
  channels?: { id: string; type: string; isActive: boolean; botUsername: string | null; agentId: string | null }[];
  integrationRows?: {
    id: string;
    providerId: string;
    status: IntegrationStatus;
    connectionMode?: ConnectionMode;
    lastError: string | null;
  }[];
  isOAuthConfigured?: Record<string, boolean>;
  locale: string;
  mtprotoConnected?: boolean;
}) {
  const t = useTranslations("integrations");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<IntegrationCategory | null>(null);
  const [statusFilter, setStatusFilter] = useState<IntegrationStatus | "all">("all");

  const availableCategories = [...new Set(INTEGRATION_PROVIDERS.flatMap((provider) => provider.categories))];

  const integrationByProvider = new Map(integrationRows.map((row) => [row.providerId, row]));

  const CHANNEL_TYPE_BY_PROVIDER: Record<string, string> = {
    telegram: "telegram",
    whatsapp: "whatsapp",
    websiteWidget: "widget",
  };

  function hasActiveChannel(providerId: string): boolean {
    const channelType = CHANNEL_TYPE_BY_PROVIDER[providerId];
    if (!channelType) return false;
    return channels.some((c) => c.type === channelType && c.isActive);
  }

  function activeChannelFor(providerId: string) {
    const channelType = CHANNEL_TYPE_BY_PROVIDER[providerId];
    if (!channelType) return undefined;
    return channels.find((c) => c.type === channelType && c.isActive);
  }

  function statusFor(providerId: string): IntegrationStatus {
    if (integrationByProvider.has(providerId)) return integrationByProvider.get(providerId)!.status;
    return hasActiveChannel(providerId) ? "active" : "setup_needed";
  }

  const providerStatuses = INTEGRATION_PROVIDERS.map((provider) => ({ status: statusFor(provider.id) }));

  const filtered = INTEGRATION_PROVIDERS.filter((provider) => {
    const matchesCategory =
      !category || (provider.categories as readonly IntegrationCategory[]).includes(category);
    const matchesQuery = t(`providers.${provider.id}.name`)
      .toLowerCase()
      .includes(query.trim().toLowerCase());
    const matchesStatus = statusFilter === "all" || statusFor(provider.id) === statusFilter;
    return matchesCategory && matchesQuery && matchesStatus;
  });

  function renderProviderCard(provider: ProviderConfig) {
    const Icon = ICONS[provider.id] ?? Building2;
    const isConnected = integrationByProvider.has(provider.id);
    const connectedRow = integrationByProvider.get(provider.id);
    const connectedChannel = activeChannelFor(provider.id);

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
              <TelegramChoiceDialog
                agents={agents}
                locale={locale}
                botConnected={channels.some((c) => c.type === "telegram" && c.isActive)}
                mtprotoConnected={mtprotoConnected}
              />
            ) : provider.id === "websiteWidget" ? (
              channels.find((c) => c.type === "widget" && c.isActive) ? (
                <Badge
                  variant="default"
                  className="h-8 rounded-md bg-green-500/15 text-green-700 hover:bg-green-500/15 dark:bg-green-500/20 dark:text-green-400"
                >
                  {t("connected")}
                </Badge>
              ) : (
                <WidgetConnectDialog agents={agents} />
              )
            ) : provider.id === "whatsapp" ? (
              channels.find((c) => c.type === "whatsapp" && c.isActive) ? (
                <Badge
                  variant="default"
                  className="h-8 rounded-md bg-green-500/15 text-green-700 hover:bg-green-500/15 dark:bg-green-500/20 dark:text-green-400"
                >
                  {t("connected")}
                </Badge>
              ) : (
                <WhatsappConnectDialog agents={agents} />
              )
            ) : provider.id === "sip" ? (
              <SipConnectDialog locale={locale} />
            ) : provider.id === "oneC" ? (
              <OneCConnectDialog locale={locale} />
            ) : provider.id === "customMcp" ? (
              <McpConnectDialog locale={locale} />
            ) : provider.connectionMode === "oauth" ? (
              <OAuthConnectButton
                provider={provider.id}
                configured={isOAuthConfigured[provider.id] ?? false}
                locale={locale}
              />
            ) : (
              <OAuthConnectButton
                provider={provider.id}
                configured={isOAuthConfigured[provider.id] ?? false}
                locale={locale}
              />
            )}
          </div>
          {isConnected && connectedRow && (
            <div className="pt-1">
              <Link
                href={`/integrations/${connectedRow.id}`}
                className="text-xs text-muted-foreground underline-offset-2 hover:underline"
              >
                {t("manage")}
              </Link>
            </div>
          )}
          {!connectedRow && connectedChannel?.agentId && (
            <div className="pt-1">
              <Link
                href={`/assistants/${connectedChannel.agentId}/chats`}
                className="text-xs text-muted-foreground underline-offset-2 hover:underline"
              >
                {t("manage")}
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  const connected = filtered.filter((p) => integrationByProvider.has(p.id) || hasActiveChannel(p.id));
  const discoverable = filtered.filter((p) => !integrationByProvider.has(p.id) && !hasActiveChannel(p.id));

  return (
    <div className="flex flex-col gap-6">
      <IntegrationStatusDashboard rows={providerStatuses} />
      <ListSearchInput placeholder={t("searchPlaceholder")} value={query} onChange={setQuery} />
      <IntegrationFilters
        statusCounts={countByStatus(providerStatuses)}
        totalCount={INTEGRATION_PROVIDERS.length}
        selectedStatus={statusFilter}
        onStatusChange={setStatusFilter}
        categories={availableCategories}
        selectedCategory={category}
        onCategoryChange={setCategory}
      />
      {connected.length > 0 && (
        <div className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold text-muted-foreground">
            {t("yourIntegrations")} · {connected.length}
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {connected.map((provider) => renderProviderCard(provider))}
          </div>
        </div>
      )}
      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-muted-foreground">
          {t("discoverMore")} · {discoverable.length}
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {discoverable.map((provider) => renderProviderCard(provider))}
        </div>
      </div>
    </div>
  );
}
