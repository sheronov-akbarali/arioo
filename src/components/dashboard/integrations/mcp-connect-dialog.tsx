"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Webhook, Check, Copy } from "lucide-react";
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

export function McpConnectDialog() {
  const t = useTranslations("integrations");
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    startTransition(async () => {
      // Mock generate API key
      await new Promise(resolve => setTimeout(resolve, 1000));
      setApiKey("arioo_mcp_" + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15));
    });
  };

  const copyToClipboard = () => {
    if (!apiKey) return;
    navigator.clipboard.writeText(apiKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button size="sm" variant="outline" className="gap-2">
            {t("connect")} <Webhook className="size-3" />
          </Button>
        }
      />
      <DialogContent className="sm:max-w-[425px]">
        {!apiKey ? (
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>Ochiq API va MCP Server</DialogTitle>
              <DialogDescription>
                Arioo platformasiga maxsus (custom) integratsiyalar yoki Model Context Protocol (MCP) serverlarni ulash uchun API kalit yarating.
              </DialogDescription>
            </DialogHeader>
            <div className="py-6">
              <ul className="list-disc pl-4 text-sm text-muted-foreground space-y-2">
                <li>Barcha AI Xodimlarni API orqali boshqarish imkoniyati</li>
                <li>Mavjud CRM/ERP tizimingizdan ma'lumotlarni to'g'ridan-to'g'ri AI ga uzatish</li>
                <li>Mahalliy MCP serverlarni ulash</li>
              </ul>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Bekor qilish
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Yaratilmoqda..." : "API Kalit yaratish"}
              </Button>
            </DialogFooter>
          </form>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>API Kalit yaratildi</DialogTitle>
              <DialogDescription>
                Quyidagi API kalitni nusxalab oling. Xavfsizlik sababli u qayta ko'rsatilmaydi.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4 flex flex-col gap-4">
              <div className="relative rounded-md bg-muted p-4 pr-12">
                <code className="text-sm font-mono break-all">{apiKey}</code>
                <Button
                  size="icon"
                  variant="ghost"
                  className="absolute right-2 top-2 h-8 w-8"
                  onClick={copyToClipboard}
                >
                  {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
                </Button>
              </div>
              <p className="text-xs text-amber-600 dark:text-amber-500">
                Ushbu kalit orqali butun tashkilotingiz ma'lumotlariga kirish mumkin, uni hech kimga bermang!
              </p>
            </div>
            <DialogFooter>
              <Button type="button" onClick={() => setOpen(false)}>
                Yopish
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
