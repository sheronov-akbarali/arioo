"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Send } from "lucide-react";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { connectTelegramBotAction } from "@/lib/integrations/actions";

export function TelegramConnectDialog({
  agents,
}: {
  agents: { id: string; name: string }[];
}) {
  const t = useTranslations("integrations");
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    
    startTransition(async () => {
      const result = await connectTelegramBotAction({ success: false }, formData);
      if (result.success) {
        setOpen(false);
      } else {
        setError(result.error || "Xatolik yuz berdi");
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button size="sm" variant="outline" className="gap-2">
            {t("connect")} <Send className="size-3" />
          </Button>
        }
      />
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Telegram Bot ulash</DialogTitle>
            <DialogDescription>
              BotFather dan olingan HTTP API Token ni kiriting va qaysi agent javob berishini tanlang.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {error && <p className="text-sm font-medium text-destructive">{error}</p>}
            <div className="flex flex-col gap-2">
              <Label htmlFor="botToken">Bot Token</Label>
              <Input
                id="botToken"
                name="botToken"
                placeholder="1234567890:AAH_xxxxx..."
                required
              />
            </div>
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
              {isPending ? "Ulanmoqda..." : "Saqlash va Ulash"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
