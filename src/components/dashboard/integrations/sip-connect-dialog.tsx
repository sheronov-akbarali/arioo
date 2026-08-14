"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Phone, Save } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function SipConnectDialog() {
  const t = useTranslations("integrations");
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    startTransition(async () => {
      // Mock SIP save
      await new Promise(resolve => setTimeout(resolve, 1000));
      setOpen(false);
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button size="sm" variant="outline" className="gap-2">
            {t("connect")} <Phone className="size-3" />
          </Button>
        }
      />
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>SIP Telefoniya ulanishi</DialogTitle>
            <DialogDescription>
              AI xodimingiz kiruvchi qo'ng'iroqlarga javob berishi va chiquvchi qo'ng'iroqlarni amalga oshirishi uchun SIP (IP-telefoniya) ma'lumotlarini kiriting.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="server">SIP Server / Domen</Label>
              <Input id="server" name="server" placeholder="sip.provider.uz" required />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="login">Login / Raqam</Label>
              <Input id="login" name="login" placeholder="998901234567" required />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="password">Parol</Label>
              <Input id="password" name="password" type="password" required />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Bekor qilish
            </Button>
            <Button type="submit" disabled={isPending} className="gap-2">
              <Save className="size-4" /> {isPending ? "Saqlanmoqda..." : "Ulash"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
