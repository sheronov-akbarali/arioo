"use client";

import { useState, useTransition } from "react";
import { CreditCard, Wallet } from "lucide-react";
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

export function TopUpDialog() {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [method, setMethod] = useState("payme");
  const [amount, setAmount] = useState("100000");

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    startTransition(async () => {
      // Mock payment redirection
      await new Promise(resolve => setTimeout(resolve, 1500));
      setOpen(false);
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
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Hisobni to'ldirish (ARI tokenlari)</DialogTitle>
            <DialogDescription>
              AI xodimlaringiz ishlashi uchun hisobingizni to'ldiring. 1 ARI = 1 UZS
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-6 py-4">
            <div className="flex flex-col gap-3">
              <Label htmlFor="amount">To'lov summasi (UZS)</Label>
              <Input
                id="amount"
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                min="10000"
                step="10000"
                required
              />
            </div>
            <div className="flex flex-col gap-3">
              <Label>To'lov tizimi</Label>
              <RadioGroup
                value={method}
                onValueChange={(value) => setMethod(value as string)}
                className="grid grid-cols-2 gap-4"
              >
                <div>
                  <RadioGroupItem value="payme" id="payme" className="peer sr-only" />
                  <Label
                    htmlFor="payme"
                    className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-brand [&:has([data-state=checked])]:border-brand cursor-pointer"
                  >
                    <span className="font-bold text-teal-500 text-lg">Payme</span>
                  </Label>
                </div>
                <div>
                  <RadioGroupItem value="click" id="click" className="peer sr-only" />
                  <Label
                    htmlFor="click"
                    className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-brand [&:has([data-state=checked])]:border-brand cursor-pointer"
                  >
                    <span className="font-bold text-blue-500 text-lg">Click</span>
                  </Label>
                </div>
                <div className="col-span-2">
                  <RadioGroupItem value="stripe" id="stripe" className="peer sr-only" />
                  <Label
                    htmlFor="stripe"
                    className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-brand [&:has([data-state=checked])]:border-brand cursor-pointer flex-row gap-2"
                  >
                    <CreditCard className="size-5" />
                    <span className="font-semibold">Xalqaro karta (Stripe)</span>
                  </Label>
                </div>
              </RadioGroup>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Bekor qilish
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "O'tilmoqda..." : "To'lov sahifasiga o'tish"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
