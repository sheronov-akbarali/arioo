import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { agentChatSettings } from "@/db/schema/agent-chat-settings";
import { agentCallPolicy } from "@/db/schema/agent-call-policy";
import { agentKnowledgeSettings } from "@/db/schema/agent-knowledge-settings";

export async function getOrCreateChatSettings(agentId: string) {
  const [created] = await db
    .insert(agentChatSettings)
    .values({ agentId })
    .onConflictDoNothing({ target: agentChatSettings.agentId })
    .returning();
  if (created) return created;
  const [existing] = await db
    .select()
    .from(agentChatSettings)
    .where(eq(agentChatSettings.agentId, agentId));
  return existing!;
}

export async function getOrCreateCallPolicy(agentId: string) {
  const [created] = await db
    .insert(agentCallPolicy)
    .values({ agentId })
    .onConflictDoNothing({ target: agentCallPolicy.agentId })
    .returning();
  if (created) return created;
  const [existing] = await db
    .select()
    .from(agentCallPolicy)
    .where(eq(agentCallPolicy.agentId, agentId));
  return existing!;
}

export async function getOrCreateKnowledgeSettings(agentId: string) {
  const [created] = await db
    .insert(agentKnowledgeSettings)
    .values({ agentId })
    .onConflictDoNothing({ target: agentKnowledgeSettings.agentId })
    .returning();
  if (created) return created;
  const [existing] = await db
    .select()
    .from(agentKnowledgeSettings)
    .where(eq(agentKnowledgeSettings.agentId, agentId));
  return existing!;
}
