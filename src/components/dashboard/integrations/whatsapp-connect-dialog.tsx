"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { MessageCircle, Copy, Check } from "lucide-react";
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
import { connectWhatsappAction } from "@/lib/integrations/actions";

export function WhatsappConnectDialog({
  agents,
}: {
  agents: { id: string; name: string }[];
}) {
  const t = useTranslations("integrations");
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [channelId, setChannelId] = useState<string | null>(null);
  const [copied, setCopied] = useState<{ [key: string]: boolean }>({});

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    
    startTransition(async () => {
      const result = await connectWhatsappAction({ success: false }, formData);
      if (result.success && result.channelId) {
        setChannelId(result.channelId);
      } else {
        setError(result.error || "Xatolik yuz berdi");
      }
    });
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied({ ...copied, [id]: true });
    setTimeout(() => setCopied({ ...copied, [id]: false }), 2000);
  };

  const webhookUrl = "https://arioo.uz/api/webhooks/whatsapp/" + channelId;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button size="sm" variant="outline" className="gap-2">
            {t("connect")} <MessageCircle className="size-3" />
          </Button>
        }
      />
      <DialogContent className="sm:max-w-[425px]">
        {!channelId ? (
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>WhatsApp Business API ulash</DialogTitle>
              <DialogDescription>
                Meta Developer konsolidan olingan ma'lumotlarni kiriting.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              {error && <p className="text-sm font-medium text-destructive">{error}</p>}
              <div className="flex flex-col gap-2">
                <Label htmlFor="accessToken">System User Access Token</Label>
                <Input
                  id="accessToken"
                  name="accessToken"
                  placeholder="EAAGm0..."
                  required
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="phoneNumberId">Phone Number ID</Label>
                <Input
                  id="phoneNumberId"
                  name="phoneNumberId"
                  placeholder="1046830..."
                  required
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="wabaId">WhatsApp Business Account ID</Label>
                <Input
                  id="wabaId"
                  name="wabaId"
                  placeholder="1029384..."
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Meta Business Manager → WhatsApp Manager sahifasida topasiz. Arioo shu ID orqali
                  ilovani sizning akkauntingizga avtomatik obuna qiladi.
                </p>
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
                {isPending ? "Ulanmoqda..." : "Ulash"}
              </Button>
            </DialogFooter>
          </form>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>WhatsApp ulanishi saqlandi!</DialogTitle>
              <DialogDescription>
                Endi Meta konsolingizga (Webhooks bo'limiga) quyidagi ma'lumotlarni kiriting.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4 flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label>Callback URL</Label>
                <div className="relative rounded-md bg-muted p-3 pr-10">
                  <code className="text-sm break-all">{webhookUrl}</code>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="absolute right-1 top-1.5 h-8 w-8"
                    onClick={() => copyToClipboard(webhookUrl, "url")}
                  >
                    {copied["url"] ? <Check className="size-4" /> : <Copy className="size-4" />}
                  </Button>
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <Label>Verify Token</Label>
                <div className="relative rounded-md bg-muted p-3 pr-10">
                  <code className="text-sm break-all">{channelId}</code>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="absolute right-1 top-1.5 h-8 w-8"
                    onClick={() => copyToClipboard(channelId, "token")}
                  >
                    {copied["token"] ? <Check className="size-4" /> : <Copy className="size-4" />}
                  </Button>
                </div>
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
