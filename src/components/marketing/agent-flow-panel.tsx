"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import {
  Globe,
  Send,
  ShoppingBag,
  PhoneCall,
  Database,
  BookOpen,
  Bot,
  type LucideIcon,
} from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

const SOURCE_ICONS = [Globe, Send, ShoppingBag, PhoneCall] as const;
const SYSTEM_ICONS = [Database, BookOpen] as const;
const CYCLE_MS = 2500;

function Node({
  icon: Icon,
  label,
  sublabel,
  active,
}: {
  icon: LucideIcon;
  label: string;
  sublabel: string;
  active: boolean;
}) {
  return (
    <div
      className={
        active
          ? "relative z-10 flex items-center gap-3 rounded-xl border border-brand bg-brand/10 p-3 shadow-[0_0_24px_-8px_var(--brand)] transition-colors duration-500"
          : "relative z-10 flex items-center gap-3 rounded-xl border border-border bg-card p-3 transition-colors duration-500"
      }
    >
      <span
        className={
          active
            ? "flex size-8 shrink-0 items-center justify-center rounded-lg bg-brand text-brand-foreground transition-colors duration-500"
            : "flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground transition-colors duration-500"
        }
      >
        <Icon className="size-4" />
      </span>
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">{label}</p>
        <p className="truncate text-xs text-muted-foreground">{sublabel}</p>
      </div>
    </div>
  );
}

// Anchor points as percentages of the diagram's bounding box, matching the
// 4-row source column (website/telegram/olx/calls), the centered agent
// node, and the 2-row system column. Percentages (not measured pixels)
// mean no ResizeObserver/layout-effect sync is needed between the cards
// and the SVG.
const SOURCE_Y = [8, 36, 64, 92];
const SYSTEM_Y = [25, 75];
const AGENT_POINT = { x: 50, y: 50 };
const SOURCE_X = 2;
const SYSTEM_X = 98;

function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setReduced(query.matches);
    const listener = (e: MediaQueryListEvent) => setReduced(e.matches);
    query.addEventListener("change", listener);
    return () => query.removeEventListener("change", listener);
  }, []);
  return reduced;
}

const DEPARTMENT_KEYS = ["sales", "support", "hr", "marketing"] as const;
type Department = (typeof DEPARTMENT_KEYS)[number];

export function AgentFlowPanel() {
  const t = useTranslations("hero.diagram");
  const reducedMotion = useReducedMotion();
  const sourceKeys = ["website", "telegram", "olx", "calls"] as const;
  const systemKeys = ["crm", "knowledge"] as const;

  const [department, setDepartment] = useState<Department>("sales");
  const [activeSource, setActiveSource] = useState(0);
  const activeSystem = activeSource % systemKeys.length;

  useEffect(() => {
    if (reducedMotion) return;
    const id = setInterval(() => {
      setActiveSource((i) => (i + 1) % sourceKeys.length);
    }, CYCLE_MS);
    return () => clearInterval(id);
  }, [reducedMotion, sourceKeys.length]);

  const sourceToAgentPath = (i: number) =>
    `M ${SOURCE_X} ${SOURCE_Y[i]} C 30 ${SOURCE_Y[i]}, 30 ${AGENT_POINT.y}, ${AGENT_POINT.x} ${AGENT_POINT.y}`;
  const agentToSystemPath = (i: number) =>
    `M ${AGENT_POINT.x} ${AGENT_POINT.y} C 70 ${AGENT_POINT.y}, 70 ${SYSTEM_Y[i]}, ${SYSTEM_X} ${SYSTEM_Y[i]}`;

  return (
    <div className="min-w-0 rounded-2xl border border-border bg-card/50 p-6">
      <Tabs value={department} onValueChange={(v) => setDepartment(v as Department)}>
        <div className="mb-4 -mx-1 overflow-x-auto px-1">
          <TabsList>
            {DEPARTMENT_KEYS.map((key) => (
              <TabsTrigger key={key} value={key} className="shrink-0">
                {t(`departments.${key}`)}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>
      </Tabs>
      <p className="mb-4 text-xs font-medium tracking-wide text-muted-foreground uppercase">
        {t("sources")}
      </p>
      <div className="relative grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3">
        <svg
          aria-hidden
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          className="pointer-events-none absolute inset-0 h-full w-full"
        >
          {sourceKeys.map((key, i) => (
            <path
              key={key}
              d={sourceToAgentPath(i)}
              fill="none"
              stroke={!reducedMotion && i === activeSource ? "var(--brand)" : "var(--border)"}
              strokeWidth={0.6}
              strokeDasharray={!reducedMotion && i === activeSource ? undefined : "2 2"}
              className="transition-colors duration-500"
              vectorEffect="non-scaling-stroke"
            />
          ))}
          {systemKeys.map((key, i) => (
            <path
              key={key}
              d={agentToSystemPath(i)}
              fill="none"
              stroke={!reducedMotion && i === activeSystem ? "var(--brand)" : "var(--border)"}
              strokeWidth={0.6}
              strokeDasharray={!reducedMotion && i === activeSystem ? undefined : "2 2"}
              className="transition-colors duration-500"
              vectorEffect="non-scaling-stroke"
            />
          ))}
          {!reducedMotion && (
            <>
              <circle r={1.4} fill="var(--brand)" className="motion-reduce:hidden">
                <animateMotion
                  key={`source-${activeSource}`}
                  dur={`${CYCLE_MS / 2000}s`}
                  repeatCount="1"
                  fill="freeze"
                  path={sourceToAgentPath(activeSource)}
                />
              </circle>
              <circle r={1.4} fill="var(--brand)" className="motion-reduce:hidden">
                <animateMotion
                  key={`system-${activeSource}`}
                  dur={`${CYCLE_MS / 2000}s`}
                  begin="1.25s"
                  repeatCount="1"
                  fill="freeze"
                  path={agentToSystemPath(activeSystem)}
                />
              </circle>
            </>
          )}
        </svg>

        <div className="min-w-0 flex flex-col gap-3">
          {sourceKeys.map((key, i) => {
            const Icon = SOURCE_ICONS[i]!;
            return (
              <Node
                key={key}
                icon={Icon}
                label={t(`${key}.label`)}
                sublabel={t(`${key}.sublabel`)}
                active={!reducedMotion && i === activeSource}
              />
            );
          })}
        </div>

        <div aria-hidden className="w-8" />

        <div className="min-w-0 flex flex-col gap-3">
          {systemKeys.map((key, i) => {
            const Icon = SYSTEM_ICONS[i]!;
            return (
              <Node
                key={key}
                icon={Icon}
                label={t(`${key}.label`)}
                sublabel={t(`${key}.sublabel`)}
                active={!reducedMotion && i === activeSystem}
              />
            );
          })}
        </div>
      </div>

      <div className="relative z-10 mt-4">
        <Node
          icon={Bot}
          label={t(`agent.${department}.label`)}
          sublabel={t(`agent.${department}.sublabel`)}
          active
        />
      </div>
    </div>
  );
}
