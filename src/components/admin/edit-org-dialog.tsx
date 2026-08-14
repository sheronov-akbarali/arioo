"use client";

import { useState, useTransition } from "react";
import { Settings, CheckCircle2 } from "lucide-react";
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
import { updateOrgAction } from "@/app/[locale]/(admin)/admin/actions";

export function EditOrgDialog({
  org,
}: {
  org: {
    id: string;
    name: string;
    industry: string | null;
    plan: string;
  };
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [name, setName] = useState(org.name);
  const [industry, setIndustry] = useState(org.industry || "");
  const [plan, setPlan] = useState(org.plan);
  const [success, setSuccess] = useState("");

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSuccess("");

    const formData = new FormData();
    formData.append("name", name);
    formData.append("industry", industry);
    formData.append("plan", plan);

    startTransition(async () => {
      await updateOrgAction(org.id, formData);
      setSuccess("Tashkilot ma'lumotlari yangilandi!");
      setTimeout(() => {
        setOpen(false);
        setSuccess("");
      }, 1200);
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button size="sm" variant="ghost" className="h-8 gap-1 text-xs">
            <Settings className="size-3.5" />
            Tahrirlash
          </Button>
        }
      />
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Tashkilot Sozlamalarini Tahrirlash</DialogTitle>
            <DialogDescription>
              Tashkilot ma'lumotlari va tarifini o'zgartiring.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="orgName">Tashkilot nomi</Label>
              <Input
                id="orgName"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="orgIndustry">Soha (Industry)</Label>
              <Input
                id="orgIndustry"
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                placeholder="Masalan: E-commerce, Meditsina, Ta'lim"
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="planSelect">Tarif rejasi (Plan)</Label>
              <select
                id="planSelect"
                value={plan}
                onChange={(e) => setPlan(e.target.value)}
                className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
              >
                <option value="freemium">Freemium (1 agent, 50k token)</option>
                <option value="start">Start (3 agent, 500k token)</option>
                <option value="pro">Pro (10 agent, 2.5M token)</option>
                <option value="enterprise">Enterprise (50 agent, 10M token)</option>
              </select>
            </div>

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
