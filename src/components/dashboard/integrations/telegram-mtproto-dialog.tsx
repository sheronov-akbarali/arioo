"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { TelegramConnectForm } from "@/components/dashboard/statistics/telegram-connect-form";
import {
  startTelegramConnection,
  submitTelegramCode,
  submitTelegramPassword,
} from "@/lib/telegram/mtproto-actions";

export function TelegramMtprotoDialog({ locale, connected }: { locale: string; connected: boolean }) {
  const t = useTranslations("integrations.telegramChoice.mtproto");
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button size="sm" variant="outline" className="w-full justify-start">
            {connected ? t("manage") : t("connectButton")}
          </Button>
        }
      />
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{t("dialogTitle")}</DialogTitle>
        </DialogHeader>
        <TelegramConnectForm
          startAction={startTelegramConnection.bind(null, locale)}
          submitCodeAction={submitTelegramCode.bind(null, locale)}
          submitPasswordAction={submitTelegramPassword.bind(null, locale)}
        />
      </DialogContent>
    </Dialog>
  );
}
