import { getTranslations } from "next-intl/server";
import { Badge } from "@/components/ui/badge";

const TOOL_GROUPS = ["internalSystem", "googleSheets", "github"] as const;

export async function ToolsPanel() {
  const t = await getTranslations("assistants.detail.tools");
  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-sm font-medium text-muted-foreground">{t("title")}</h2>
      <div className="flex flex-col gap-2">
        {TOOL_GROUPS.map((group) => (
          <div
            key={group}
            className="flex items-center justify-between rounded-lg border border-dashed p-3 opacity-60"
          >
            <span>{t(`groups.${group}`)}</span>
            <Badge variant="secondary">{t("comingSoon")}</Badge>
          </div>
        ))}
      </div>
    </div>
  );
}
