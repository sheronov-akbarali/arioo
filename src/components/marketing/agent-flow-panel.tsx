import { useTranslations } from "next-intl";
import { Globe, Send, ShoppingBag, Database, BookOpen, Bot } from "lucide-react";

const SOURCE_ICONS = [Globe, Send, ShoppingBag] as const;
const SYSTEM_ICONS = [Database, BookOpen] as const;

function Node({
  icon: Icon,
  label,
  sublabel,
  emphasis,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  sublabel: string;
  emphasis?: boolean;
}) {
  return (
    <div
      className={
        emphasis
          ? "flex items-center gap-3 rounded-xl border border-brand/40 bg-brand/10 p-3 shadow-[0_0_24px_-8px_var(--brand)]"
          : "flex items-center gap-3 rounded-xl border border-border bg-card p-3"
      }
    >
      <span
        className={
          emphasis
            ? "flex size-8 shrink-0 items-center justify-center rounded-lg bg-brand text-brand-foreground"
            : "flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground"
        }
      >
        <Icon className="size-4" />
      </span>
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">{label}</p>
        <p className="truncate text-xs text-muted-foreground">{sublabel}</p>
      </div>
    </div>
  );
}

export function AgentFlowPanel() {
  const t = useTranslations("hero.diagram");
  const sourceKeys = ["website", "telegram", "olx"] as const;
  const systemKeys = ["crm", "knowledge"] as const;

  return (
    <div className="rounded-2xl border border-border bg-card/50 p-6">
      <p className="mb-4 text-xs font-medium tracking-wide text-muted-foreground uppercase">
        {t("sources")}
      </p>
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
        <div className="flex flex-col gap-3">
          {sourceKeys.map((key, i) => {
            const Icon = SOURCE_ICONS[i]!;
            return <Node key={key} icon={Icon} label={t(`${key}.label`)} sublabel={t(`${key}.sublabel`)} />;
          })}
        </div>

        <div aria-hidden className="flex h-full flex-col items-center justify-center gap-1 px-1">
          <span className="h-8 w-px border-l border-dashed border-brand/50" />
          <span className="h-8 w-px border-l border-dashed border-brand/50" />
          <span className="h-8 w-px border-l border-dashed border-brand/50" />
        </div>

        <div className="flex flex-col gap-3">
          {systemKeys.map((key, i) => {
            const Icon = SYSTEM_ICONS[i]!;
            return <Node key={key} icon={Icon} label={t(`${key}.label`)} sublabel={t(`${key}.sublabel`)} />;
          })}
        </div>
      </div>

      <div className="mt-4">
        <Node icon={Bot} label={t("agent.label")} sublabel={t("agent.sublabel")} emphasis />
      </div>
    </div>
  );
}
