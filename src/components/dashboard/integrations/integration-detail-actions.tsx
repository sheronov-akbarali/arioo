"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  testConnectionAction,
  archiveIntegrationAction,
  deleteIntegrationAction,
} from "@/lib/integrations/detail-actions";

export function IntegrationDetailActions({
  integrationId,
  locale,
}: {
  integrationId: string;
  locale: string;
}) {
  const t = useTranslations("integrations.detail");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [testResult, setTestResult] = useState<{ ok: boolean; error?: string } | null>(null);

  const handleTest = () => {
    startTransition(async () => {
      const result = await testConnectionAction(integrationId, locale);
      setTestResult(result);
      router.refresh();
    });
  };

  const handleArchive = () => {
    startTransition(async () => {
      await archiveIntegrationAction(integrationId, locale);
      router.refresh();
    });
  };

  const handleDelete = () => {
    if (!confirm(t("deleteConfirm"))) return;
    startTransition(async () => {
      await deleteIntegrationAction(integrationId, locale);
    });
  };

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" variant="outline" onClick={handleTest} disabled={isPending}>
          {isPending ? t("testing") : t("testConnection")}
        </Button>
        <Button size="sm" variant="outline" onClick={handleArchive} disabled={isPending}>
          {t("archive")}
        </Button>
        {testResult && (
          <span
            className={`text-sm ${testResult.ok ? "text-green-600 dark:text-green-400" : "text-destructive"}`}
          >
            {testResult.ok ? "OK" : testResult.error}
          </span>
        )}
      </div>

      <Card className="border-destructive/40">
        <CardHeader>
          <CardTitle className="text-destructive">{t("dangerZone")}</CardTitle>
          <p className="text-sm text-muted-foreground">{t("dangerZoneDescription")}</p>
        </CardHeader>
        <CardContent>
          <Button size="sm" variant="destructive" onClick={handleDelete} disabled={isPending}>
            {t("delete")}
          </Button>
        </CardContent>
      </Card>
    </>
  );
}
