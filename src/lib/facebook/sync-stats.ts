import "server-only";
import { eq, and } from "drizzle-orm";
import { db } from "@/db/client";
import { integrations } from "@/db/schema/integrations";
import { encryptCredential, decryptCredential } from "@/lib/integrations/credential-crypto";
import { exchangeLongLivedToken } from "@/lib/meta/token-exchange";
import { getFacebookPageStats, type FacebookCredentials, type FacebookStatsResult } from "./channel-stats";

export type FacebookCardData =
  | { connected: false }
  | { connected: true; integrationId: string; result: FacebookStatsResult };

export async function syncFacebookStats(organizationId: string): Promise<FacebookCardData> {
  const [row] = await db
    .select()
    .from(integrations)
    .where(and(eq(integrations.organizationId, organizationId), eq(integrations.providerId, "facebook")));

  if (!row || row.status === "archived" || !row.credentialsEncrypted) {
    return { connected: false };
  }

  let credentials: FacebookCredentials;
  let result: FacebookStatsResult;
  try {
    credentials = JSON.parse(decryptCredential(row.credentialsEncrypted));
    result = await getFacebookPageStats(credentials, (token) => exchangeLongLivedToken("facebook", token));
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
