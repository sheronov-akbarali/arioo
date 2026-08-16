"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
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
import { deleteOrganizationAction } from "@/app/[locale]/(dashboard)/settings/security/actions";

export function DeleteOrganizationDialog({
  locale,
  organizationName,
  disabled,
}: {
  locale: string;
  organizationName: string;
  disabled?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleDelete = () => {
    setError(null);
    startTransition(async () => {
      const res = await deleteOrganizationAction(locale, confirmText);
      if (!res.success) {
        setError(res.error || "O'chirishda xatolik yuz berdi");
        return;
      }
      router.push(`/${locale}/sign-in`);
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="destructive" disabled={disabled}>Tashkilotni O'chirish (Delete Data)</Button>} />
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle className="text-destructive">Tashkilotni butunlay o'chirish</DialogTitle>
          <DialogDescription>
            Bu amalni ortga qaytarib bo'lmaydi. Barcha AI xodimlar, suhbatlar, CRM ma'lumotlari va integratsiyalar
            butunlay o'chib ketadi. Tasdiqlash uchun tashkilot nomini kiriting: <strong>{organizationName}</strong>
          </DialogDescription>
        </DialogHeader>
        <div className="py-2 flex flex-col gap-2">
          <Label htmlFor="confirmName">Tashkilot nomi</Label>
          <Input id="confirmName" value={confirmText} onChange={(e) => setConfirmText(e.target.value)} placeholder={organizationName} />
          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            Bekor qilish
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={isPending || confirmText.trim() !== organizationName}
            onClick={handleDelete}
            className="gap-2"
          >
            <Trash2 className="size-4" />
            {isPending ? "O'chirilmoqda..." : "Ha, butunlay o'chirish"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
