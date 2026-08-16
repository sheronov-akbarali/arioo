"use client";

import { useState, useTransition } from "react";
import { useParams } from "next/navigation";
import { Wallet, CheckCircle2, Sparkles, ExternalLink } from "lucide-react";
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { initiateTopUpAction } from "@/app/[locale]/(dashboard)/billing/actions";

export function TopUpDialog({ allowTestTopUp = false }: { allowTestTopUp?: boolean }) {
  const params = useParams();
  const locale = (params?.locale as string) || "uz";

  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [method, setMethod] = useState<"payme" | "click" | "test">(allowTestTopUp ? "test" : "payme");
  const [amount, setAmount] = useState("100000");
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");

    startTransition(async () => {
      const numAmount = Number(amount);
      const res = await initiateTopUpAction(locale, numAmount, method);

      if (!res.success) {
        setError(res.error || "To'lovni boshlashda xatolik yuz berdi");
        return;
      }

      if (res.redirectUrl) {
        window.open(res.redirectUrl, "_blank");
        setOpen(false);
      } else {
        setSuccessMsg("Hisobingiz muvaffaqiyatli to'ldirildi! (+10% bonus qo'shildi)");
        setTimeout(() => {
          setOpen(false);
          setSuccessMsg("");
        }, 1800);
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button size="sm" className="w-fit gap-2">
            Hisobni to'ldirish <Wallet className="size-4" />
          </Button>
        }
      />
      <DialogContent className="sm:max-w-[460px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Hisobni to'ldirish (ARI tokenlari)</DialogTitle>
            <DialogDescription>
              AI xodimlaringiz uzluksiz ishlashi uchun hisobingizni to'ldiring. 1 ARI = 1 UZS
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-5 py-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="amount">To'lov summasi (UZS)</Label>
              <Input
                id="amount"
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                min="5000"
                step="5000"
                required
              />
              <div className="flex gap-2 pt-1">
                {["50000", "100000", "500000", "1000000"].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setAmount(preset)}
                    className="text-xs px-2.5 py-1 rounded border bg-muted/50 hover:bg-muted font-medium"
                  >
                    {(Number(preset) / 1000).toFixed(0)}k
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-2.5">
              <Label>To'lov tizimi</Label>
              <RadioGroup
                value={method}
                onValueChange={(val) => setMethod(val as "payme" | "click" | "test")}
                className={`grid gap-3 ${allowTestTopUp ? "grid-cols-3" : "grid-cols-2"}`}
              >
                {allowTestTopUp && (
                  <div>
                    <RadioGroupItem value="test" id="test" className="peer sr-only" />
                    <Label
                      htmlFor="test"
                      className="flex flex-col items-center justify-between rounded-lg border-2 border-muted bg-popover p-3 hover:bg-accent peer-data-[state=checked]:border-brand [&:has([data-state=checked])]:border-brand cursor-pointer text-center"
                    >
                      <Sparkles className="size-5 text-amber-500 mb-1" />
                      <span className="font-bold text-xs">Test Top-Up</span>
                      <span className="text-[10px] text-muted-foreground">Darhol kredit</span>
                    </Label>
                  </div>
                )}

                <div>
                  <RadioGroupItem value="payme" id="payme" className="peer sr-only" />
                  <Label
                    htmlFor="payme"
                    className="flex flex-col items-center justify-between rounded-lg border-2 border-muted bg-popover p-3 hover:bg-accent peer-data-[state=checked]:border-brand [&:has([data-state=checked])]:border-brand cursor-pointer text-center"
                  >
                    <span className="font-bold text-teal-500 text-sm mb-1">Payme</span>
                    <span className="text-[10px] text-muted-foreground">Karta orqali</span>
                  </Label>
                </div>

                <div>
                  <RadioGroupItem value="click" id="click" className="peer sr-only" />
                  <Label
                    htmlFor="click"
                    className="flex flex-col items-center justify-between rounded-lg border-2 border-muted bg-popover p-3 hover:bg-accent peer-data-[state=checked]:border-brand [&:has([data-state=checked])]:border-brand cursor-pointer text-center"
                  >
                    <span className="font-bold text-blue-500 text-sm mb-1">Click</span>
                    <span className="text-[10px] text-muted-foreground">Click Pass / App</span>
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {error && (
              <p className="text-xs font-medium text-destructive">{error}</p>
            )}

            {successMsg && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 text-xs font-medium">
                <CheckCircle2 className="size-4" />
                {successMsg}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Bekor qilish
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Bajarilmoqda..." : method === "test" ? "Hisobni to'ldirish" : "To'lov sahifasiga o'tish"}
              {method !== "test" && <ExternalLink className="size-3.5 ml-1.5" />}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
