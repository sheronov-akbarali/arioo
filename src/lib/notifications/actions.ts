"use server";

import { revalidatePath } from "next/cache";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { notifications } from "@/db/schema/notifications";
import { requireOrganization } from "@/lib/auth/dal";

export type NotificationItem = {
  id: string;
  type: "chat" | "lead" | "approval" | "ticket" | "system";
  title: string;
  body: string;
  link: string | null;
  isRead: boolean;
  createdAt: Date;
};

export async function getNotifications(locale: string): Promise<NotificationItem[]> {
  try {
    const { organization } = await requireOrganization(locale);
    const rows = await db
      .select()
      .from(notifications)
      .where(eq(notifications.organizationId, organization.id))
      .orderBy(desc(notifications.createdAt))
      .limit(30);

    return rows.map((r) => ({
      id: r.id,
      type: r.type,
      title: r.title,
      body: r.body,
      link: r.link,
      isRead: r.isRead,
      createdAt: r.createdAt,
    }));
  } catch {
    return [];
  }
}

export async function markNotificationAsRead(
  locale: string,
  notificationId: string
): Promise<void> {
  const { organization } = await requireOrganization(locale);
  await db
    .update(notifications)
    .set({ isRead: true })
    .where(
      and(
        eq(notifications.id, notificationId),
        eq(notifications.organizationId, organization.id)
      )
    );
  revalidatePath(`/${locale}/dashboard`);
}

export async function markAllNotificationsAsRead(locale: string): Promise<void> {
  const { organization } = await requireOrganization(locale);
  await db
    .update(notifications)
    .set({ isRead: true })
    .where(eq(notifications.organizationId, organization.id));
  revalidatePath(`/${locale}/dashboard`);
}

export async function createNotification(
  organizationId: string,
  data: {
    type: "chat" | "lead" | "approval" | "ticket" | "system";
    title: string;
    body: string;
    link?: string;
  }
): Promise<void> {
  try {
    await db.insert(notifications).values({
      organizationId,
      type: data.type,
      title: data.title,
      body: data.body,
      link: data.link || null,
      isRead: false,
    });
  } catch (error) {
    console.error("Failed to create notification:", error);
  }
}
