"use client";

import { useState, useTransition } from "react";
import { Wallet, PlusCircle, MinusCircle, CheckCircle2 } from "lucide-react";
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
import { adminAdjustOrgBalanceAction } from "@/app/[locale]/(admin)/admin/actions";

export function AdjustBalanceDialog({
  orgId,
  orgName,
  currentBalance = 0,
}: {
  orgId: string;
  orgName: string;
  currentBalance: number;
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [amount, setAmount] = useState("100000");
  const [type, setType] = useState<"topup" | "deduct">("topup");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    startTransition(async () => {
      const res = await adminAdjustOrgBalanceAction(
        orgId,
        Number(amount),
        type,
        description
      );
      if (res?.error) {
        setError(res.error);
      } else {
        setSuccess(`Balans muvaffaqiyatli ${type === "topup" ? "to'ldirildi" : "yechildi"}!`);
        setTimeout(() => {
          setOpen(false);
          setSuccess("");
          setDescription("");
        }, 1500);
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button size="sm" variant="outline" className="h-8 gap-1.5 text-xs">
            <Wallet className="size-3.5 text-brand" />
            Balans
          </Button>
        }
      />
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Tashkilot Balansini Boshqarish</DialogTitle>
            <DialogDescription>
              Tashkilot: <span className="font-semibold text-foreground">{orgName}</span>
              <br />
              Hozirgi balans: <span className="font-bold text-brand">{new Intl.NumberFormat("uz-UZ").format(currentBalance)} UZS</span>
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setType("topup")}
                className={`flex-1 flex items-center justify-center gap-2 p-2.5 rounded-lg border text-xs font-semibold transition-all ${
                  type === "topup"
                    ? "bg-emerald-500/15 border-emerald-500 text-emerald-700 dark:text-emerald-400"
                    : "bg-muted/40 border-muted text-muted-foreground"
                }`}
              >
                <PlusCircle className="size-4" /> Balans qo'shish
              </button>

              <button
                type="button"
                onClick={() => setType("deduct")}
                className={`flex-1 flex items-center justify-center gap-2 p-2.5 rounded-lg border text-xs font-semibold transition-all ${
                  type === "deduct"
                    ? "bg-red-500/15 border-red-500 text-red-700 dark:text-red-400"
                    : "bg-muted/40 border-muted text-muted-foreground"
                }`}
              >
                <MinusCircle className="size-4" /> Balansdan yechish
              </button>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="amount">Summa (UZS)</Label>
              <Input
                id="amount"
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                min="1000"
                step="1000"
                required
              />
              <div className="flex gap-1.5 pt-1">
                {["50000", "100000", "500000", "1000000"].map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setAmount(p)}
                    className="text-xs px-2 py-0.5 rounded border bg-muted/40 hover:bg-muted font-mono"
                  >
                    {(Number(p) / 1000).toFixed(0)}k
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="description">Operatsiya sababi / Izoh</Label>
              <Input
                id="description"
                placeholder="Masalan: Test hisobini to'ldirish yoki bonus"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            {error && (
              <p className="text-xs font-medium text-destructive">{error}</p>
            )}

            {success && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 text-xs font-medium">
                <CheckCircle2 className="size-4" />
                {success}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Bekor qilish
            </Button>
            <Button
              type="submit"
              disabled={isPending || !amount}
              className={type === "topup" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-destructive hover:bg-destructive/90"}
            >
              {isPending ? "Bajarilmoqda..." : type === "topup" ? "Balansni to'ldirish" : "Balansdan yechish"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
