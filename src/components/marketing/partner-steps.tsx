import { useTranslations } from "next-intl";
import { Card, CardContent } from "@/components/ui/card";

export function PartnerSteps() {
  const t = useTranslations("partners.steps");
  const items = t.raw("items") as { title: string; description: string }[];

  return (
    <section className="mx-auto max-w-6xl px-6 py-16">
      <h2 className="max-w-2xl text-3xl font-bold tracking-tight">{t("title")}</h2>
      <div className="mt-10 grid gap-6 sm:grid-cols-2">
        {items.map((item, index) => (
          <Card key={item.title}>
            <CardContent className="pt-6">
              <span className="flex size-9 items-center justify-center rounded-full bg-brand/10 text-sm font-semibold text-brand">
                {index + 1}
              </span>
              <p className="mt-4 font-semibold text-foreground">{item.title}</p>
              <p className="mt-2 text-sm text-muted-foreground">{item.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
