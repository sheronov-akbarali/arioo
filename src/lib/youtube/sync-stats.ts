import "server-only";
import { eq, and } from "drizzle-orm";
import { db } from "@/db/client";
import { integrations } from "@/db/schema/integrations";
import { encryptCredential, decryptCredential } from "@/lib/integrations/credential-crypto";
import { refreshAccessToken } from "@/lib/integrations/oauth/exchange";
import { getYoutubeChannelStats, type YoutubeCredentials, type YoutubeStatsResult } from "./channel-stats";

export type YoutubeCardData =
  | { connected: false }
  | { connected: true; integrationId: string; result: YoutubeStatsResult };

export async function syncYoutubeStats(organizationId: string): Promise<YoutubeCardData> {
  const [row] = await db
    .select()
    .from(integrations)
    .where(and(eq(integrations.organizationId, organizationId), eq(integrations.providerId, "youtube")));

  if (!row || row.status === "archived" || !row.credentialsEncrypted) {
    return { connected: false };
  }

  const credentials: YoutubeCredentials = JSON.parse(decryptCredential(row.credentialsEncrypted));
  const result = await getYoutubeChannelStats(credentials, (refreshToken) =>
    refreshAccessToken("youtube", refreshToken)
  );

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
