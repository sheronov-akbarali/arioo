import { desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db/client";
import { organizations } from "@/db/schema/org";
import { aiAgents } from "@/db/schema/agents";
import { crmDeals, crmContacts } from "@/db/schema/crm";
import { conversations, messages } from "@/db/schema/conversations";
import { organizationCredits } from "@/db/schema/billing";
import { TmaContainer, type TmaData } from "@/components/tma/tma-container";

export const dynamic = "force-dynamic";

export default async function TmaPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  // 1. Fetch first available or active organization
  const [org] = await db
    .select()
    .from(organizations)
    .orderBy(desc(organizations.createdAt))
    .limit(1);

  const orgId = org?.id || "demo-org";
  const orgName = org?.name || "Arioo Demo Biznes";

  // 2. Fetch credits, agents, deals, conversations
  const [credit, agents, rawDeals, rawConversations] = await Promise.all([
    org
      ? db
          .select()
          .from(organizationCredits)
          .where(eq(organizationCredits.organizationId, orgId))
          .limit(1)
          .then((rows) => rows[0])
      : null,
    org
      ? db
          .select()
          .from(aiAgents)
          .where(eq(aiAgents.organizationId, orgId))
      : [],
    org
      ? db
          .select({
            deal: crmDeals,
            contact: crmContacts,
          })
          .from(crmDeals)
          .leftJoin(crmContacts, eq(crmDeals.contactId, crmContacts.id))
          .where(eq(crmDeals.organizationId, orgId))
          .orderBy(desc(crmDeals.createdAt))
          .limit(15)
      : [],
    org
      ? db
          .select({
            conversation: conversations,
            agentName: aiAgents.name,
          })
          .from(conversations)
          .innerJoin(aiAgents, eq(conversations.agentId, aiAgents.id))
          .where(eq(aiAgents.organizationId, orgId))
          .orderBy(desc(conversations.startedAt))
          .limit(10)
      : [],
  ]);

  // Fetch last messages for conversations
  const convIds = rawConversations.map((r) => r.conversation.id);
  const lastMsgMap = new Map<string, string>();
  if (convIds.length > 0) {
    const allMsgs = await db
      .select({
        conversationId: messages.conversationId,
        content: messages.content,
      })
      .from(messages)
      .where(inArray(messages.conversationId, convIds))
      .orderBy(desc(messages.createdAt));

    for (const m of allMsgs) {
      if (!lastMsgMap.has(m.conversationId)) {
        lastMsgMap.set(m.conversationId, m.content);
      }
    }
  }

  const dtf = new Intl.DateTimeFormat("uz-UZ", {
    dateStyle: "short",
    timeStyle: "short",
  });

  const formattedDeals = rawDeals.map(({ deal, contact }) => ({
    id: deal.id,
    title: deal.title,
    value: deal.value,
    currency: deal.currency ?? "UZS",
    status: deal.status,
    contactName: contact?.name || null,
    createdAt: dtf.format(deal.createdAt),
  }));

  const formattedConversations = rawConversations.map((c) => ({
    id: c.conversation.id,
    agentName: c.agentName,
    channel: c.conversation.channel,
    sentiment: c.conversation.sentiment,
    lastMessage: lastMsgMap.get(c.conversation.id) || "Suhbat boshlandi",
    timestamp: dtf.format(c.conversation.startedAt),
  }));

  const tmaData: TmaData = {
    organizationName: orgName,
    creditBalance: credit?.balance ?? 50000,
    bonusBalance: credit?.bonusBalance ?? 5000,
    activeAgentsCount: agents.length || 1,
    totalDealsCount: formattedDeals.length,
    totalConversationsCount: formattedConversations.length,
    deals: formattedDeals,
    recentConversations: formattedConversations,
    locale,
  };

  return <TmaContainer data={tmaData} />;
}
