import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function IntegrationLifecycleLog({
  events,
  locale,
}: {
  events: { id: string; type: string; message: string | null; createdAt: Date }[];
  locale: string;
}) {
  const t = useTranslations("integrations.detail");

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("lifecycleLog")}</CardTitle>
        <p className="text-sm text-muted-foreground">{t("lifecycleLogSubtitle")}</p>
      </CardHeader>
      <CardContent>
        {events.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("noEvents")}</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {events.map((event) => (
              <li
                key={event.id}
                className="flex items-start justify-between gap-4 border-b border-border pb-2 text-sm last:border-0"
              >
                <div>
                  <p className="font-medium">{t(`eventTypes.${event.type}`)}</p>
                  {event.message && <p className="text-muted-foreground">{event.message}</p>}
                </div>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {new Intl.DateTimeFormat(locale, { dateStyle: "short", timeStyle: "short" }).format(event.createdAt)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
