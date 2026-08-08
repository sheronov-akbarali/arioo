import { desc, eq } from "drizzle-orm";
import { getTranslations } from "next-intl/server";
import { Repeat2 } from "lucide-react";
import { db } from "@/db/client";
import { routines, routineTriggerType } from "@/db/schema/routines";
import { requireOrganization } from "@/lib/auth/dal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { createRoutineAction } from "./actions";

export default async function RoutinesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const { organization } = await requireOrganization(locale);
  const t = await getTranslations("routines");
  const action = createRoutineAction.bind(null, locale);

  const rows = await db
    .select()
    .from(routines)
    .where(eq(routines.organizationId, organization.id))
    .orderBy(desc(routines.createdAt));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold">{t("title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("subtitle")}</p>
        <Badge variant="outline" className="mt-3">
          {t("engineNotice")}
        </Badge>
      </div>

      <Card>
        <CardContent className="pt-6">
          <form action={action} className="grid gap-4 sm:grid-cols-3">
            <div className="flex flex-col gap-2">
              <Label htmlFor="name">{t("form.name")}</Label>
              <Input id="name" name="name" required minLength={2} maxLength={100} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="triggerType">{t("form.trigger")}</Label>
              <select id="triggerType" name="triggerType" required className="rounded-md border border-input px-3 py-2">
                {routineTriggerType.enumValues.map((value) => (
                  <option key={value} value={value}>
                    {t(`triggerTypes.${value}`)}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="resource">{t("form.resource")}</Label>
              <Input id="resource" name="resource" required minLength={2} maxLength={100} placeholder={t("form.resourcePlaceholder")} />
            </div>
            <Button type="submit" className="w-fit sm:col-span-3">
              {t("form.submit")}
            </Button>
          </form>
        </CardContent>
      </Card>

      {rows.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border py-16 text-center">
          <span className="flex size-12 items-center justify-center rounded-full bg-brand/10 text-brand">
            <Repeat2 className="size-6" />
          </span>
          <div>
            <p className="font-medium">{t("empty")}</p>
            <p className="text-sm text-muted-foreground">{t("emptyHint")}</p>
          </div>
        </div>
      ) : (
        <Card className="p-0">
          <CardContent className="overflow-x-auto p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                  <th className="px-4 py-3 font-medium">{t("table.name")}</th>
                  <th className="px-4 py-3 font-medium">{t("table.trigger")}</th>
                  <th className="px-4 py-3 font-medium">{t("table.resource")}</th>
                  <th className="px-4 py-3 font-medium">{t("table.status")}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((routine) => (
                  <tr key={routine.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-3 font-medium">{routine.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{t(`triggerTypes.${routine.triggerType}`)}</td>
                    <td className="px-4 py-3 text-muted-foreground">{routine.resource}</td>
                    <td className="px-4 py-3">
                      <Badge variant="outline">{t(`status.${routine.status}`)}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
