"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { invites, memberships } from "@/db/schema/org";
import { requireOrganization, verifySession } from "@/lib/auth/dal";
import { isInviteValid, parseInviteEmail } from "@/lib/auth/invites";

export async function inviteMemberAction(locale: string, formData: FormData): Promise<void> {
  const { user, organization } = await requireOrganization(locale);
  const parsed = parseInviteEmail(formData.get("email"));
  if (!parsed.success) return;

  await db.insert(invites).values({
    organizationId: organization.id,
    email: parsed.data,
    token: randomUUID(),
    role: "member",
    invitedByUserId: user.id,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  });
  // Sending the invite email is stubbed until Phase 2b picks a transactional
  // email provider alongside billing — logging keeps the invite operable
  // (the token can be shared manually) without blocking this phase on that choice.
  console.log(`Invite created for ${parsed.data} in org ${organization.id}`);
  revalidatePath(`/${locale}/settings/team`);
}

export async function acceptInviteAction(locale: string, token: string): Promise<void> {
  const { user } = await verifySession(locale);
  const [invite] = await db.select().from(invites).where(eq(invites.token, token));
  if (!invite || !isInviteValid(invite)) return;

  await db.insert(memberships).values({
    userId: user.id,
    organizationId: invite.organizationId,
    role: invite.role,
  });
  await db.update(invites).set({ status: "accepted" }).where(eq(invites.id, invite.id));
}
