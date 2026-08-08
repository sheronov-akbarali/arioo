import { useTranslations } from "next-intl";
import { Flame, HandCoins, Rocket, TrendingUp } from "lucide-react";
import { WorkZoneCard } from "./work-zone-card";

const ICONS = [Flame, HandCoins, Rocket, TrendingUp] as const;

export function PartnerWhy() {
  const t = useTranslations("partners.why");
  const items = t.raw("items") as { title: string; description: string }[];

  return (
    <section className="mx-auto max-w-6xl px-6 py-16">
      <h2 className="max-w-2xl text-3xl font-bold tracking-tight">{t("title")}</h2>
      <div className="mt-10 grid gap-6 sm:grid-cols-2">
        {items.map((item, index) => (
          <WorkZoneCard
            key={item.title}
            icon={ICONS[index]}
            title={item.title}
            description={item.description}
          />
        ))}
      </div>
    </section>
  );
}
