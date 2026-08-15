import { eq, and, desc } from "drizzle-orm";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { db } from "@/db/client";
import { integrations, integrationEvents } from "@/db/schema/integrations";
import { requireOrganization } from "@/lib/auth/dal";
import { Link } from "@/i18n/navigation";
import { ArrowLeft } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { IntegrationDetailActions } from "@/components/dashboard/integrations/integration-detail-actions";
import { IntegrationLifecycleLog } from "@/components/dashboard/integrations/integration-lifecycle-log";

export default async function IntegrationDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  const { organization } = await requireOrganization(locale);
  const t = await getTranslations("integrations.detail");

  const [integration] = await db
    .select()
    .from(integrations)
    .where(and(eq(integrations.id, id), eq(integrations.organizationId, organization.id)));

  if (!integration) notFound();

  const events = await db
    .select()
    .from(integrationEvents)
    .where(eq(integrationEvents.integrationId, id))
    .orderBy(desc(integrationEvents.createdAt))
    .limit(50);

  return (
    <div className="flex flex-col gap-6">
      <Button size="sm" variant="ghost" className="w-fit gap-2" render={<Link href="/integrations" />}>
        <ArrowLeft className="size-4" /> {t("back")}
      </Button>

      <Card>
        <CardContent className="flex items-start justify-between gap-4 pt-6">
          <div>
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{t("profile")}</p>
            <h1 className="text-xl font-semibold">{integration.providerId}</h1>
          </div>
          <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium">
            {t(`status.${integration.status}`)}
          </span>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{t("lastVerified")}</p>
            <p className="mt-1 text-sm">
              {integration.lastVerifiedAt ? new Intl.DateTimeFormat(locale).format(integration.lastVerifiedAt) : "—"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{t("errors")}</p>
            <p className="mt-1 text-sm text-destructive">{integration.lastError ?? t("noErrors")}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{t("usedBy")}</p>
            <p className="mt-1 text-sm">{integration.agentId ?? "—"}</p>
          </CardContent>
        </Card>
      </div>

      <IntegrationLifecycleLog events={events} locale={locale} />

      <IntegrationDetailActions integrationId={integration.id} locale={locale} />
    </div>
  );
}
