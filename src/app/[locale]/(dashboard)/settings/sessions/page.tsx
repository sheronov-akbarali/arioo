import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { getTranslations } from "next-intl/server";
import { db } from "@/db/client";
import { sessions } from "@/db/schema/auth";
import { verifySession } from "@/lib/auth/dal";
import { SESSION_COOKIE_NAME } from "@/lib/auth/cookies";
import { Button } from "@/components/ui/button";
import { revokeOtherSessionsAction, revokeSessionAction } from "./actions";

export default async function SessionsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const { user } = await verifySession(locale);
  const t = await getTranslations("settings.sessions");
  const currentToken = (await cookies()).get(SESSION_COOKIE_NAME)?.value;

  const rows = await db.select().from(sessions).where(eq(sessions.userId, user.id));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">{t("title")}</h1>
        <form
          action={async () => {
            "use server";
            await revokeOtherSessionsAction(locale);
          }}
        >
          <Button type="submit" variant="outline">
            {t("revokeOthers")}
          </Button>
        </form>
      </div>
      <ul className="flex flex-col gap-3">
        {rows.map((row) => (
          <li key={row.sessionToken} className="flex items-center justify-between rounded-lg border p-4">
            <div>
              <p className="font-medium">
                {row.userAgent ?? t("unknownDevice")}
                {row.sessionToken === currentToken ? ` — ${t("thisDevice")}` : ""}
              </p>
              <p className="text-muted-foreground text-sm">{row.ipAddress ?? "—"}</p>
            </div>
            {row.sessionToken !== currentToken && (
              <form
                action={async () => {
                  "use server";
                  await revokeSessionAction(locale, row.sessionToken);
                }}
              >
                <Button type="submit" variant="ghost">
                  {t("revoke")}
                </Button>
              </form>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
