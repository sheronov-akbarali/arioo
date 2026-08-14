import { useTranslations } from "next-intl";
import { countByStatus, STATUS_DASHBOARD_ORDER, type IntegrationStatus } from "@/lib/integrations/status";
import { Card, CardContent } from "@/components/ui/card";

const DOT_COLOR: Record<IntegrationStatus, string> = {
  active: "bg-green-500",
  need_attention: "bg-red-500",
  verifying: "bg-blue-500",
  setup_needed: "bg-amber-500",
  archived: "bg-muted-foreground",
};

export function IntegrationStatusDashboard({ rows }: { rows: { status: IntegrationStatus }[] }) {
  const t = useTranslations("integrations.statusDashboard");
  const counts = countByStatus(rows);

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {STATUS_DASHBOARD_ORDER.map((status) => (
        <Card key={status}>
          <CardContent className="flex flex-col gap-1 pt-6">
            <div className="flex items-center gap-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
              <span className={`size-1.5 rounded-full ${DOT_COLOR[status]}`} />
              {t(`labels.${status}`)}
            </div>
            <p className="text-2xl font-semibold">{counts[status]}</p>
            <p className="text-xs text-muted-foreground">{t(`hints.${status}`)}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
