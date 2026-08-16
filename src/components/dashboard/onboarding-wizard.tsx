"use client";

import { useState, useTransition } from "react";
import {
  CheckCircle2,
  Circle,
  Sparkles,
  Bot,
  FileText,
  Radio,
  MessageSquare,
  ChevronRight,
  ChevronDown,
  Building,
  X,
} from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { dismissOnboardingAction } from "@/app/[locale]/(dashboard)/dashboard/onboarding-actions";

export type OnboardingWizardProps = {
  locale: string;
  hasAgents: boolean;
  hasKnowledge: boolean;
  hasChannels: boolean;
  hasChats: boolean;
  firstAgentId?: string;
  dismissed?: boolean;
};

export function OnboardingWizard({
  locale,
  hasAgents,
  hasKnowledge,
  hasChannels,
  hasChats,
  firstAgentId,
  dismissed,
}: OnboardingWizardProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isDismissed, setIsDismissed] = useState(!!dismissed);
  const [isPending, startTransition] = useTransition();

  const handleDismiss = () => {
    setIsDismissed(true);
    startTransition(() => dismissOnboardingAction(locale));
  };

  const steps = [
    {
      id: 1,
      title: "Tashkilot yaratish",
      description: "Biznes profilingiz va sohangiz sozlandi",
      done: true,
      href: "/settings/project",
      icon: Building,
      actionText: "Ko'rish",
    },
    {
      id: 2,
      title: "Birinchi AI Xodimni yaratish",
      description: "Sotuv, mijozlarga xizmat yoki HR agentingizni yarating",
      done: hasAgents,
      href: "/assistants/new",
      icon: Bot,
      actionText: "Xodim yaratish",
    },
    {
      id: 3,
      title: "Bilimlar bazasiga ma'lumot yuklash",
      description: "Kompaniya xizmatlari, narxlar va qoidalar faylini bering",
      done: hasKnowledge,
      href: firstAgentId ? `/assistants/${firstAgentId}/knowledge` : "/knowledge-bases",
      icon: FileText,
      actionText: "Hujjat yuklash",
    },
    {
      id: 4,
      title: "Muloqot kanalini ulash",
      description: "Telegram Bot yoki WhatsApp orqali mijozlarni qabul qiling",
      done: hasChannels,
      href: "/integrations",
      icon: Radio,
      actionText: "Kanal ulash",
    },
    {
      id: 5,
      title: "Test suhbat o'tkazish",
      description: "Playground'da AI xodimingiz javoblarini tekshirib ko'ring",
      done: hasChats,
      href: firstAgentId ? `/assistants/${firstAgentId}/chat` : "/chats",
      icon: MessageSquare,
      actionText: "Sinab ko'rish",
    },
  ];

  const completedCount = steps.filter((s) => s.done).length;
  const progressPercent = Math.round((completedCount / steps.length) * 100);

  if (completedCount === steps.length || isDismissed) {
    return null; // All done, or the user chose to skip
  }

  return (
    <Card className="border-brand/30 bg-gradient-to-br from-brand/5 via-background to-muted/20 shadow-xs">
      <CardHeader className="p-4 sm:p-5 flex flex-row items-center justify-between pb-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="flex size-7 items-center justify-center rounded-lg bg-brand/10 text-brand">
              <Sparkles className="size-4" />
            </span>
            <CardTitle className="text-base font-semibold">
              Tezkor Boshlash Qo'llanmasi (Onboarding)
            </CardTitle>
          </div>
          <CardDescription className="text-xs">
            {completedCount} / {steps.length} qadam bajarildi ({progressPercent}%)
          </CardDescription>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="h-8 px-2 text-xs text-muted-foreground"
          >
            {isCollapsed ? (
              <>
                Ko'rsatish <ChevronDown className="size-3.5 ml-1" />
              </>
            ) : (
              <>
                Yashirish <ChevronRight className="size-3.5 ml-1" />
              </>
            )}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            disabled={isPending}
            onClick={handleDismiss}
            title="Butunlay o'tkazib yuborish"
            className="h-8 w-8 p-0 text-muted-foreground"
          >
            <X className="size-3.5" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="p-4 sm:p-5 pt-0 space-y-4">
        <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-brand rounded-full transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {!isCollapsed && (
          <div className="grid gap-2 sm:gap-3 pt-1">
            {steps.map((step) => {
              const Icon = step.icon;
              return (
                <div
                  key={step.id}
                  className={`flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 rounded-lg border transition-colors gap-2 ${
                    step.done
                      ? "bg-muted/30 border-border/50 text-muted-foreground"
                      : "bg-background border-border shadow-2xs hover:border-brand/40"
                  }`}
                >
                  <div className="flex items-start sm:items-center gap-3">
                    {step.done ? (
                      <CheckCircle2 className="size-5 text-emerald-500 shrink-0 mt-0.5 sm:mt-0" />
                    ) : (
                      <Circle className="size-5 text-muted-foreground shrink-0 mt-0.5 sm:mt-0" />
                    )}
                    <div>
                      <p className={`text-sm font-medium ${step.done ? "line-through text-muted-foreground" : "text-foreground"}`}>
                        {step.title}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {step.description}
                      </p>
                    </div>
                  </div>

                  {!step.done && (
                    <Button
                      size="sm"
                      variant="default"
                      className="text-xs shrink-0 self-end sm:self-auto h-7 px-3"
                      render={<Link href={step.href} />}
                    >
                      <Icon className="size-3 mr-1.5" />
                      {step.actionText}
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
