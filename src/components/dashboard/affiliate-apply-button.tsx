"use client";

import { useState, useTransition } from "react";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { applyForAffiliateProgramAction } from "@/app/[locale]/(dashboard)/affiliate-program/actions";

export function AffiliateApplyButton({ locale, alreadyApplied }: { locale: string; alreadyApplied: boolean }) {
  const [applied, setApplied] = useState(alreadyApplied);
  const [isPending, startTransition] = useTransition();

  if (applied) {
    return (
      <Button variant="outline" disabled className="gap-2">
        <Check className="size-4" /> Ariza yuborilgan
      </Button>
    );
  }

  return (
    <Button
      disabled={isPending}
      onClick={() => {
        startTransition(async () => {
          const res = await applyForAffiliateProgramAction(locale);
          if (res.success) setApplied(true);
        });
      }}
    >
      {isPending ? "Yuborilmoqda..." : "Ariza qoldirish"}
    </Button>
  );
}
