import { getTranslations } from "next-intl/server";
import { requireOrganization } from "@/lib/auth/dal";
import { Button } from "@/components/ui/button";

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const { organization } = await requireOrganization(locale);
  const t = await getTranslations("dashboard.home");

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
      <h1 className="text-2xl font-semibold">{t("title", { org: organization.name })}</h1>
      <p className="text-muted-foreground max-w-md">{t("subtitle")}</p>
      <Button disabled>{t("cta")}</Button>
    </div>
  );
}
