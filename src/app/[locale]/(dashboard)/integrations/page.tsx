import { getTranslations } from "next-intl/server";
import { LayoutGrid } from "lucide-react";
import { IntegrationsGrid } from "@/components/dashboard/integrations/integrations-grid";

export default async function IntegrationsPage() {
  const t = await getTranslations("integrations");

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand">
          <LayoutGrid className="size-5" />
        </span>
        <div>
          <h1 className="text-xl font-semibold">{t("title")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>
      </div>
      <IntegrationsGrid />
    </div>
  );
}
