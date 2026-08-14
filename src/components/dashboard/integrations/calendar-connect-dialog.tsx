"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Calendar, Save } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export function CalendarConnectDialog() {
  const t = useTranslations("integrations");
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    startTransition(async () => {
      // Mocked OAuth redirection call
      await new Promise(resolve => setTimeout(resolve, 1000));
      setOpen(false);
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button size="sm" variant="outline" className="gap-2">
            {t("connect")} <Calendar className="size-3" />
          </Button>
        }
      />
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Google Calendar ulanishi</DialogTitle>
            <DialogDescription>
              AI xodimingiz mijozlar bilan uchrashuvlarni bevosita sizning Google Calendar yoki Google Workspace hisobingizga avtomatik bron qila olishi uchun avtorizatsiya o'ting.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center justify-center py-8 gap-4">
            <div className="flex size-16 items-center justify-center rounded-full bg-blue-100 text-blue-600">
              <Calendar className="size-8" />
            </div>
            <p className="text-center text-sm text-muted-foreground">
              Tugmani bossangiz, Google OAuth sahifasiga yo'naltirilasiz. 
              Ulanishdan so'ng AI agent uchrashuvlarni bo'sh vaqtingizga moslab tayinlaydi.
            </p>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Bekor qilish
            </Button>
            <Button type="submit" disabled={isPending} className="gap-2">
              {isPending ? "Ulanmoqda..." : "Google orqali kirish"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
