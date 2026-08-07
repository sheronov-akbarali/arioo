import { getTranslations } from "next-intl/server";
import { Settings2, Table2, GitBranch, ChevronDown } from "lucide-react";

const TOOL_GROUPS = [
  { key: "internalSystem", icon: Settings2 },
  { key: "googleSheets", icon: Table2 },
  { key: "github", icon: GitBranch },
] as const;

export async function ToolsPanel() {
  const t = await getTranslations("assistants.detail.tools");
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border p-5">
      <div>
        <h2 className="font-medium">{t("title")}</h2>
        <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
      </div>
      <div className="flex flex-col divide-y divide-border rounded-lg border border-border">
        {TOOL_GROUPS.map(({ key, icon: Icon }) => (
          <div key={key} className="flex items-center gap-3 p-3 opacity-60">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
              <Icon className="size-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">{t(`groups.${key}`)}</p>
              <p className="truncate text-xs text-muted-foreground">{t(`descriptions.${key}`)}</p>
            </div>
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
              {t("comingSoon")}
            </span>
            <span
              aria-hidden
              className="h-5 w-9 shrink-0 rounded-full border border-border bg-muted"
            />
            <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
          </div>
        ))}
      </div>
    </div>
  );
}
