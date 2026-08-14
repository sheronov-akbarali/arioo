"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { ShoppingBag, Copy, Check } from "lucide-react";
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
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { connectOlxAction } from "@/lib/integrations/actions";

export function OlxConnectDialog({
  agents,
}: {
  agents: { id: string; name: string }[];
}) {
  const t = useTranslations("integrations");
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [channelId, setChannelId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    
    startTransition(async () => {
      const result = await connectOlxAction({ success: false }, formData);
      if (result.success && result.channelId) {
        setChannelId(result.channelId);
      } else {
        setError(result.error || "Xatolik yuz berdi");
      }
    });
  };

  const webhookUrl = "https://arioo.uz/api/webhooks/olx/" + channelId;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(webhookUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button size="sm" variant="outline" className="gap-2">
            {t("connect")} <ShoppingBag className="size-3" />
          </Button>
        }
      />
      <DialogContent className="sm:max-w-[425px]">
        {!channelId ? (
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>OLX.uz ulash</DialogTitle>
              <DialogDescription>
                RPA bot yoki Chrome Kengaytma orqali yuboriladigan xabarlarni o'qish uchun AI xodimni tanlang.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              {error && <p className="text-sm font-medium text-destructive">{error}</p>}
              <div className="flex flex-col gap-2">
                <Label htmlFor="agentId">AI Xodim (Agent)</Label>
                <Select name="agentId" required>
                  <SelectTrigger>
                    <SelectValue placeholder="Agentni tanlang..." />
                  </SelectTrigger>
                  <SelectContent>
                    {agents.map((agent) => (
                      <SelectItem key={agent.id} value={agent.id}>
                        {agent.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Bekor qilish
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Yaratilmoqda..." : "Ulash"}
              </Button>
            </DialogFooter>
          </form>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Webhook tayyor!</DialogTitle>
              <DialogDescription>
                Quyidagi Webhook manzilini RPA botingiz yoki avtomatlashtirish skriptingizga kiriting.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <div className="relative rounded-md bg-muted p-4 pr-10">
                <code className="text-sm break-all">{webhookUrl}</code>
                <Button
                  size="icon"
                  variant="ghost"
                  className="absolute right-2 top-2 h-8 w-8"
                  onClick={copyToClipboard}
                >
                  {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
                </Button>
              </div>
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
