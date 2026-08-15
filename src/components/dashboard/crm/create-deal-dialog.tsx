"use client";

import { useState, useTransition } from "react";
import { Plus } from "lucide-react";
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
import { createDealAction } from "@/app/[locale]/(dashboard)/crm/actions";

export type OptionItem = {
  id: string;
  name: string;
};

export function CreateDealDialog({
  locale,
  contacts,
  agents,
}: {
  locale: string;
  contacts: OptionItem[];
  agents: OptionItem[];
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await createDealAction(locale, null, formData);
      if (res?.error) {
        setError(res.error);
      } else {
        setOpen(false);
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button size="sm" className="gap-2">
            <Plus className="size-4" /> Bitim yaratish
          </Button>
        }
      />
      <DialogContent className="sm:max-w-[460px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Yangi CRM Bitim yaratish</DialogTitle>
            <DialogDescription>
              Mijoz yoki AI xodim orqali kelgan yangi savdo bitimini qo'shing.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="title">Bitim nomi</Label>
              <Input
                id="title"
                name="title"
                placeholder="Masalan: Premium obuna shartnomasi"
                required
                minLength={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-2">
                <Label htmlFor="value">Summasi</Label>
                <Input
                  id="value"
                  name="value"
                  type="number"
                  placeholder="5000000"
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="currency">Valyuta</Label>
                <select
                  id="currency"
                  name="currency"
                  defaultValue="UZS"
                  className="rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="UZS">UZS (So'm)</option>
                  <option value="USD">USD ($)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-2">
                <Label htmlFor="status">Bosqich</Label>
                <select
                  id="status"
                  name="status"
                  defaultValue="new"
                  className="rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="new">Yangi lid</option>
                  <option value="negotiating">Muzokara</option>
                  <option value="won">Muvaffaqiyatli</option>
                  <option value="lost">Bekor qilingan</option>
                </select>
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="agentId">AI Agent</Label>
                <select
                  id="agentId"
                  name="agentId"
                  className="rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">Biriktirilmagan</option>
                  {agents.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="contactId">Mavjud mijoz</Label>
              <select
                id="contactId"
                name="contactId"
                className="rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">(Yangi mijoz kiritish)</option>
                {contacts.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-2">
                <Label htmlFor="contactName">Yangi mijoz ismi</Label>
                <Input
                  id="contactName"
                  name="contactName"
                  placeholder="Ism Familiya"
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="contactPhone">Telefon raqami</Label>
                <Input
                  id="contactPhone"
                  name="contactPhone"
                  placeholder="+998901234567"
                />
              </div>
            </div>

            {error && (
              <p className="text-xs font-medium text-destructive">{error}</p>
            )}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Bekor qilish
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Saqlanmoqda..." : "Bitimni saqlash"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
