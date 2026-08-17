"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Bot, type LucideIcon } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  DEPARTMENT_KEYS,
  type Department,
  type SourceKey,
  SYSTEM_KEYS,
  SOURCE_ICONS,
  SYSTEM_ICONS,
  DEPARTMENT_SOURCE_GROUPS,
} from "./agent-flow-data";

const CYCLE_MS = 2500;
// Matches the continuous stroke-dashoffset flow speed observed on worken.ru's
// connector lines (1.2s per dash-gap cycle, linear, indefinite).
const FLOW_DUR_S = 1.2;

function NodeCard({
  icon: Icon,
  label,
  sublabel,
  active,
  pulseKey,
}: {
  icon: LucideIcon;
  label: string;
  sublabel: string;
  active: boolean;
  pulseKey?: number;
}) {
  return (
    <div
      className={
        active
          ? "relative z-10 flex items-center gap-3 rounded-xl border border-brand bg-brand/10 p-3 shadow-[0_0_24px_-8px_var(--brand)] transition-colors duration-500"
          : "relative z-10 flex items-center gap-3 rounded-xl border border-border bg-card p-3 transition-colors duration-500"
      }
    >
      {active && (
        <span
          key={pulseKey}
          aria-hidden
          className="motion-safe:animate-node-ping absolute inset-0 rounded-xl border-2 border-brand"
        />
      )}
      <span
        className={
          active
            ? "relative flex size-8 shrink-0 items-center justify-center rounded-lg bg-brand text-brand-foreground transition-colors duration-500"
            : "relative flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground transition-colors duration-500"
        }
      >
        {active && (
          <span aria-hidden className="motion-safe:animate-pulse absolute inset-0 rounded-lg bg-brand/40" />
        )}
        <Icon className="relative size-4" />
      </span>
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">{label}</p>
        <p className="truncate text-xs text-muted-foreground">{sublabel}</p>
      </div>
    </div>
  );
}

function GroupHeading({ text }: { text: string }) {
  return <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">{text}</p>;
}

// Anchor points as percentages of the diagram's bounding box. The source
// column now stacks [heading, node, node, heading, node, node] (two
// department-specific groups of two), the system column stacks [heading,
// node, node]. Percentages approximate the flex column's proportional
// layout (heading rows are shorter than card rows) — exact pixel sync
// isn't needed since the SVG stretches with preserveAspectRatio="none".
const SOURCE_Y = [18, 39, 70, 91];
const SYSTEM_Y = [37, 81];
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

