"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Send, Phone } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { TelegramConnectDialog } from "./telegram-connect-dialog";
import { TelegramMtprotoDialog } from "./telegram-mtproto-dialog";

export function TelegramChoiceDialog({
  agents,
  locale,
  botConnected,
  mtprotoConnected,
}: {
  agents: { id: string; name: string }[];
  locale: string;
  botConnected: boolean;
  mtprotoConnected: boolean;
}) {
  const t = useTranslations("integrations.telegramChoice");
  const [open, setOpen] = useState(false);

  const connectedCount = Number(botConnected) + Number(mtprotoConnected);
  const label = connectedCount > 0 ? `${connectedCount}/2 ${t("connected")}` : t("connect");

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button size="sm" variant="outline" className="gap-2">
            {label} <Send className="size-3" />
          </Button>
        }
      />
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>{t("subtitle")}</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <div className="rounded-lg border border-border p-4">
            <div className="mb-1 flex items-center gap-2 font-medium">
              <Send className="size-4" /> {t("bot.title")}
            </div>
            <p className="mb-3 text-sm text-muted-foreground">{t("bot.description")}</p>
            <TelegramConnectDialog agents={agents} />
          </div>
          <div className="rounded-lg border border-border p-4">
            <div className="mb-1 flex items-center gap-2 font-medium">
              <Phone className="size-4" /> {t("mtproto.title")}
            </div>
            <p className="mb-3 text-sm text-muted-foreground">{t("mtproto.description")}</p>
            <TelegramMtprotoDialog locale={locale} connected={mtprotoConnected} />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
