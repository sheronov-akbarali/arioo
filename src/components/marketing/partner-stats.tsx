import { useTranslations } from "next-intl";
import { Card, CardContent } from "@/components/ui/card";

const STATS = ["discount", "referral", "launch", "levels"] as const;

export function PartnerStats() {
  const t = useTranslations("partners.stats");

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {STATS.map((stat) => (
        <Card key={stat}>
          <CardContent className="pt-6">
            <p className="text-3xl font-bold text-brand">{t(`${stat}.value`)}</p>
            <p className="mt-1 text-sm text-muted-foreground">{t(`${stat}.label`)}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
