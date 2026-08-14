"use client";

import { useState, useActionState, useEffect } from "react";
import { CreditCard, CheckCircle2 } from "lucide-react";
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
import { requestPayoutAction } from "@/app/[locale]/(dashboard)/referral-program/actions";

export function PayoutDialog({
  locale,
  currentBalance = 0,
}: {
  locale: string;
  currentBalance: number;
}) {
  const [open, setOpen] = useState(false);
  const action = requestPayoutAction.bind(null, locale);
  const [state, formAction, pending] = useActionState(action, null);

  useEffect(() => {
    if (state?.success) {
      setTimeout(() => {
        setOpen(false);
      }, 1500);
    }
  }, [state]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button size="sm" className="mt-3 gap-2">
            <CreditCard className="size-3.5" /> Pulni yechish
          </Button>
        }
      />
      <DialogContent className="sm:max-w-[425px]">
        <form action={formAction}>
          <DialogHeader>
            <DialogTitle>Mablag'ni Yechish So'rovi</DialogTitle>
            <DialogDescription>
              Referral yoki Hamkorlik dasturidan yig'ilgan daromadingizni bank kartangizga yechib oling.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="amount">Yechish summasi (UZS)</Label>
              <Input
                id="amount"
                name="amount"
                type="number"
                min="50000"
                step="10000"
                defaultValue={Math.max(50000, currentBalance)}
                required
              />
              <p className="text-[11px] text-muted-foreground">Minimal yechish summasi: 50 000 UZS</p>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="cardNumber">Karta raqami (Uzcard / Humo / Visa)</Label>
              <Input
                id="cardNumber"
                name="cardNumber"
                placeholder="8600 0000 0000 0000"
                maxLength={19}
                required
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="cardHolder">Karta egasining Ism Familiyasi</Label>
              <Input
                id="cardHolder"
                name="cardHolder"
                placeholder="ISLOM KARIMOV"
                required
              />
            </div>

            {state?.error && (
              <p className="text-xs font-medium text-destructive">{state.error}</p>
            )}

            {state?.success && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 text-xs font-medium">
                <CheckCircle2 className="size-4" />
                So'rov qabul qilindi! Mablag' 24 soat ichida kartangizga o'tkaziladi.
              </div>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Bekor qilish
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Yuborilmoqda..." : "So'rovni yuborish"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
