import "server-only";

export type YoutubeCredentials = {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: string;
  channelId?: string;
  channelTitle?: string;
};

export type YoutubeVideoStat = { id: string; title: string; viewCount: number };

export type YoutubeStatsResult =
  | {
      available: true;
      channelTitle: string;
      subscriberCount: number;
      viewCount: number;
      videoCount: number;
      recentVideos: YoutubeVideoStat[];
      updatedCredentials: YoutubeCredentials;
    }
  | { available: false; reason: "quota_exceeded" | "reauth_required" | "unknown" };

type RefreshFn = (
  refreshToken: string
) => Promise<{ accessToken: string; refreshToken?: string; expiresAt?: string }>;

class YoutubeApiError extends Error {
  reason?: string;
  status?: number;
  constructor(message: string, reason?: string, status?: number) {
    super(message);
    this.reason = reason;
    this.status = status;
  }
}

async function youtubeApiFetch(
  accessToken: string,
  path: string,
  params: Record<string, string>
): Promise<Record<string, unknown>> {
  const url = new URL(`https://www.googleapis.com/youtube/v3/${path}`);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);

  const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as
      | { error?: { errors?: { reason?: string }[] } }
      | null;
    const reason = body?.error?.errors?.[0]?.reason;
    throw new YoutubeApiError(`YouTube API error ${res.status}`, reason, res.status);
  }
  return res.json();
}

export async function getYoutubeChannelStats(
  credentials: YoutubeCredentials,
  refresh: RefreshFn
): Promise<YoutubeStatsResult> {
  let creds = credentials;

  const EXPIRY_BUFFER_MS = 60_000;
  const isExpired = !creds.expiresAt || new Date(creds.expiresAt).getTime() - EXPIRY_BUFFER_MS < Date.now();
  if (isExpired) {
    if (!creds.refreshToken) return { available: false, reason: "reauth_required" };
    try {
      const refreshed = await refresh(creds.refreshToken);
      creds = {
        ...creds,
        accessToken: refreshed.accessToken,
        refreshToken: refreshed.refreshToken ?? creds.refreshToken,
        expiresAt: refreshed.expiresAt,
      };
    } catch {
      return { available: false, reason: "reauth_required" };
    }
  }

  try {
    if (!creds.channelId) {
      const mine = await youtubeApiFetch(creds.accessToken, "channels", { part: "snippet", mine: "true" });
      const channel = (mine.items as { id: string; snippet?: { title?: string } }[] | undefined)?.[0];
      if (!channel) return { available: false, reason: "unknown" };
      creds = { ...creds, channelId: channel.id, channelTitle: channel.snippet?.title ?? "" };
    }

    const channelId = creds.channelId;
    if (!channelId) return { available: false, reason: "unknown" };

    const statsData = await youtubeApiFetch(creds.accessToken, "channels", {
      part: "statistics",
      id: channelId,
    });
    const stats = (
      statsData.items as { statistics?: { subscriberCount?: string; viewCount?: string; videoCount?: string } }[] | undefined
    )?.[0]?.statistics;
    if (!stats) return { available: false, reason: "unknown" };

    const searchData = await youtubeApiFetch(creds.accessToken, "search", {
      part: "id",
      channelId,
      type: "video",
      order: "date",
      maxResults: "5",
    });
    const videoIds = ((searchData.items as { id?: { videoId?: string } }[] | undefined) ?? [])
      .map((item) => item.id?.videoId)
      .filter((id): id is string => Boolean(id));

    let recentVideos: YoutubeVideoStat[] = [];
    if (videoIds.length > 0) {
      const videosData = await youtubeApiFetch(creds.accessToken, "videos", {
        part: "snippet,statistics",
        id: videoIds.join(","),
      });
      recentVideos = (
        (videosData.items as
          | { id: string; snippet?: { title?: string }; statistics?: { viewCount?: string } }[]
          | undefined) ?? []
      ).map((item) => ({
        id: item.id,
        title: item.snippet?.title ?? "",
        viewCount: Number(item.statistics?.viewCount ?? 0),
      }));
    }

    return {
      available: true,
      channelTitle: creds.channelTitle ?? "",
      subscriberCount: Number(stats.subscriberCount ?? 0),
      viewCount: Number(stats.viewCount ?? 0),
      videoCount: Number(stats.videoCount ?? 0),
      recentVideos,
      updatedCredentials: creds,
    };
  } catch (error) {
    if (error instanceof YoutubeApiError && error.reason === "quotaExceeded") {
      return { available: false, reason: "quota_exceeded" };
    }
    if (error instanceof YoutubeApiError && error.status === 401) {
      return { available: false, reason: "reauth_required" };
    }
    return { available: false, reason: "unknown" };
  }
}
