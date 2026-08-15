"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { abTests } from "@/db/schema/ab-tests";
import { aiAgents } from "@/db/schema/agents";
import { requireOrganization } from "@/lib/auth/dal";
import { createNotification } from "@/lib/notifications/actions";

export async function createAbTestAction(
  locale: string,
  agentId: string,
  formData: FormData
) {
  const { organization } = await requireOrganization(locale);
  const name = (formData.get("name") as string) || "Prompt A/B Test";
  const variantAPrompt = formData.get("variantAPrompt") as string;
  const variantBPrompt = formData.get("variantBPrompt") as string;
  const trafficSplit = parseInt(formData.get("trafficSplit") as string) || 50;

  if (!variantAPrompt || !variantBPrompt) {
    throw new Error("Ikkala variant uchun ham prompt kiritilishi shart");
  }

  await db.insert(abTests).values({
    organizationId: organization.id,
    agentId,
    name,
    variantAPrompt,
    variantBPrompt,
    trafficSplit,
    status: "running",
  });

  await createNotification(organization.id, {
    type: "system",
    title: "A/B Test Boshlandi",
    body: `"${name}" sinovi ishga tushirildi. Suhbatlar ikki xil prompt o'rtasida taqsimlanadi.`,
    link: `/${locale}/assistants/${agentId}/ab-testing`,
  });

  revalidatePath(`/${locale}/assistants/${agentId}/ab-testing`);
}

export async function concludeAbTestAction(
  locale: string,
  agentId: string,
  testId: string,
  winnerVariant: "A" | "B"
) {
  const { organization } = await requireOrganization(locale);

  const [test] = await db
    .select()
    .from(abTests)
    .where(and(eq(abTests.id, testId), eq(abTests.organizationId, organization.id)));

  if (!test) return;

  const winningPrompt = winnerVariant === "A" ? test.variantAPrompt : test.variantBPrompt;

  // Update active agent prompt to the winner!
  await db
    .update(aiAgents)
    .set({ systemPrompt: winningPrompt })
    .where(and(eq(aiAgents.id, agentId), eq(aiAgents.organizationId, organization.id)));

  // Conclude the test
  await db
    .update(abTests)
    .set({
      status: "concluded",
      winnerVariant,
      endedAt: new Date(),
    })
    .where(eq(abTests.id, testId));

  await createNotification(organization.id, {
    type: "system",
    title: "A/B Test Yakunlandi",
    body: `Variant ${winnerVariant} g'olib deb topildi va agent tizim prompti yangilandi.`,
    link: `/${locale}/assistants/${agentId}/ai`,
  });

  revalidatePath(`/${locale}/assistants/${agentId}/ab-testing`);
  revalidatePath(`/${locale}/assistants/${agentId}/ai`);
}

export async function cancelAbTestAction(
  locale: string,
  agentId: string,
  testId: string
) {
  const { organization } = await requireOrganization(locale);

  await db
    .update(abTests)
    .set({
      status: "cancelled",
      endedAt: new Date(),
    })
    .where(and(eq(abTests.id, testId), eq(abTests.organizationId, organization.id)));

  revalidatePath(`/${locale}/assistants/${agentId}/ab-testing`);
}
