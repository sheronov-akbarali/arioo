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
        <p
          role="alert"
          className="mt-8 rounded-lg border border-green-600/40 bg-green-600/10 p-4 text-center text-green-700 dark:text-green-400"
        >
          {t("success")}
        </p>
      ) : (
        <form
          action={formAction}
          // React only applies `defaultValue` on mount, and React 19 resets an
          // uncontrolled form once its action settles. Re-keying the form on the
          // echoed-back values remounts the inputs so the user's typing survives
          // a server-side validation error instead of being wiped.
          key={state.attempt ?? 0}
          className="mt-8 space-y-4"
        >
          <div>
            <Label htmlFor="name">{t("name")}</Label>
            <Input
              id="name"
              name="name"
              required
              minLength={2}
              maxLength={100}
              defaultValue={state.values?.name}
            />
          </div>
          <div>
            <Label htmlFor="phone">{t("phone")}</Label>
            <Input
              id="phone"
              name="phone"
              type="tel"
              pattern="\+998[0-9]{9}"
              placeholder="+998901234567"
              required
              defaultValue={state.values?.phone}
            />
          </div>
          {state.status === "error" && (
            <p role="alert" className="text-sm text-red-600 dark:text-red-400">
              {state.message === "rateLimit"
                ? t("errorRateLimit")
                : state.message === "invalidPhone"
                  ? t("errorPhone")
                  : t("errorValidation")}
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
