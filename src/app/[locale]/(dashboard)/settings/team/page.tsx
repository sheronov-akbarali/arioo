import { eq } from "drizzle-orm";
import { getTranslations } from "next-intl/server";
import { db } from "@/db/client";
import { invites, memberships } from "@/db/schema/org";
import { users } from "@/db/schema/auth";
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

  const members = await db
    .select({ name: users.name, email: users.email, role: memberships.role })
    .from(memberships)
    .innerJoin(users, eq(memberships.userId, users.id))
    .where(eq(memberships.organizationId, organization.id));

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
          <li key={member.email} className="rounded-lg border p-3">
            {member.name ?? member.email} — {member.role}
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
