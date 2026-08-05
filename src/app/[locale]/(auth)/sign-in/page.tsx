import { getTranslations } from "next-intl/server";
import { ProviderButtons } from "@/components/auth/provider-buttons";
import { TelegramLoginWidget } from "@/components/auth/telegram-login-widget";

export default async function SignInPage() {
  const t = await getTranslations("auth.signIn");
  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-6 px-4">
      <div className="flex flex-col items-center gap-2 text-center">
        <h1 className="text-2xl font-semibold">{t("title")}</h1>
        <p className="text-muted-foreground">{t("subtitle")}</p>
      </div>
      <div className="flex flex-col items-center gap-3">
        <ProviderButtons />
        <TelegramLoginWidget
          botUsername={process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME ?? ""}
        />
      </div>
    </main>
  );
}
