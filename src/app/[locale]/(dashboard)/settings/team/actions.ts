"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { invites, memberships } from "@/db/schema/org";
import { requireOrganization, verifySession } from "@/lib/auth/dal";
import { isInviteValid, parseInviteEmail } from "@/lib/auth/invites";

export async function inviteMemberAction(locale: string, formData: FormData): Promise<void> {
  const { user, organization, membership } = await requireOrganization(locale);
  // Only owner/admin may invite — this server-side check is what actually
  // enforces the restriction; the UI hiding the form is just a nicety.
  if (membership.role === "member") return;
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
  if (!invite || !isInviteValid(invite)) {
    redirect(`/${locale}/invite/${token}?error=invalid`);
  }

  // The invite was issued to a specific email; without this check anyone
  // who gets hold of the token URL (and is signed in with any account)
  // could join the organization it targets.
  if (!user.email || user.email !== invite.email) {
    redirect(`/${locale}/invite/${token}?error=email_mismatch`);
  }

  const [existingMembership] = await db
    .select({ id: memberships.id })
    .from(memberships)
    .where(
      and(
        eq(memberships.userId, user.id),
        eq(memberships.organizationId, invite.organizationId),
      ),
    );

  if (!existingMembership) {
    await db.insert(memberships).values({
      userId: user.id,
      organizationId: invite.organizationId,
      role: invite.role,
    });
  }
  await db.update(invites).set({ status: "accepted" }).where(eq(invites.id, invite.id));
  redirect(`/${locale}/dashboard`);
}
