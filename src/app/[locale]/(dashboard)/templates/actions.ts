"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/db/client";
import { aiAgents } from "@/db/schema/agents";
import { knowledgeDocuments } from "@/db/schema/knowledge";
import { agentChatSettings } from "@/db/schema/agent-chat-settings";
import { agentCallPolicy } from "@/db/schema/agent-call-policy";
import { agentKnowledgeSettings } from "@/db/schema/agent-knowledge-settings";
import { requireOrganization } from "@/lib/auth/dal";
import { createNotification } from "@/lib/notifications/actions";

export async function installTemplateAction(
  locale: string,
  data: {
    name: string;
    role: "sales" | "support" | "hr" | "marketing";
    systemPrompt: string;
    sampleKnowledge?: string;
  }
) {
  const { organization } = await requireOrganization(locale);

  // 1. Create AI agent
  const [newAgent] = await db
    .insert(aiAgents)
    .values({
      organizationId: organization.id,
      name: data.name,
      role: data.role,
      systemPrompt: data.systemPrompt,
      model: "google/gemini-2.5-flash",
      status: "active",
    })
    .returning({ id: aiAgents.id });

  // 2. Create companion settings rows
  await Promise.all([
    db.insert(agentChatSettings).values({
      agentId: newAgent.id,
      greetingMessage: `Assalomu alaykum! Sizga qanday yordam bera olaman?`,
    }),
    db.insert(agentCallPolicy).values({
      agentId: newAgent.id,
    }),
    db.insert(agentKnowledgeSettings).values({
      agentId: newAgent.id,
    }),
  ]);

  // 3. If sample knowledge is provided, add it
  if (data.sampleKnowledge) {
    await db.insert(knowledgeDocuments).values({
      agentId: newAgent.id,
      filename: `${data.name} - Qo'llanma.txt`,
      mimeType: "text/plain",
      blobUrl: "inline://sample",
      status: "ready",
    });
  }

  // 4. Send notification
  await createNotification(organization.id, {
    type: "system",
    title: "Yangi AI Xodim o'rnatildi",
    body: `"${data.name}" shabloni asosida yangi assistent yaratildi va ishga tushirildi.`,
    link: `/${locale}/assistants/${newAgent.id}/ai`,
  });

  revalidatePath(`/${locale}/assistants`);
  revalidatePath(`/${locale}/dashboard`);
  redirect(`/${locale}/assistants/${newAgent.id}/ai`);
}