export function AgentFlowPanel() {
  const t = useTranslations("hero.diagram");
  const reducedMotion = useReducedMotion();

  const [department, setDepartment] = useState<Department>("sales");
  const [activeSource, setActiveSource] = useState(0);
  const [cycle, setCycle] = useState(0);

  const [group0, group1] = DEPARTMENT_SOURCE_GROUPS[department];
  const renderedSourceKeys: SourceKey[] = [...group0, ...group1];
  const activeSystem = activeSource % SYSTEM_KEYS.length;

  useEffect(() => {
    setActiveSource(0);
    setCycle((c) => c + 1);
  }, [department]);

  useEffect(() => {
    if (reducedMotion) return;
    const id = setInterval(() => {
      setActiveSource((i) => (i + 1) % renderedSourceKeys.length);
      setCycle((c) => c + 1);
    }, CYCLE_MS);
    return () => clearInterval(id);
  }, [reducedMotion, renderedSourceKeys.length]);

  const sourceToAgentPath = (i: number) =>
    `M ${SOURCE_X} ${SOURCE_Y[i]} C 30 ${SOURCE_Y[i]}, 30 ${AGENT_POINT.y}, ${AGENT_POINT.x} ${AGENT_POINT.y}`;
  const agentToSystemPath = (i: number) =>
    `M ${AGENT_POINT.x} ${AGENT_POINT.y} C 70 ${AGENT_POINT.y}, 70 ${SYSTEM_Y[i]}, ${SYSTEM_X} ${SYSTEM_Y[i]}`;

  return (
    <div className="min-w-0 overflow-hidden rounded-2xl border border-border bg-card/50">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 bg-muted/40 px-4 py-3">
        <div aria-hidden className="flex shrink-0 gap-1.5">
          <span className="size-2.5 rounded-full bg-red-400/70" />
          <span className="size-2.5 rounded-full bg-amber-400/70" />
          <span className="size-2.5 rounded-full bg-emerald-400/70" />
        </div>
        <Tabs value={department} onValueChange={(v) => setDepartment(v as Department)}>
          <div className="-mx-1 overflow-x-auto px-1">
            <TabsList>
              {DEPARTMENT_KEYS.map((key) => (
                <TabsTrigger key={key} value={key} className="shrink-0">
                  {t(`departments.${key}`)}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>
        </Tabs>
      </div>

      <div className="p-6">
        <p className="mb-3 text-sm text-muted-foreground">{t(`description.${department}`)}</p>
        <div className="mb-4 flex flex-wrap gap-1.5">
          {(t.raw(`chips.${department}`) as string[]).map((chip) => (
            <Badge key={chip} variant="outline">
              {chip}
            </Badge>
          ))}
        </div>

        <div className="relative grid grid-cols-[minmax(0,1fr)_minmax(0,148px)_minmax(0,1fr)] items-center gap-3">
          <svg
            aria-hidden
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            className="pointer-events-none absolute inset-0 h-full w-full"
          >
            {renderedSourceKeys.map((key, i) => {
              const isActive = !reducedMotion && i === activeSource;
              return (
                <path
                  key={key}
                  d={sourceToAgentPath(i)}
                  fill="none"
                  stroke={isActive ? "var(--brand)" : "var(--border)"}
                  strokeWidth={isActive ? 0.8 : 0.6}
                  strokeOpacity={isActive ? 1 : 0.6}
                  strokeDasharray="2 2"
                  strokeLinecap="round"
                  className="transition-[stroke,stroke-width,stroke-opacity] duration-500"
                  vectorEffect="non-scaling-stroke"
                >
                  {!reducedMotion && (
                    <animate
                      attributeName="stroke-dashoffset"
                      values="0;-4"
                      dur={`${FLOW_DUR_S}s`}
                      repeatCount="indefinite"
                    />
                  )}
                </path>
              );
            })}
            {SYSTEM_KEYS.map((key, i) => {
              const isActive = !reducedMotion && i === activeSystem;
              return (
                <path
                  key={key}
                  d={agentToSystemPath(i)}
                  fill="none"
                  stroke={isActive ? "var(--brand)" : "var(--border)"}
                  strokeWidth={isActive ? 0.8 : 0.6}
                  strokeOpacity={isActive ? 1 : 0.6}
                  strokeDasharray="2 2"
                  strokeLinecap="round"
                  className="transition-[stroke,stroke-width,stroke-opacity] duration-500"
                  vectorEffect="non-scaling-stroke"
                >
                  {!reducedMotion && (
                    <animate
                      attributeName="stroke-dashoffset"
                      values="0;-4"
                      dur={`${FLOW_DUR_S}s`}
                      repeatCount="indefinite"
                      begin={`${FLOW_DUR_S / 2}s`}
                    />
                  )}
                </path>
              );
            })}
            {!reducedMotion && (
              <circle r={1.6} fill="var(--brand)">
                <animateMotion
                  key={`journey-${cycle}`}
                  dur={`${CYCLE_MS / 1000}s`}
                  repeatCount="1"
                  fill="freeze"
                  keyPoints="0;0.5;0.5;1"
                  keyTimes="0;0.5;0.5;1"
                  path={`${sourceToAgentPath(activeSource)} ${agentToSystemPath(activeSystem).replace(/^M [\d.]+ [\d.]+ /, "L ")}`}
                />
              </circle>
            )}
          </svg>

          <div className="min-w-0 flex flex-col gap-3">
            <GroupHeading text={t(`groups.${department}.0`)} />
            {group0.map((key) => {
              const i = renderedSourceKeys.indexOf(key);
              const Icon = SOURCE_ICONS[key];
              return (
                <NodeCard
                  key={key}
                  icon={Icon}
                  label={t(`${key}.label`)}
                  sublabel={t(`${key}.sublabel`)}
                  active={!reducedMotion && i === activeSource}
                  pulseKey={cycle}
                />
              );
            })}
            <GroupHeading text={t(`groups.${department}.1`)} />
            {group1.map((key) => {
              const i = renderedSourceKeys.indexOf(key);
              const Icon = SOURCE_ICONS[key];
              return (
                <NodeCard
                  key={key}
                  icon={Icon}
                  label={t(`${key}.label`)}
                  sublabel={t(`${key}.sublabel`)}
                  active={!reducedMotion && i === activeSource}
                  pulseKey={cycle}
                />
              );
            })}
          </div>

          <div className="min-w-0 w-full">
            <NodeCard icon={Bot} label={t(`agent.${department}.label`)} sublabel={t(`agent.${department}.sublabel`)} active />
          </div>

          <div className="min-w-0 flex flex-col gap-3">
            <GroupHeading text={t("systemsHeading")} />
            {SYSTEM_KEYS.map((key, i) => {
              const Icon = SYSTEM_ICONS[key];
              return (
                <NodeCard
                  key={key}
                  icon={Icon}
                  label={t(`${key}.label`)}
                  sublabel={t(`${key}.sublabel`)}
                  active={!reducedMotion && i === activeSystem}
                  pulseKey={cycle}
                />
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
