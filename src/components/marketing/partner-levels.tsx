import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type Level = {
  name: string;
  discount: string;
  condition: string;
  support: string;
  referral: string;
};

export function PartnerLevels() {
  const t = useTranslations("partners.levels");
  const items = t.raw("items") as Level[];
  const topLevelIndex = items.length - 1;

  return (
    <section className="mx-auto max-w-6xl px-6 py-16">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="text-3xl font-bold tracking-tight">{t("title")}</h2>
        <p className="mt-4 text-muted-foreground">{t("subtitle")}</p>
      </div>
      <div className="mt-10 grid gap-6 sm:grid-cols-3">
        {items.map((level, index) => (
          <Card
            key={level.name}
            className={index === topLevelIndex ? "border-brand shadow-lg shadow-brand/10" : ""}
          >
            <CardHeader>
              {index === topLevelIndex && (
                <Badge className="mb-2 w-fit bg-brand text-brand-foreground">{level.discount}</Badge>
              )}
              <CardTitle>{level.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-brand">{level.discount}</p>
              <p className="text-xs text-muted-foreground">{t("discountLabel")}</p>
              <dl className="mt-4 space-y-3 text-sm">
                <div>
                  <dt className="text-xs text-muted-foreground">{t("conditionLabel")}</dt>
                  <dd className="mt-0.5">{level.condition}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">{t("supportLabel")}</dt>
                  <dd className="mt-0.5">{level.support}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">{t("referralLabel")}</dt>
                  <dd className="mt-0.5">{level.referral}</dd>
                </div>
              </dl>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
