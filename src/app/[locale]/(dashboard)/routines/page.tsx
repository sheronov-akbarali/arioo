import { desc, eq } from "drizzle-orm";
import { getTranslations } from "next-intl/server";
import { Repeat2 } from "lucide-react";
import { db } from "@/db/client";
import { routines, routineTriggerType, routineActionType } from "@/db/schema/routines";
import { aiAgents } from "@/db/schema/agents";
import { requireOrganization } from "@/lib/auth/dal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { createRoutineAction } from "./actions";
import { RoutinesList, type RoutineRow } from "@/components/dashboard/routines/routines-list";

export default async function RoutinesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const { organization } = await requireOrganization(locale);
  const t = await getTranslations("routines");
  const action = createRoutineAction.bind(null, locale);

  const [rows, agents] = await Promise.all([
    db
      .select()
      .from(routines)
      .where(eq(routines.organizationId, organization.id))
      .orderBy(desc(routines.createdAt)),
    db
      .select({ id: aiAgents.id, name: aiAgents.name })
      .from(aiAgents)
      .where(eq(aiAgents.organizationId, organization.id)),
  ]);

  const routineItems: RoutineRow[] = rows.map((r) => ({
    id: r.id,
    name: r.name,
    triggerType: t(`triggerTypes.${r.triggerType}`),
    resource: r.resource,
    status: r.status as "active" | "paused",
    createdAt: r.createdAt,
  }));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand">
          <Repeat2 className="size-5" />
        </span>
        <div>
          <h1 className="text-xl font-semibold">{t("title")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("subtitle")}</p>
          <Badge variant="outline" className="mt-3">
            Avtomatlashtirilgan Cron faol (/api/cron/routines)
          </Badge>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          <form action={action} className="grid gap-4 sm:grid-cols-3">
            <div className="flex flex-col gap-2">
              <Label htmlFor="name">{t("form.name")}</Label>
              <Input id="name" name="name" required minLength={2} maxLength={100} placeholder="Masalan: Kunlik hisobot" />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="triggerType">{t("form.trigger")}</Label>
              <select id="triggerType" name="triggerType" required className="rounded-md border border-input bg-background px-3 py-2 text-sm">
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

            <div className="flex flex-col gap-2 sm:col-span-3 border-t pt-4 mt-1">
              <Label htmlFor="actionType">Harakat turi</Label>
              <select id="actionType" name="actionType" required defaultValue="notify" className="rounded-md border border-input bg-background px-3 py-2 text-sm w-fit">
                {routineActionType.enumValues.map((value) => (
                  <option key={value} value={value}>
                    {value === "notify" ? "Bildirishnoma yuborish" : value === "webhook" ? "Webhook chaqirish" : "Suhbatni boshqa agentga uzatish"}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="notifyTitle">Bildirishnoma sarlavhasi</Label>
              <Input id="notifyTitle" name="notifyTitle" placeholder="Masalan: Yangi hodisa" />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="notifyBody">Bildirishnoma matni</Label>
              <Input id="notifyBody" name="notifyBody" placeholder="Xabar matni" />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="webhookUrl">Webhook URL</Label>
              <Input id="webhookUrl" name="webhookUrl" type="url" placeholder="https://..." />
            </div>
            <div className="flex flex-col gap-2 sm:col-span-3">
              <Label htmlFor="targetAgentId">Uzatiladigan AI xodim (faqat "uzatish" harakati uchun)</Label>
              <select id="targetAgentId" name="targetAgentId" className="rounded-md border border-input bg-background px-3 py-2 text-sm w-fit">
                <option value="">— tanlanmagan —</option>
                {agents.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </div>

            <Button type="submit" className="w-fit sm:col-span-3">
              {t("form.submit")}
            </Button>
          </form>
        </CardContent>
      </Card>

      {routineItems.length > 0 && (
        <p className="text-sm text-muted-foreground">{t("foundCount", { count: routineItems.length })}</p>
      )}

      {routineItems.length === 0 ? (
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
          <CardContent className="p-0">
            <RoutinesList locale={locale} routines={routineItems} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
