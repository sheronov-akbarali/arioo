"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { submitConsultationAction, type ConsultationState } from "@/lib/consultation/actions";

const initialState: ConsultationState = { status: "idle" };

export function LeadForm() {
  const t = useTranslations("leadForm");
  const [state, formAction, isPending] = useActionState(submitConsultationAction, initialState);

  return (
    <section id="lead-form" className="mx-auto max-w-lg px-6 py-20">
      <div className="text-center">
        <h2 className="text-3xl font-bold tracking-tight">{t("title")}</h2>
        <p className="mt-4 text-muted-foreground">{t("subtitle")}</p>
      </div>

      {state.status === "success" ? (
        <p className="mt-8 rounded-lg border border-green-600/40 bg-green-600/10 p-4 text-center text-green-700 dark:text-green-400">
          {t("success")}
        </p>
      ) : (
        <form action={formAction} className="mt-8 space-y-4">
          <div>
            <Label htmlFor="name">{t("name")}</Label>
            <Input id="name" name="name" required minLength={2} maxLength={100} />
          </div>
          <div>
            <Label htmlFor="phone">{t("phone")}</Label>
            <Input id="phone" name="phone" placeholder="+998901234567" required />
          </div>
          {state.status === "error" && (
            <p className="text-sm text-red-600 dark:text-red-400">
              {state.message === "rateLimit" ? t("errorRateLimit") : t("errorValidation")}
            </p>
          )}
          <Button
            type="submit"
            disabled={isPending}
            className="w-full bg-brand text-brand-foreground hover:opacity-90"
          >
            {isPending ? t("submitPending") : t("submit")}
          </Button>
          <p className="text-center text-xs text-muted-foreground">{t("freeNote")}</p>
        </form>
      )}
    </section>
  );
}
