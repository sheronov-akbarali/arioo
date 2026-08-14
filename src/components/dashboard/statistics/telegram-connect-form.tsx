"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { TelegramConnectState } from "@/lib/telegram/connect-state";

type BoundAction = (
  prevState: TelegramConnectState,
  formData: FormData,
) => Promise<TelegramConnectState>;

export function TelegramConnectForm({
  startAction,
  submitCodeAction,
  submitPasswordAction,
}: {
  startAction: BoundAction;
  submitCodeAction: BoundAction;
  submitPasswordAction: BoundAction;
}) {
  const t = useTranslations("statistics.marketing.telegram.connect");
  const [startState, startFormAction, startPending] = useActionState(startAction, { status: "idle" });
  const [codeState, codeFormAction, codePending] = useActionState(submitCodeAction, { status: "pending_code" });
  const [passwordState, passwordFormAction, passwordPending] = useActionState(submitPasswordAction, {
    status: "pending_password",
  });

  const step =
    passwordState.status === "connected" || codeState.status === "connected"
      ? "connected"
      : passwordState.status === "pending_password" || codeState.status === "pending_password"
        ? "password"
        : startState.status === "pending_code"
          ? "code"
          : "start";

  if (step === "connected") {
    return <p className="text-sm text-brand">{t("connected")}</p>;
  }

  if (step === "password") {
    return (
      <form action={passwordFormAction} className="flex max-w-sm flex-col gap-3">
        <div className="flex flex-col gap-2">
          <Label htmlFor="password">{t("passwordLabel")}</Label>
          <Input id="password" name="password" type="password" required />
        </div>
        {passwordState.status === "pending_password" && passwordState.error && (
          <p role="alert" className="text-sm text-red-600 dark:text-red-400">
            {t(`errors.${passwordState.error}`)}
          </p>
        )}
        <Button type="submit" disabled={passwordPending} className="w-fit">
          {passwordPending ? t("submitting") : t("confirm")}
        </Button>
      </form>
    );
  }

  if (step === "code") {
    return (
      <form action={codeFormAction} className="flex max-w-sm flex-col gap-3">
        <div className="flex flex-col gap-2">
          <Label htmlFor="code">{t("codeLabel")}</Label>
          <Input id="code" name="code" required />
        </div>
        {codeState.status === "pending_code" && codeState.error && (
          <p role="alert" className="text-sm text-red-600 dark:text-red-400">
            {t(`errors.${codeState.error}`)}
          </p>
        )}
        <Button type="submit" disabled={codePending} className="w-fit">
          {codePending ? t("submitting") : t("confirm")}
        </Button>
      </form>
    );
  }

  return (
    <form action={startFormAction} className="flex max-w-sm flex-col gap-3">
      <p className="text-xs text-muted-foreground">{t("riskWarning")}</p>
      <div className="flex flex-col gap-2">
        <Label htmlFor="phone">{t("phoneLabel")}</Label>
        <Input id="phone" name="phone" type="tel" placeholder="+998901234567" required />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="channelUsername">{t("channelLabel")}</Label>
        <Input id="channelUsername" name="channelUsername" placeholder="arioo_uz" required />
      </div>
      {startState.status === "idle" && startState.error && (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {t(`errors.${startState.error}`)}
        </p>
      )}
      <Button type="submit" disabled={startPending} className="w-fit">
        {startPending ? t("submitting") : t("start")}
      </Button>
    </form>
  );
}
