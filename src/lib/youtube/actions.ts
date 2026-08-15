"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db/client";
import { youtubeChannelConnections } from "@/db/schema/youtube-channel-connection";
import { requireOrganization } from "@/lib/auth/dal";

export async function disconnectYoutubeChannel(locale: string = "uz") {
  const { organization } = await requireOrganization(locale);

  await db
    .delete(youtubeChannelConnections)
    .where(eq(youtubeChannelConnections.organizationId, organization.id));

  revalidatePath(`/${locale}/statistics/marketing`);
}
