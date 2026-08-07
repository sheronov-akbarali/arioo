import { eq } from "drizzle-orm";
import { getTranslations } from "next-intl/server";
import { db } from "@/db/client";
import { invites, organizations } from "@/db/schema/org";
import { getSession } from "@/lib/auth/dal";
import { isInviteValid } from "@/lib/auth/invites";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
// Reused from the team-settings action module rather than duplicated —
// invites are created/listed there and accepted here.
import { acceptInviteAction } from "../../../(dashboard)/settings/team/actions";

export default async function InvitePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; token: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { locale, token } = await params;
  const { error } = await searchParams;
  const t = await getTranslations("invite");
  const session = await getSession();

  if (!session) {
    return (
      <main className="flex min-h-svh flex-col items-center justify-center gap-6 px-4">
        <div className="flex flex-col items-center gap-2 text-center">
          <h1 className="text-2xl font-semibold">{t("title")}</h1>
          <p className="text-muted-foreground max-w-sm">{t("signInPrompt")}</p>
        </div>
        <div className="flex flex-col items-center gap-3">
          <Button
            size="lg"
            nativeButton={false}
            render={<Link href={`/sign-in?redirect_url=/${locale}/invite/${token}`} />}
          >
            {t("signInCta")}
          </Button>
        </div>
        <p className="text-muted-foreground max-w-sm text-center text-sm">
          {t("returnHint")}
        </p>
      </main>
    );
  }

  const [invite] = await db.select().from(invites).where(eq(invites.token, token));
  const invalid = !invite || !isInviteValid(invite);

  const errorCode = invalid ? "invalid" : error;

  if (errorCode) {
    return (
      <main className="flex min-h-svh flex-col items-center justify-center gap-4 px-4 text-center">
        <h1 className="text-2xl font-semibold">{t("title")}</h1>
        <p className="text-muted-foreground max-w-sm">
          {t(errorCode === "email_mismatch" ? "errorEmailMismatch" : "errorInvalid")}
        </p>
      </main>
    );
  }

  const [organization] = await db
    .select({ name: organizations.name })
    .from(organizations)
    .where(eq(organizations.id, invite!.organizationId));

  const action = acceptInviteAction.bind(null, locale, token);

  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-6 px-4 text-center">
      <div className="flex flex-col items-center gap-2">
        <h1 className="text-2xl font-semibold">{t("title")}</h1>
        <p className="text-muted-foreground max-w-sm">
          {t("orgPrompt", { orgName: organization?.name ?? "" })}
        </p>
      </div>
      <form action={action}>
        <Button type="submit" size="lg">
          {t("accept")}
        </Button>
      </form>
    </main>
  );
}
