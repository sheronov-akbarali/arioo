"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Building2, Save } from "lucide-react";
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

export function ExternalCrmConnectDialog({
  type,
}: {
  type: "amocrm" | "bitrix24";
}) {
  const t = useTranslations("integrations");
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const title = type === "amocrm" ? "amoCRM ulanishi" : "Bitrix24 ulanishi";

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    startTransition(async () => {
      // Mocked server action call
      await new Promise(resolve => setTimeout(resolve, 1000));
      setOpen(false);
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
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>
              Tizimdagi lidlar va chatlarni {type === "amocrm" ? "amoCRM" : "Bitrix24"} bilan sinxronizatsiya qilish uchun API kalitlarini kiriting.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="domain">Domen URL</Label>
              <Input
                id="domain"
                name="domain"
                placeholder={`https://mycompany.${type === "amocrm" ? "amocrm.ru" : "bitrix24.com"}`}
                required
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="apiKey">API / Webhook Key</Label>
              <Input
                id="apiKey"
                name="apiKey"
                placeholder="Ochiq API kalitingiz..."
                required
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Bekor qilish
            </Button>
            <Button type="submit" disabled={isPending} className="gap-2">
              <Save className="size-4" /> {isPending ? "Saqlanmoqda..." : "Saqlash va Ulash"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
