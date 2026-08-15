"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Building2 } from "lucide-react";
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
import { connectFormIntegrationAction } from "@/lib/integrations/form-actions";

export function OneCConnectDialog({ locale }: { locale: string }) {
  const t = useTranslations("integrations");
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await connectFormIntegrationAction({
        providerId: "oneC",
        publicConfig: { baseUrl: String(formData.get("baseUrl") ?? "") },
        secretConfig: {
          login: String(formData.get("login") ?? ""),
          password: String(formData.get("password") ?? ""),
        },
        locale,
      });
      if (result.success) setOpen(false);
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button size="sm" variant="outline" className="gap-2">
            {t("connect")} <Building2 className="size-3" />
          </Button>
        }
      />
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>1C ulanishi</DialogTitle>
            <DialogDescription>
              Mahsulot va narxlar ma'lumotlarini 1C bilan sinxronizatsiya qilish uchun ulanish ma'lumotlarini kiriting.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="baseUrl">Bazaviy URL</Label>
              <Input id="baseUrl" name="baseUrl" placeholder="https://erp.example.uz/ut" required />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="login">Foydalanuvchi nomi</Label>
              <Input id="login" name="login" required />
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
            <Button type="submit" disabled={isPending}>
              {isPending ? "Saqlanmoqda..." : "Saqlash va Ulash"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
