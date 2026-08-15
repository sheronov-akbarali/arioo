"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

export function SiteAnalyticsSnippet({ trackingKey }: { trackingKey: string }) {
  const t = useTranslations("statistics.marketing.site");
  const [copied, setCopied] = useState(false);
  const origin = process.env.NEXT_PUBLIC_APP_URL ?? "";
  const snippet = `<script defer data-site="${trackingKey}" src="${origin}/api/site-analytics/t.js"></script>`;

  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm text-muted-foreground">{t("snippetHint")}</p>
      <pre className="overflow-x-auto rounded-lg border border-border bg-muted/40 p-3 text-xs">
        <code>{snippet}</code>
      </pre>
      <Button
        size="sm"
        variant="outline"
        className="w-fit"
        onClick={() => {
          navigator.clipboard.writeText(snippet);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        }}
      >
        {copied ? t("copied") : t("copySnippet")}
      </Button>
    </div>
  );
}
