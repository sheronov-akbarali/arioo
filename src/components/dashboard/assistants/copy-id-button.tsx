"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Check, Copy } from "lucide-react";

export function CopyIdButton({ id }: { id: string }) {
  const t = useTranslations("assistants");
  const [copied, setCopied] = useState(false);
  const shortId = `${id.slice(0, 8)}...${id.slice(-4)}`;

  return (
    <button
      type="button"
      onClick={async () => {
        await navigator.clipboard.writeText(id);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className="mt-2 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
      aria-label={t("copyId")}
    >
      <span className="font-mono">{shortId}</span>
      {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
      {copied ? <span>{t("idCopied")}</span> : null}
    </button>
  );
}
