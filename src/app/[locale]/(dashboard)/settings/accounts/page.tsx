import { eq } from "drizzle-orm";
import { getTranslations } from "next-intl/server";
import { db } from "@/db/client";
import { accounts } from "@/db/schema/auth";
import { verifySession } from "@/lib/auth/dal";
import { Button } from "@/components/ui/button";
import { TelegramLoginWidget } from "@/components/auth/telegram-login-widget";
import { unlinkAccountAction } from "./actions";

const ALL_PROVIDERS = ["google", "telegram", "github"] as const;

export default async function LinkedAccountsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const { user } = await verifySession(locale);
  const t = await getTranslations("settings.accounts");

  const linked = await db.select().from(accounts).where(eq(accounts.userId, user.id));
  const linkedProviders = new Set(linked.map((a) => a.provider));
  const canUnlink = linked.length > 1;

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold">{t("title")}</h1>
      <ul className="flex flex-col gap-3">
        {linked.map((account) => (
          <li
            key={`${account.provider}:${account.providerAccountId}`}
            className="flex items-center justify-between rounded-lg border p-4"
          >
            <span className="capitalize">{account.provider}</span>
            <form
              action={async () => {
                "use server";
                await unlinkAccountAction(locale, account.provider, account.providerAccountId);
              }}
            >
              <Button type="submit" variant="ghost" disabled={!canUnlink}>
                {t("unlink")}
              </Button>
            </form>
          </li>
        ))}
      </ul>
      <div className="flex flex-col gap-2">
        <h2 className="text-sm font-medium text-muted-foreground">{t("addProvider")}</h2>
        <div className="flex flex-wrap items-center gap-2">
          {ALL_PROVIDERS.filter((provider) => !linkedProviders.has(provider)).map((provider) =>
            provider === "telegram" ? (
              <TelegramLoginWidget
                key={provider}
                botUsername={process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME ?? ""}
                mode="link"
              />
            ) : (
              <Button
                key={provider}
                variant="outline"
                render={<a href={`/api/auth/${provider}/start?mode=link`} />}
              >
                {t(`link.${provider}`)}
              </Button>
            ),
          )}
        </div>
      </div>
    </div>
  );
}
