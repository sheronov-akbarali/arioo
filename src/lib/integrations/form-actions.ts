"use server";

import { eq, and } from "drizzle-orm";
import { db } from "@/db/client";
import { integrations, integrationEvents } from "@/db/schema/integrations";
import { requireOrganization } from "@/lib/auth/dal";
import { encryptCredential } from "@/lib/integrations/credential-crypto";
import { buildIntegrationCredentials } from "@/lib/integrations/credential-helpers";
import { revalidatePath } from "next/cache";

export async function connectFormIntegrationAction(input: {
  providerId: string;
  publicConfig: Record<string, string>;
  secretConfig: Record<string, string>;
  locale: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const { organization } = await requireOrganization(input.locale);

    const credentialsJson = buildIntegrationCredentials(input.secretConfig);
    const credentialsEncrypted = credentialsJson ? encryptCredential(credentialsJson) : null;

    const [existing] = await db
      .select({ id: integrations.id })
      .from(integrations)
      .where(and(eq(integrations.organizationId, organization.id), eq(integrations.providerId, input.providerId)));

    let integrationId: string;
    if (existing) {
      await db
        .update(integrations)
        .set({
          status: "active",
          config: input.publicConfig,
          credentialsEncrypted,
          lastVerifiedAt: new Date(),
          lastError: null,
          updatedAt: new Date(),
        })
        .where(eq(integrations.id, existing.id));
      integrationId = existing.id;
    } else {
      const [created] = await db
        .insert(integrations)
        .values({
          organizationId: organization.id,
          providerId: input.providerId,
          connectionMode: "form",
          status: "active",
          config: input.publicConfig,
          credentialsEncrypted,
          lastVerifiedAt: new Date(),
        })
        .returning({ id: integrations.id });
      integrationId = created.id;
    }

    await db.insert(integrationEvents).values({ integrationId, type: "created" });

    revalidatePath(`/${input.locale}/integrations`);
    return { success: true };
  } catch (error) {
    console.error(`Form integration connect failed for "${input.providerId}":`, error);
    return { success: false, error: "Kutilmagan xatolik yuz berdi" };
  }
}
