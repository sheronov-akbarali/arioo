"use client";

import { useState, useTransition } from "react";
import { Settings2, Table2, Zap, Check, Sparkles, CalendarClock, Plug } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { updateEnabledToolsAction } from "@/app/[locale]/(dashboard)/assistants/[agentId]/ai/actions";
import type { ToolId } from "@/lib/ai/tools";

const TOOLS: { id: ToolId; name: string; desc: string; icon: typeof Settings2 }[] = [
  {
    id: "createPaymentInvoice",
    name: "To'lov Havolasi Yaratish",
    desc: "Mijoz xarid qilishga rozi bo'lganda AI Click/Payme/Uzum to'lov havolasini avtomatik yaratadi",
    icon: Sparkles,
  },
  {
    id: "checkProductInfo",
    name: "Mahsulotlar Katalogidan Qidirish",
    desc: "AI tashkilotning \"Mahsulotlar\" bo'limidagi haqiqiy narx va holat ma'lumotlaridan foydalanadi",
    icon: Table2,
  },
  {
    id: "createCrmLead",
    name: "CRM'ga Lid Sifatida Saqlash",
    desc: "To'lovsiz so'rovlarda ham mijoz ma'lumotlarini avtomatik CRM'ga yozib qo'yadi",
    icon: Settings2,
  },
  {
    id: "triggerBusinessEvent",
    name: "Ichki Hodisa (Routines) Ishga Tushirish",
    desc: "AI muhim holatlarni (masalan shikoyat) aniqlaganda Routines'da sozlangan avtomatlashtirishni ishga tushiradi",
    icon: Zap,
  },
  {
    id: "bookCalendarAppointment",
    name: "Google Calendar Bron Qilish",
    desc: "Uchrashuv/qo'ng'iroq vaqtini avtomatik bron qiladi (Integrations'da Google ulangan bo'lishi kerak)",
    icon: CalendarClock,
  },
  {
    id: "customMcpTools",
    name: "Custom MCP Server Vositalari",
    desc: "Integrations'da ulangan Custom MCP Server orqali taqdim etilgan tashqi funksiyalarni AI ishlata oladi",
    icon: Plug,
  },
];

export function ToolsPanel({
  locale,
  agentId,
  enabledToolIds,
}: {
  locale: string;
  agentId: string;
  enabledToolIds: string[];
}) {
  const [enabled, setEnabled] = useState<Record<string, boolean>>(
    Object.fromEntries(TOOLS.map((t) => [t.id, enabledToolIds.includes(t.id)]))
  );
  const [isPending, startTransition] = useTransition();

  const toggleTool = (id: ToolId) => {
    const next = !enabled[id];
    setEnabled((prev) => ({ ...prev, [id]: next }));
    startTransition(async () => {
      const res = await updateEnabledToolsAction(locale, agentId, id, next);
      if (!res.success) {
        setEnabled((prev) => ({ ...prev, [id]: !next }));
      }
    });
  };

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border p-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-medium flex items-center gap-2">
            AI Asboblari va Funksiyalar (Tools) <Sparkles className="size-4 text-brand" />
          </h2>
          <p className="text-sm text-muted-foreground">
            AI xodimingiz foydalanishi mumkin bo'lgan qo'shimcha imkoniyatlarni faollashtiring
          </p>
        </div>
      </div>

      <div className="flex flex-col divide-y divide-border rounded-lg border border-border">
        {TOOLS.map((tool) => {
          const Icon = tool.icon;
          const isEnabled = !!enabled[tool.id];

          return (
            <button
              type="button"
              key={tool.id}
              disabled={isPending}
              onClick={() => toggleTool(tool.id)}
              className="flex items-center gap-3 p-3.5 hover:bg-muted/30 cursor-pointer transition-colors text-left disabled:opacity-60"
            >
              <span
                className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${
                  isEnabled ? "bg-brand/10 text-brand" : "bg-muted text-muted-foreground"
                }`}
              >
                <Icon className="size-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{tool.name}</p>
                <p className="truncate text-xs text-muted-foreground">{tool.desc}</p>
              </div>

              <Badge variant={isEnabled ? "default" : "secondary"} className="text-[11px] gap-1">
                {isEnabled && <Check className="size-3" />}
                {isEnabled ? "Faol" : "O'chirilgan"}
              </Badge>

              <span
                role="switch"
                aria-checked={isEnabled}
                className={`relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                  isEnabled ? "bg-brand" : "bg-muted"
                }`}
              >
                <span
                  aria-hidden="true"
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                    isEnabled ? "translate-x-4" : "translate-x-0"
                  }`}
                />
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
