"use server";

import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/db/client";
import { integrations, integrationEvents } from "@/db/schema/integrations";
import { requireOrganization } from "@/lib/auth/dal";
import { testIntegrationConnection } from "./test-connection";

async function loadOwnedIntegration(integrationId: string, locale: string) {
  const { organization } = await requireOrganization(locale);
  const [row] = await db
    .select()
    .from(integrations)
    .where(and(eq(integrations.id, integrationId), eq(integrations.organizationId, organization.id)));
  if (!row) throw new Error("Integration not found");
  return row;
}

export async function testConnectionAction(
  integrationId: string,
  locale: string
): Promise<{ ok: boolean; error?: string }> {
  const row = await loadOwnedIntegration(integrationId, locale);
  const result = await testIntegrationConnection(row.providerId, {
    credentialsEncrypted: row.credentialsEncrypted,
    config: row.config,
    linkedChannelId: row.linkedChannelId,
  });

  await db
    .update(integrations)
    .set({
      status: result.ok ? "active" : "need_attention",
      lastVerifiedAt: result.ok ? new Date() : row.lastVerifiedAt,
      lastError: result.ok ? null : (result.error ?? "Noma'lum xato"),
      updatedAt: new Date(),
    })
    .where(eq(integrations.id, integrationId));

  await db.insert(integrationEvents).values({
    integrationId,
    type: result.ok ? "verified" : "error",
    message: result.ok ? "Manual test connection succeeded" : result.error,
  });

  revalidatePath(`/${locale}/integrations/${integrationId}`);
  return result;
}

export async function archiveIntegrationAction(integrationId: string, locale: string): Promise<void> {
  await loadOwnedIntegration(integrationId, locale);
  await db
    .update(integrations)
    .set({ status: "archived", updatedAt: new Date() })
    .where(eq(integrations.id, integrationId));
  await db.insert(integrationEvents).values({ integrationId, type: "archived" });
  revalidatePath(`/${locale}/integrations`);
  revalidatePath(`/${locale}/integrations/${integrationId}`);
  revalidatePath(`/${locale}/statistics/marketing`);
}

export async function deleteIntegrationAction(integrationId: string, locale: string): Promise<void> {
  await loadOwnedIntegration(integrationId, locale);
  await db.delete(integrations).where(eq(integrations.id, integrationId));
  revalidatePath(`/${locale}/integrations`);
  redirect(`/${locale}/integrations`);
}
