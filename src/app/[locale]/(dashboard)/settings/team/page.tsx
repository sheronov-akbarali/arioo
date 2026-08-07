import { eq } from "drizzle-orm";
import { getTranslations } from "next-intl/server";
import { clerkClient } from "@clerk/nextjs/server";
import { db } from "@/db/client";
import { invites, memberships } from "@/db/schema/org";
import { requireOrganization } from "@/lib/auth/dal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { inviteMemberAction } from "./actions";

export default async function TeamPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const { organization, membership } = await requireOrganization(locale);
  const t = await getTranslations("settings.team");
  const action = inviteMemberAction.bind(null, locale);
  const canInvite = membership.role === "owner" || membership.role === "admin";

  const memberRows = await db
    .select({ userId: memberships.userId, role: memberships.role })
    .from(memberships)
    .where(eq(memberships.organizationId, organization.id));

  // Membership only stores the Clerk user id — profile data (name/email)
  // lives in Clerk, not a local table, so it's fetched from the Backend API.
  const client = await clerkClient();
  const { data: clerkUsers } =
    memberRows.length > 0
      ? await client.users.getUserList({ userId: memberRows.map((row) => row.userId) })
      : { data: [] };

  const members = memberRows.map((row) => {
    const clerkUser = clerkUsers.find((cu) => cu.id === row.userId);
    return {
      userId: row.userId,
      role: row.role,
      name: clerkUser?.fullName ?? clerkUser?.username ?? null,
      email: clerkUser?.primaryEmailAddress?.emailAddress ?? null,
    };
  });

  const pendingInvites = await db
    .select()
    .from(invites)
    .where(eq(invites.organizationId, organization.id));

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold">{t("title")}</h1>
      {canInvite && (
        <form action={action} className="flex gap-2">
          <Input name="email" type="email" placeholder={t("emailPlaceholder")} required />
          <Button type="submit">{t("invite")}</Button>
        </form>
      )}
      <ul className="flex flex-col gap-2">
        {members.map((member) => (
          <li key={member.userId} className="rounded-lg border p-3">
            {member.name ?? member.email ?? member.userId} — {member.role}
          </li>
        ))}
        {pendingInvites
          .filter((invite) => invite.status === "pending")
          .map((invite) => (
            <li key={invite.id} className="rounded-lg border border-dashed p-3 text-muted-foreground">
              {invite.email} — {t("pending")}
            </li>
          ))}
      </ul>
    </div>
  );
}
