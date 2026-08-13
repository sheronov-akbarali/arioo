import { eq } from "drizzle-orm";
import { getTranslations } from "next-intl/server";
import { db } from "@/db/client";
import { aiAgents } from "@/db/schema/agents";
import { requireOrganization } from "@/lib/auth/dal";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { AssistantsGrid } from "@/components/dashboard/assistants/assistants-grid";

export default async function AssistantsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const { organization } = await requireOrganization(locale);
  const t = await getTranslations("assistants");

  const agents = await db
    .select({
      id: aiAgents.id,
      name: aiAgents.name,
      role: aiAgents.role,
      status: aiAgents.status,
    })
    .from(aiAgents)
    .where(eq(aiAgents.organizationId, organization.id));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">{t("title")}</h1>
        <Button nativeButton={false} render={<Link href="/assistants/new">{t("create")}</Link>} />
      </div>
      {agents.length === 0 ? (
        <p className="text-muted-foreground">{t("empty")}</p>
      ) : (
        <AssistantsGrid agents={agents} />
      )}
    </div>
  );
}
