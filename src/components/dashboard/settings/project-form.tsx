"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { INDUSTRIES } from "@/lib/org/schema";
import type { ProjectSettingsState } from "@/lib/org/project-settings-state";

const initialState: ProjectSettingsState = { status: "idle" };

export function ProjectForm({
  action,
  name,
  industry,
  canEdit,
}: {
  action: (prevState: ProjectSettingsState, formData: FormData) => Promise<ProjectSettingsState>;
  name: string;
  industry: string;
  canEdit: boolean;
}) {
  const t = useTranslations("settings.project");
  const tOnboarding = useTranslations("onboarding");
  const [state, formAction, isPending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="flex max-w-md flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="name">{tOnboarding("nameLabel")}</Label>
        <Input id="name" name="name" required minLength={2} maxLength={100} defaultValue={name} disabled={!canEdit} />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="industry">{tOnboarding("industryLabel")}</Label>
        <select
          id="industry"
          name="industry"
          required
          defaultValue={industry}
          disabled={!canEdit}
          className="rounded-md border border-input px-3 py-2"
        >
          {INDUSTRIES.map((option) => (
            <option key={option} value={option}>
              {tOnboarding(`industries.${option}`)}
            </option>
          ))}
        </select>
      </div>
      {canEdit && (
        <Button type="submit" disabled={isPending} className="w-fit">
          {isPending ? t("saving") : t("save")}
        </Button>
      )}
      {state.status === "success" && (
        <p role="status" className="text-sm text-brand">
          {t("saved")}
        </p>
      )}
      {state.status === "error" && (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {t("error")}
        </p>
      )}
      {!canEdit && <p className="text-sm text-muted-foreground">{t("readOnlyHint")}</p>}
    </form>
  );
}
