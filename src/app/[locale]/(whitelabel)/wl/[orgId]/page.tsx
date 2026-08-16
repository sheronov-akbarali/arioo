import { eq, and } from "drizzle-orm";
import { notFound } from "next/navigation";
import { db } from "@/db/client";
import { organizations } from "@/db/schema/org";
import { channels } from "@/db/schema/channels";
import { aiAgents } from "@/db/schema/agents";

type WhitelabelConfig = { appName: string; logoUrl?: string; primaryColor: string; customDomain?: string };

export default async function WhitelabelLandingPage({
  params,
}: {
  params: Promise<{ orgId: string }>;
}) {
  const { orgId } = await params;

  const [organization] = await db.select().from(organizations).where(eq(organizations.id, orgId));
  if (!organization || !organization.whitelabel) notFound();

  let config: WhitelabelConfig;
  try {
    config = JSON.parse(organization.whitelabel);
  } catch {
    notFound();
  }

  const [widgetChannel] = await db
    .select({ id: channels.id, agentName: aiAgents.name })
    .from(channels)
    .innerJoin(aiAgents, eq(channels.agentId, aiAgents.id))
    .where(and(eq(channels.organizationId, orgId), eq(channels.type, "widget"), eq(channels.isActive, true)))
    .limit(1);

  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center gap-6 px-6 text-center"
      style={{ ["--brand" as string]: config.primaryColor }}
    >
      {config.logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={config.logoUrl} alt={config.appName} className="h-14 w-auto" />
      ) : (
        <h1 className="text-3xl font-bold" style={{ color: config.primaryColor }}>
          {config.appName}
        </h1>
      )}

      {widgetChannel ? (
        <>
          <p className="max-w-md text-muted-foreground">
            {config.appName} AI yordamchisi bilan bog'laning — pastdagi tugma orqali suhbatni boshlang.
          </p>
          <script src={`${process.env.NEXT_PUBLIC_APP_URL}/widget.js`} data-channel-id={widgetChannel.id} async />
        </>
      ) : (
        <p className="max-w-md text-muted-foreground">
          {config.appName} hozircha AI suhbat vidjetini sozlamagan.
        </p>
      )}
    </div>
  );
}
