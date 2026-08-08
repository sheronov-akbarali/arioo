import { getTranslations } from "next-intl/server";
import { Handshake } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type Level = { name: string; discount: string; condition: string; support: string; referral: string };

export default async function AffiliateProgramPage() {
  const t = await getTranslations("affiliateProgram");
  const tLevels = await getTranslations("partners.levels");
  const levels = tLevels.raw("items") as Level[];
  const topLevelIndex = levels.length - 1;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold">{t("title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("subtitle")}</p>
      </div>

      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-4 pt-6">
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-lg bg-brand/10 text-brand">
              <Handshake className="size-5" />
            </span>
            <div>
              <p className="font-medium">{t("notPartnerYet")}</p>
              <p className="text-sm text-muted-foreground">{t("applyHint")}</p>
            </div>
          </div>
          <Button nativeButton={false} render={<Link href="/partners">{t("apply")}</Link>} />
        </CardContent>
      </Card>

      <div>
        <h2 className="text-lg font-medium">{tLevels("title")}</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          {levels.map((level, index) => (
            <Card key={level.name} className={index === topLevelIndex ? "border-brand" : ""}>
              <CardHeader>
                {index === topLevelIndex && (
                  <Badge className="mb-2 w-fit bg-brand text-brand-foreground">{level.discount}</Badge>
                )}
                <CardTitle>{level.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-brand">{level.discount}</p>
                <p className="text-xs text-muted-foreground">{tLevels("discountLabel")}</p>
                <dl className="mt-4 space-y-3 text-sm">
                  <div>
                    <dt className="text-xs text-muted-foreground">{tLevels("conditionLabel")}</dt>
                    <dd className="mt-0.5">{level.condition}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">{tLevels("supportLabel")}</dt>
                    <dd className="mt-0.5">{level.support}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">{tLevels("referralLabel")}</dt>
                    <dd className="mt-0.5">{level.referral}</dd>
                  </div>
                </dl>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
