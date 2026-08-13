import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { agentChatSettings } from "@/db/schema/agent-chat-settings";
import { agentCallPolicy } from "@/db/schema/agent-call-policy";
import { agentKnowledgeSettings } from "@/db/schema/agent-knowledge-settings";

export async function getOrCreateChatSettings(agentId: string) {
  const [existing] = await db
    .select()
    .from(agentChatSettings)
    .where(eq(agentChatSettings.agentId, agentId));
  if (existing) return existing;
  const [created] = await db.insert(agentChatSettings).values({ agentId }).returning();
  return created!;
}

export async function getOrCreateCallPolicy(agentId: string) {
  const [existing] = await db
    .select()
    .from(agentCallPolicy)
    .where(eq(agentCallPolicy.agentId, agentId));
  if (existing) return existing;
  const [created] = await db.insert(agentCallPolicy).values({ agentId }).returning();
  return created!;
}

export async function getOrCreateKnowledgeSettings(agentId: string) {
  const [existing] = await db
    .select()
    .from(agentKnowledgeSettings)
    .where(eq(agentKnowledgeSettings.agentId, agentId));
  if (existing) return existing;
  const [created] = await db.insert(agentKnowledgeSettings).values({ agentId }).returning();
  return created!;
}
