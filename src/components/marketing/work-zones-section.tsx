import { useTranslations } from "next-intl";
import { ShoppingCart, Users, Megaphone, Workflow } from "lucide-react";
import { WorkZoneCard } from "./work-zone-card";

const ZONES = [
  { key: "sales", icon: ShoppingCart },
  { key: "hr", icon: Users },
  { key: "marketing", icon: Megaphone },
  { key: "systems", icon: Workflow },
] as const;

export function WorkZonesSection() {
  const t = useTranslations("workZones");

  return (
    <section id="how-it-works" className="mx-auto max-w-6xl px-6 py-16">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="text-3xl font-bold tracking-tight">{t("title")}</h2>
        <p className="mt-4 text-muted-foreground">{t("subtitle")}</p>
      </div>
      <div className="mt-12 grid gap-6 sm:grid-cols-2">
        {ZONES.map(({ key, icon }) => (
          <WorkZoneCard
            key={key}
            icon={icon}
            title={t(`${key}.title`)}
            description={t(`${key}.description`)}
          />
        ))}
      </div>
    </section>
  );
}
