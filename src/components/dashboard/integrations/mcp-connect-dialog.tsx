"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Webhook, Plus, Trash2 } from "lucide-react";
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

type HeaderRow = { key: string; value: string };

export function McpConnectDialog({ locale }: { locale: string }) {
  const t = useTranslations("integrations");
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [headers, setHeaders] = useState<HeaderRow[]>([{ key: "Authorization", value: "" }]);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const secretConfig: Record<string, string> = {};
    headers.forEach((header, index) => {
      if (header.key.trim()) secretConfig[`header_${index}_${header.key}`] = header.value;
    });
    startTransition(async () => {
      const result = await connectFormIntegrationAction({
        providerId: "customMcp",
        publicConfig: {
          url: String(formData.get("mcpUrl") ?? ""),
          headerKeys: JSON.stringify(headers.map((h) => h.key)),
        },
        secretConfig,
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
            {t("connect")} <Webhook className="size-3" />
          </Button>
        }
      />
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Custom MCP Server ulash</DialogTitle>
            <DialogDescription>
              Self-hosted MCP serverni ulab, uning MCP imkoniyatlar ro'yxatini olib kelish uchun.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="mcpUrl">MCP server URL</Label>
              <Input id="mcpUrl" name="mcpUrl" placeholder="https://mcp.example.com" required />
            </div>
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <Label>HTTP headers</Label>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="gap-1"
                  onClick={() => setHeaders([...headers, { key: "", value: "" }])}
                >
                  <Plus className="size-3" /> Header qo'shish
                </Button>
              </div>
              {headers.map((header, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Input
                    placeholder="Header"
                    value={header.key}
                    onChange={(e) => {
                      const next = [...headers];
                      next[index] = { ...next[index], key: e.target.value };
                      setHeaders(next);
                    }}
                  />
                  <Input
                    placeholder="Value"
                    value={header.value}
                    onChange={(e) => {
                      const next = [...headers];
                      next[index] = { ...next[index], value: e.target.value };
                      setHeaders(next);
                    }}
                  />
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    onClick={() => setHeaders(headers.filter((_, i) => i !== index))}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              ))}
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
      </DialogContent>
    </Dialog>
  );
}
