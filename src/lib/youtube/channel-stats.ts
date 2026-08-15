import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { youtubeChannelConnections } from "@/db/schema/youtube-channel-connection";
import { decryptToken, encryptToken } from "@/lib/crypto/token-crypto";

export type YoutubeStatsResult =
  | {
      available: true;
      subscriberCount: number;
      viewCount: number;
      videoCount: number;
      channelTitle?: string;
      recentVideos: { id: string; title: string; views: number }[];
    }
  | {
      available: false;
      reason: "error" | "not_connected" | "quota_exceeded";
    };

export async function getValidAccessToken(connection: {
  id: string;
  accessTokenEncrypted: string;
  refreshTokenEncrypted: string;
  tokenExpiresAt: Date;
}): Promise<string> {
  const isExpired = connection.tokenExpiresAt.getTime() - Date.now() < 60000;
  if (!isExpired) {
    return decryptToken(connection.accessTokenEncrypted);
  }

  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID || process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET;
  const refreshToken = decryptToken(connection.refreshTokenEncrypted);

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error("Missing credentials for token refresh");
  }

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  if (!res.ok) {
    throw new Error(`Token refresh failed: ${res.status}`);
  }

  const data = await res.json();
  const newAccessToken = data.access_token;
  const expiresIn = data.expires_in ?? 3600;

  const accessTokenEncrypted = encryptToken(newAccessToken);
  const tokenExpiresAt = new Date(Date.now() + expiresIn * 1000);

  await db
    .update(youtubeChannelConnections)
    .set({
      accessTokenEncrypted,
      tokenExpiresAt,
      updatedAt: new Date(),
    })
    .where(eq(youtubeChannelConnections.id, connection.id));

  return newAccessToken;
}

export async function getYoutubeChannelStats(connection: {
  id: string;
  organizationId: string;
  channelId: string;
  accessTokenEncrypted: string;
  refreshTokenEncrypted: string;
  tokenExpiresAt: Date;
}): Promise<YoutubeStatsResult> {
  try {
    const accessToken = await getValidAccessToken(connection);

    // 1. Kanal statistikasi
    const channelRes = await fetch(
      "https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&mine=true",
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    if (!channelRes.ok) {
      if (channelRes.status === 403) {
        return { available: false, reason: "quota_exceeded" };
      }
      return { available: false, reason: "error" };
    }

    const channelData = await channelRes.json();
    const item = channelData.items?.[0];
    if (!item) {
      return { available: false, reason: "error" };
    }

    const subscriberCount = parseInt(item.statistics?.subscriberCount || "0", 10);
    const viewCount = parseInt(item.statistics?.viewCount || "0", 10);
    const videoCount = parseInt(item.statistics?.videoCount || "0", 10);
    const channelTitle = item.snippet?.title;

    // 2. So'nggi videolar
    const searchRes = await fetch(
      "https://www.googleapis.com/youtube/v3/search?part=snippet&forMine=true&type=video&order=date&maxResults=5",
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    let recentVideos: { id: string; title: string; views: number }[] = [];
    if (searchRes.ok) {
      const searchData = await searchRes.json();
      const videoIds = (searchData.items || [])
        .map((it: { id?: { videoId?: string } }) => it.id?.videoId)
        .filter(Boolean)
        .join(",");

      if (videoIds) {
        const videosRes = await fetch(
          `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics&id=${videoIds}`,
          {
            headers: { Authorization: `Bearer ${accessToken}` },
          }
        );

        if (videosRes.ok) {
          const videosData = await videosRes.json();
          recentVideos = (videosData.items || []).map(
            (v: { id: string; snippet?: { title?: string }; statistics?: { viewCount?: string } }) => ({
              id: v.id,
              title: v.snippet?.title || "Video",
              views: parseInt(v.statistics?.viewCount || "0", 10),
            })
          );
        }
      }
    }

    return {
      available: true,
      subscriberCount,
      viewCount,
      videoCount,
      channelTitle,
      recentVideos,
    };
  } catch (error) {
    console.error("Failed to get YouTube stats:", error);
    try {
      await db
        .update(youtubeChannelConnections)
        .set({ status: "error", lastError: String(error), updatedAt: new Date() })
        .where(eq(youtubeChannelConnections.id, connection.id));
    } catch {
      // ignore
    }
    return { available: false, reason: "error" };
  }
}
