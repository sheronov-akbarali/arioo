import { getTranslations } from "next-intl/server";
import { LayoutGrid } from "lucide-react";
import { IntegrationsGrid } from "@/components/dashboard/integrations/integrations-grid";
import { OAuthResultToast } from "@/components/dashboard/integrations/oauth-result-toast";
import { isOAuthConfigured } from "@/lib/integrations/oauth/config";
import { db } from "@/db/client";
import { aiAgents } from "@/db/schema/agents";
import { channels } from "@/db/schema/channels";
import { integrations } from "@/db/schema/integrations";
import { telegramChannelConnections } from "@/db/schema/telegram-channel-connection";
import { eq } from "drizzle-orm";
import { requireOrganization } from "@/lib/auth/dal";

export default async function IntegrationsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ oauthSuccess?: string; oauthError?: string; provider?: string }>;
}) {
  const { locale } = await params;
  const { oauthSuccess, oauthError, provider } = await searchParams;
  const { organization } = await requireOrganization(locale);
  const t = await getTranslations("integrations");

  const oauthProviders = ["amocrm", "bitrix24", "google", "github", "headhunter"];
  const isOAuthConfiguredMap = Object.fromEntries(
    oauthProviders.map((p) => [p, isOAuthConfigured(p)])
  );

  const agents = await db
    .select({ id: aiAgents.id, name: aiAgents.name })
    .from(aiAgents)
    .where(eq(aiAgents.organizationId, organization.id));

  const orgChannels = await db
    .select()
    .from(channels)
    .where(eq(channels.organizationId, organization.id));

  const integrationRows = await db
    .select({
      id: integrations.id,
      providerId: integrations.providerId,
      status: integrations.status,
      connectionMode: integrations.connectionMode,
      lastError: integrations.lastError,
    })
    .from(integrations)
    .where(eq(integrations.organizationId, organization.id));

  const [telegramConnection] = await db
    .select({ status: telegramChannelConnections.status })
    .from(telegramChannelConnections)
    .where(eq(telegramChannelConnections.organizationId, organization.id));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand">
          <LayoutGrid className="size-5" />
        </span>
        <div>
          <h1 className="text-xl font-semibold">{t("title")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>
      </div>
      <OAuthResultToast success={oauthSuccess} error={oauthError} provider={provider} />
      <IntegrationsGrid
        agents={agents}
        channels={orgChannels}
        integrationRows={integrationRows}
        isOAuthConfigured={isOAuthConfiguredMap}
        locale={locale}
        mtprotoConnected={telegramConnection?.status === "connected"}
      />
    </div>
  );
}
