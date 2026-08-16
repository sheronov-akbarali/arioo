import "server-only";
import { eq, and } from "drizzle-orm";
import { db } from "@/db/client";
import { integrations } from "@/db/schema/integrations";
import { encryptCredential, decryptCredential } from "@/lib/integrations/credential-crypto";
import { refreshAccessToken } from "@/lib/integrations/oauth/exchange";

type GoogleCredentials = { accessToken: string; refreshToken?: string; expiresAt?: string };

export async function isGoogleCalendarConnected(organizationId: string): Promise<boolean> {
  const [row] = await db
    .select({ status: integrations.status })
    .from(integrations)
    .where(and(eq(integrations.organizationId, organizationId), eq(integrations.providerId, "google")));
  return !!row && row.status !== "archived";
}

async function getValidAccessToken(organizationId: string): Promise<string> {
  const [row] = await db
    .select()
    .from(integrations)
    .where(and(eq(integrations.organizationId, organizationId), eq(integrations.providerId, "google")));

  if (!row || !row.credentialsEncrypted) throw new Error("Google akkaunt ulanmagan");

  let credentials: GoogleCredentials = JSON.parse(decryptCredential(row.credentialsEncrypted));

  const isExpired = credentials.expiresAt && new Date(credentials.expiresAt).getTime() < Date.now() + 60_000;
  if (isExpired && credentials.refreshToken) {
    const refreshed = await refreshAccessToken("google", credentials.refreshToken);
    credentials = { accessToken: refreshed.accessToken, refreshToken: refreshed.refreshToken, expiresAt: refreshed.expiresAt };
    await db
      .update(integrations)
      .set({ credentialsEncrypted: encryptCredential(JSON.stringify(credentials)), updatedAt: new Date() })
      .where(eq(integrations.id, row.id));
  }

  return credentials.accessToken;
}

export async function createCalendarBooking(params: {
  organizationId: string;
  summary: string;
  description?: string;
  startISO: string;
  endISO: string;
  attendeeEmail?: string;
}): Promise<{ htmlLink: string; eventId: string }> {
  const accessToken = await getValidAccessToken(params.organizationId);

  const res = await fetch("https://www.googleapis.com/calendar/v3/calendars/primary/events", {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      summary: params.summary,
      description: params.description,
      start: { dateTime: params.startISO },
      end: { dateTime: params.endISO },
      attendees: params.attendeeEmail ? [{ email: params.attendeeEmail }] : undefined,
    }),
  });

  if (!res.ok) {
    const errorBody = await res.text();
    throw new Error(`Google Calendar bron qilishda xatolik: ${res.status} ${errorBody}`);
  }

  const data = await res.json();
  return { htmlLink: data.htmlLink, eventId: data.id };
}
