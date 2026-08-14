"use client";

import { useState } from "react";
import { Settings2, Table2, GitBranch, Check, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const TOOLS = [
  {
    id: "internalSystem",
    name: "Ichki Tizim va CRM Ulanishi",
    desc: "AI agentga ichki mahsulotlar va buyurtmalar bazasidan to'g'ridan-to'g'ri ma'lumot olish imkonini beradi",
    icon: Settings2,
    defaultEnabled: true,
  },
  {
    id: "googleSheets",
    name: "Google Sheets Integratsiyasi",
    desc: "Mijozlar bilan suhbatdan olingan lid va buyurtmalarni avtomatik jadvalga yozish",
    icon: Table2,
    defaultEnabled: true,
  },
  {
    id: "github",
    name: "Vebhook va Dasturchilar API",
    desc: "Tashqi tizimlar bilan integratsiya qilish uchun event-driven xabarnomalar",
    icon: GitBranch,
    defaultEnabled: false,
  },
];

export function ToolsPanel() {
  const [enabledTools, setEnabledTools] = useState<Record<string, boolean>>({
    internalSystem: true,
    googleSheets: true,
    github: false,
  });

  const toggleTool = (id: string) => {
    setEnabledTools((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
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
          const isEnabled = !!enabledTools[tool.id];

          return (
            <div
              key={tool.id}
              onClick={() => toggleTool(tool.id)}
              className="flex items-center gap-3 p-3.5 hover:bg-muted/30 cursor-pointer transition-colors"
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

              <button
                type="button"
                role="switch"
                aria-checked={isEnabled}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  isEnabled ? "bg-brand" : "bg-muted"
                }`}
              >
                <span
                  aria-hidden="true"
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                    isEnabled ? "translate-x-4" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
