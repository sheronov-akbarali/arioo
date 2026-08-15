"use client";

import { useState, useTransition, useEffect } from "react";
import { Phone, Calendar, Mic, MicOff, PhoneOff, Volume2 } from "lucide-react";
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
import { startVoiceCallAction, scheduleCallAction } from "@/app/[locale]/(dashboard)/calls/actions";

export type AgentOption = {
  id: string;
  name: string;
};

export function StartCallDialog({
  locale,
  agents,
}: {
  locale: string;
  agents: AgentOption[];
}) {
  const [open, setOpen] = useState(false);
  const [inCall, setInCall] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");

  useEffect(() => {
    if (!inCall) return;
    const timer = setInterval(() => {
      setCallDuration((d) => d + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [inCall]);

  const handleStartSimulatedCall = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await startVoiceCallAction(locale, null, formData);
      if (res?.error) {
        setError(res.error);
      } else {
        setCallDuration(0);
        setInCall(true);
      }
    });
  };

  const handleEndCall = () => {
    setInCall(false);
    setCallDuration(0);
    setOpen(false);
  };

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    return `${mins.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <Dialog open={open} onOpenChange={(val) => {
      if (!val && inCall) {
        handleEndCall();
      } else {
        setOpen(val);
      }
    }}>
      <DialogTrigger
        render={
          <Button size="sm" variant="default" className="gap-2">
            <Phone className="size-3.5" />
            Qo'ng'iroqni boshlash
          </Button>
        }
      />
      <DialogContent className="sm:max-w-[440px]">
        {!inCall ? (
          <form onSubmit={handleStartSimulatedCall}>
            <DialogHeader>
              <DialogTitle>AI Ovozli Qo'ng'iroqni Boshlash</DialogTitle>
              <DialogDescription>
                AI operator orqali mijozga to'g'ridan-to'g'ri qo'ng'iroq qiling yoki jonli ovozli testni sinab ko'ring.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="agentId">AI Agentni tanlang</Label>
                <select
                  id="agentId"
                  name="agentId"
                  required
                  className="rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  {agents.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                  {agents.length === 0 && <option value="default">Standart AI Yordamchi</option>}
                </select>
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="phone">Mijoz telefon raqami</Label>
                <Input
                  id="phone"
                  name="phone"
                  placeholder="+998 90 123 45 67"
                  defaultValue="+998901234567"
                  required
                />
              </div>

              {error && (
                <p className="text-xs font-medium text-destructive">{error}</p>
              )}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Bekor qilish
              </Button>
              <Button type="submit" disabled={isPending} className="gap-2 bg-emerald-600 hover:bg-emerald-700">
                <Phone className="size-4" />
                {isPending ? "Ulanmoqda..." : "Ulanish"}
              </Button>
            </DialogFooter>
          </form>
        ) : (
          <div className="flex flex-col items-center justify-center py-6 gap-5 text-center">
            <div className="relative flex items-center justify-center">
              <span className="animate-ping absolute inline-flex h-20 w-20 rounded-full bg-emerald-400 opacity-50"></span>
              <div className="relative size-20 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-lg">
                <Volume2 className="size-8 animate-pulse" />
              </div>
            </div>

            <div>
              <h3 className="text-lg font-bold">Ovozli suhbat faol</h3>
              <p className="text-sm text-muted-foreground font-mono">{formatTime(callDuration)}</p>
              <p className="text-xs text-muted-foreground mt-1">AI operator bilan jonli audio aloqa o'rnatildi</p>
            </div>

            <div className="flex items-center gap-3 mt-2">
              <Button
                type="button"
                variant={isMuted ? "destructive" : "outline"}
                size="icon"
                className="size-11 rounded-full"
                onClick={() => setIsMuted(!isMuted)}
                title={isMuted ? "Ovozni yoqish" : "Ovozni o'chirish"}
              >
                {isMuted ? <MicOff className="size-5" /> : <Mic className="size-5" />}
              </Button>

              <Button
                type="button"
                variant="destructive"
                className="rounded-full px-6 gap-2"
                onClick={handleEndCall}
              >
                <PhoneOff className="size-4" />
                Qo'ng'iroqni yakunlash
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export function ScheduleCallDialog({
  locale,
  agents,
}: {
  locale: string;
  agents: AgentOption[];
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await scheduleCallAction(locale, null, formData);
      if (res?.error) {
        setError(res.error);
      } else {
        setOpen(false);
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button size="sm" variant="outline" className="gap-2">
            <Calendar className="size-3.5" />
            Rejalashtirish
          </Button>
        }
      />
      <DialogContent className="sm:max-w-[440px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Avtomatik Qo'ng'iroqni Rejalashtirish</DialogTitle>
            <DialogDescription>
              Belgilangan vaqtda AI operator mijoz bilan avtomatik bog'lanadi.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="schedAgentId">AI Agent</Label>
              <select
                id="schedAgentId"
                name="agentId"
                required
                className="rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                {agents.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
                {agents.length === 0 && <option value="default">Standart AI Yordamchi</option>}
              </select>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="schedPhone">Mijoz telefon raqami</Label>
              <Input
                id="schedPhone"
                name="phone"
                placeholder="+998 90 123 45 67"
                required
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="scheduledTime">Qo'ng'iroq vaqti</Label>
              <Input
                id="scheduledTime"
                name="scheduledTime"
                type="datetime-local"
                required
              />
            </div>

            {error && (
              <p className="text-xs font-medium text-destructive">{error}</p>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Bekor qilish
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Saqlanmoqda..." : "Rejalashtirish"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
