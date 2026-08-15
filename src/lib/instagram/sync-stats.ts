import "server-only";
import { eq, and } from "drizzle-orm";
import { db } from "@/db/client";
import { integrations } from "@/db/schema/integrations";
import { encryptCredential, decryptCredential } from "@/lib/integrations/credential-crypto";
import { exchangeLongLivedToken } from "@/lib/meta/token-exchange";
import { getInstagramChannelStats, type InstagramCredentials, type InstagramStatsResult } from "./channel-stats";

export type InstagramCardData =
  | { connected: false }
  | { connected: true; integrationId: string; result: InstagramStatsResult };

export async function syncInstagramStats(organizationId: string): Promise<InstagramCardData> {
  const [row] = await db
    .select()
    .from(integrations)
    .where(and(eq(integrations.organizationId, organizationId), eq(integrations.providerId, "instagram")));

  if (!row || row.status === "archived" || !row.credentialsEncrypted) {
    return { connected: false };
  }

  let credentials: InstagramCredentials;
  let result: InstagramStatsResult;
  try {
    credentials = JSON.parse(decryptCredential(row.credentialsEncrypted));
    result = await getInstagramChannelStats(credentials, (token) => exchangeLongLivedToken("instagram", token));
  } catch {
    return { connected: false };
  }

  if (result.available) {
    await db
      .update(integrations)
      .set({
        credentialsEncrypted: encryptCredential(JSON.stringify(result.updatedCredentials)),
        status: "active",
        lastVerifiedAt: new Date(),
        lastError: null,
        updatedAt: new Date(),
      })
      .where(eq(integrations.id, row.id));
  } else {
    await db
      .update(integrations)
      .set({ status: "need_attention", lastError: result.reason, updatedAt: new Date() })
      .where(eq(integrations.id, row.id));
  }

  return { connected: true, integrationId: row.id, result };
}
