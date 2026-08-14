import { getTranslations } from "next-intl/server";
import { LayoutGrid } from "lucide-react";
import { IntegrationsGrid } from "@/components/dashboard/integrations/integrations-grid";
import { db } from "@/db/client";
import { aiAgents } from "@/db/schema/agents";
import { channels } from "@/db/schema/channels";
import { eq } from "drizzle-orm";
import { requireOrganization } from "@/lib/auth/dal";

export default async function IntegrationsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const { organization } = await requireOrganization(locale);
  const t = await getTranslations("integrations");

  const agents = await db
    .select({ id: aiAgents.id, name: aiAgents.name })
    .from(aiAgents)
    .where(eq(aiAgents.organizationId, organization.id));

  const orgChannels = await db
    .select()
    .from(channels)
    .where(eq(channels.organizationId, organization.id));

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
      <IntegrationsGrid agents={agents} channels={orgChannels} />
    </div>
  );
}
