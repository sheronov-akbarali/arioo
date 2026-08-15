"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { MessageCircle } from "lucide-react";
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
import { connectFormIntegrationAction } from "@/lib/integrations/form-actions";

export function VkConnectDialog({ locale }: { locale: string }) {
  const t = useTranslations("integrations");
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await connectFormIntegrationAction({
        providerId: "vk",
        publicConfig: { groupId: String(formData.get("groupId") ?? "") },
        secretConfig: {
          accessToken: String(formData.get("accessToken") ?? ""),
          webhookSecret: String(formData.get("webhookSecret") ?? ""),
        },
        locale,
      });
      if (result.success) setOpen(false);
    });
  };

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
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>VK · ВКонтакте ulanishi</DialogTitle>
            <DialogDescription>VK · ВКонтакте integratsiyasini ulash uchun maydonlarni to'ldiring.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="accessToken">Access token (VK API uchun)</Label>
              <Input id="accessToken" name="accessToken" required />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="groupId">VK guruh ID</Label>
              <Input id="groupId" name="groupId" required />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="webhookSecret">Webhook so'rovlarini tasdiqlash uchun Secret key</Label>
              <Input id="webhookSecret" name="webhookSecret" required />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Bekor qilish
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Saqlanmoqda..." : "Saqlash va Ulash"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
