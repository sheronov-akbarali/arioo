import { getTranslations } from "next-intl/server";
import { requireAgent } from "@/lib/auth/dal";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { AssistantTabs } from "@/components/dashboard/assistants/assistant-tabs";

export default async function AssistantDetailLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string; agentId: string }>;
}) {
  const { locale, agentId } = await params;
  const { agent } = await requireAgent(locale, agentId);
  const t = await getTranslations("assistants.detail");

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">{agent.name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("noChannelsConnected")}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" disabled>
            {t("connect")}
          </Button>
          <Button
            nativeButton={false}
            render={<Link href={`/assistants/${agent.id}/chat`}>{t("test")}</Link>}
          />
        </div>
      </div>
      <AssistantTabs agentId={agent.id} />
      {children}
    </div>
  );
}
