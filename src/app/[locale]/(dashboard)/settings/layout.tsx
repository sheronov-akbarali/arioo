import { getTranslations } from "next-intl/server";
import { SettingsTabs } from "@/components/dashboard/settings/settings-tabs";

export default async function SettingsLayout({ children }: { children: React.ReactNode }) {
  const t = await getTranslations("settings");

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold">{t("title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("subtitle")}</p>
      </div>
      <SettingsTabs />
      {children}
    </div>
  );
}
