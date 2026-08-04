import { useTranslations } from "next-intl";
import { WorkZoneCard } from "./work-zone-card";

const ZONES = ["sales", "hr", "marketing", "systems"] as const;

export function WorkZonesSection() {
  const t = useTranslations("workZones");

  return (
    <section className="mx-auto max-w-6xl px-6 py-16">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="text-3xl font-bold tracking-tight">{t("title")}</h2>
        <p className="mt-4 text-muted-foreground">{t("subtitle")}</p>
      </div>
      <div className="mt-12 grid gap-6 sm:grid-cols-2">
        {ZONES.map((zone) => (
          <WorkZoneCard
            key={zone}
            title={t(`${zone}.title`)}
            description={t(`${zone}.description`)}
          />
        ))}
      </div>
    </section>
  );
}
