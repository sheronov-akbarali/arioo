"use client";

import { useState, useTransition } from "react";
import { Key, Copy, Check, Eye, EyeOff, Sparkles, CheckCircle2 } from "lucide-react";
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
import { adminChangeUserPasswordAction } from "@/app/[locale]/(admin)/admin/actions";

export function ChangePasswordDialog({
  userId,
  userEmail,
}: {
  userId: string;
  userEmail: string;
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(true);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const generateStrongPassword = () => {
    const chars = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#$%";
    let gen = "";
    for (let i = 0; i < 12; i++) {
      gen += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setPassword(gen);
  };

  const handleCopy = () => {
    if (!password) return;
    navigator.clipboard.writeText(password);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    startTransition(async () => {
      const res = await adminChangeUserPasswordAction(userId, password);
      if (res?.error) {
        setError(res.error);
      } else {
        setSuccess("Parol muvaffaqiyatli o'zgartirildi!");
        setTimeout(() => {
          setOpen(false);
          setSuccess("");
          setPassword("");
        }, 1500);
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button size="sm" variant="outline" className="h-8 gap-1.5 text-xs">
            <Key className="size-3.5 text-amber-600" />
            Parolni o'zgartirish
          </Button>
        }
      />
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Foydalanuvchi Parolini O'zgartirish</DialogTitle>
            <DialogDescription>
              Foydalanuvchi: <span className="font-semibold text-foreground">{userEmail}</span>
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Yangi Parol</Label>
                <button
                  type="button"
                  onClick={generateStrongPassword}
                  className="text-xs text-brand hover:underline flex items-center gap-1"
                >
                  <Sparkles className="size-3" /> Tasodifiy generatsiya
                </button>
              </div>

              <div className="relative flex items-center">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Kamida 8 ta belgi..."
                  className="pr-20 font-mono text-sm"
                  required
                  minLength={6}
                />
                <div className="absolute right-2 flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="p-1 text-muted-foreground hover:text-foreground"
                    title={showPassword ? "Yashirish" : "Ko'rsatish"}
                  >
                    {showPassword ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                  </button>
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="p-1 text-muted-foreground hover:text-foreground"
                    title="Nusxa olish"
                  >
                    {copied ? <Check className="size-3.5 text-emerald-600" /> : <Copy className="size-3.5" />}
                  </button>
                </div>
              </div>
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
            <Button type="submit" disabled={isPending || !password}>
              {isPending ? "Saqlanmoqda..." : "Parolni yangilash"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
