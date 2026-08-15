"use client";

import { useState, useTransition } from "react";
import { Bot, CheckCircle2 } from "lucide-react";
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
import { adminEditAgentAction } from "@/app/[locale]/(admin)/admin/actions";

export function EditAgentDialog({
  agent,
}: {
  agent: {
    id: string;
    name: string;
    role: string | null;
    status: string;
    systemPrompt?: string | null;
  };
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [name, setName] = useState(agent.name);
  const [role, setRole] = useState(agent.role || "");
  const [systemPrompt, setSystemPrompt] = useState(agent.systemPrompt || "");
  const [status, setStatus] = useState(agent.status);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    const formData = new FormData();
    formData.append("name", name);
    formData.append("role", role);
    formData.append("systemPrompt", systemPrompt);
    formData.append("status", status);

    startTransition(async () => {
      const res = await adminEditAgentAction(agent.id, formData);
      if (res?.error) {
        setError(res.error);
      } else {
        setSuccess("Agent muvaffaqiyatli yangilandi!");
        setTimeout(() => {
          setOpen(false);
          setSuccess("");
        }, 1200);
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button size="sm" variant="outline" className="h-8 gap-1 text-xs">
            <Bot className="size-3.5" />
            Tahrirlash
          </Button>
        }
      />
      <DialogContent className="sm:max-w-[520px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>AI Agentni Tahrirlash (SuperAdmin)</DialogTitle>
            <DialogDescription>
              Agentning nomi, roli, tizim ko'rsatmasi (prompt) va holatini o'zgartiring.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-2">
                <Label htmlFor="agentName">Agent Nomi</Label>
                <Input
                  id="agentName"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="agentStatus">Holati</Label>
                <select
                  id="agentStatus"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
                >
                  <option value="active">Faol</option>
                  <option value="draft">Qoralama</option>
                </select>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="agentRole">Roli va Vazifasi</Label>
              <Input
                id="agentRole"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                placeholder="Masalan: Savdo va Lidlar bo'yicha menejer"
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="agentPrompt">Tizim Ko'rsatmasi (System Prompt)</Label>
              <textarea
                id="agentPrompt"
                rows={5}
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
                placeholder="Agent mijozlar bilan qanday muloqot qilishi kerak..."
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs font-mono"
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
            <Button type="submit" disabled={isPending}>
              {isPending ? "Saqlanmoqda..." : "Saqlash"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
