"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Bot, X, type LucideIcon } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  DEPARTMENT_KEYS,
  type Department,
  type SourceKey,
  SYSTEM_KEYS,
  type SystemKey,
  SOURCE_ICONS,
  SYSTEM_ICONS,
  DEPARTMENT_SOURCE_GROUPS,
  CONNECTION_TOOL_KEYS,
} from "./agent-flow-data";

const CYCLE_MS = 2500;
// Matches the continuous stroke-dashoffset flow speed observed on worken.ru's
// connector lines (1.2s per dash-gap cycle, linear, indefinite).
const FLOW_DUR_S = 1.2;

type ActiveNode = { kind: "source"; key: SourceKey } | { kind: "system"; key: SystemKey } | null;

function NodeCard({
  icon: Icon,
  label,
  sublabel,
  active,
  pulseKey,
  interactive,
  expanded,
  onToggle,
}: {
  icon: LucideIcon;
  label: string;
  sublabel: string;
  active: boolean;
  pulseKey?: number;
  interactive?: boolean;
  expanded?: boolean;
  onToggle?: () => void;
}) {
  const content = (
    <>
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
      <div className="min-w-0 text-left">
        <p className="truncate text-sm font-medium">{label}</p>
        <p className="truncate text-xs text-muted-foreground">{sublabel}</p>
      </div>
    </>
  );

  const className = [
    "relative z-10 flex w-full items-center gap-3 rounded-xl border p-3 transition-colors duration-500",
    active ? "border-brand bg-brand/10 shadow-[0_0_24px_-8px_var(--brand)]" : "border-border bg-card",
    interactive ? "cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-brand" : "",
    expanded ? "ring-2 ring-brand" : "",
  ]
    .filter(Boolean)
    .join(" ");

  if (interactive) {
    return (
      <button type="button" onClick={onToggle} aria-expanded={expanded} className={className}>
        {content}
      </button>
    );
  }
  return <div className={className}>{content}</div>;
}

function GroupHeading({ text }: { text: string }) {
  return <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">{text}</p>;
}

function FlowPath({
  d,
  isActive,
  reducedMotion,
  animateBegin,
}: {
  d: string;
  isActive: boolean;
  reducedMotion: boolean;
  animateBegin?: string;
}) {
  return (
    <path
      d={d}
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
          begin={animateBegin}
        />
      )}
    </path>
  );
}

function SourceFlyout({ items }: { items: string[] }) {
  return (
    <div
      role="status"
      className="animate-in fade-in slide-in-from-left-1 absolute top-1/2 left-full z-20 ml-2 flex -translate-y-1/2 gap-1.5 duration-300"
    >
      {items.map((item) => (
        <span
          key={item}
          className="rounded-full border border-brand/40 bg-card px-2.5 py-1 text-xs font-medium whitespace-nowrap text-foreground shadow-sm"
        >
          {item}
        </span>
      ))}
    </div>
  );
}

function SystemConnectionPanel({
  url,
  tools,
  labels,
  sampleBadge,
  onClose,
}: {
  url: string;
  tools: { key: string; name: string; description: string }[];
  labels: { connection: string; url: string; tools: string; close: string };
  sampleBadge: string;
  onClose: () => void;
}) {
  const [enabled, setEnabled] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(tools.map((tool, i) => [tool.key, i === 0])),
  );

  return (
    <div className="animate-in fade-in slide-in-from-top-2 mt-4 rounded-xl border border-border bg-card p-4 duration-300">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold">{labels.connection}</p>
          <Badge variant="outline">{sampleBadge}</Badge>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label={labels.close}
          className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <X className="size-4" />
        </button>
      </div>
      <p className="mb-1 text-xs font-medium tracking-wide text-muted-foreground uppercase">{labels.url}</p>
      <p className="mb-4 rounded-lg border border-border bg-muted/40 px-3 py-2 font-mono text-xs">{url}</p>
      <p className="mb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">{labels.tools}</p>
      <div className="flex flex-col gap-2">
        {tools.map((tool) => (
          <div
            key={tool.key}
            className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2"
          >
            <div className="min-w-0">
              <p className="truncate font-mono text-xs font-medium">{tool.name}</p>
              <p className="truncate text-xs text-muted-foreground">{tool.description}</p>
            </div>
            <Switch
              checked={enabled[tool.key] ?? false}
              onCheckedChange={(value) => setEnabled((prev) => ({ ...prev, [tool.key]: value }))}
              aria-label={tool.name}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

// Anchor points as percentages of the diagram's bounding box. The source
// column now stacks [heading, node, node, heading, node, node] (two
// department-specific groups of two), the system column stacks [heading,
// node, node]. Percentages approximate the flex column's proportional
// layout (heading rows are shorter than card rows) — exact pixel sync
// isn't needed since the SVG stretches with preserveAspectRatio="none".
const SOURCE_Y = [18, 39, 70, 91];
const SYSTEM_Y = [43, 65];
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
  const panelRef = useRef<HTMLDivElement>(null);

  const [department, setDepartment] = useState<Department>("sales");
  const [activeSource, setActiveSource] = useState(0);
  const [cycle, setCycle] = useState(0);
  const [activeNode, setActiveNode] = useState<ActiveNode>(null);

  const groupHeadings = t.raw(`groups.${department}`) as string[];
  const [group0, group1] = DEPARTMENT_SOURCE_GROUPS[department];
  const renderedSourceKeys: SourceKey[] = [...group0, ...group1];
  const activeSystem = activeSource % SYSTEM_KEYS.length;

  useEffect(() => {
    if (reducedMotion || activeNode) return;
    const id = setInterval(() => {
      setActiveSource((i) => (i + 1) % renderedSourceKeys.length);
      setCycle((c) => c + 1);
    }, CYCLE_MS);
    return () => clearInterval(id);
  }, [reducedMotion, renderedSourceKeys.length, activeNode]);

  useEffect(() => {
    if (!activeNode) return;
    const onPointerDown = (event: PointerEvent) => {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        setActiveNode(null);
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [activeNode]);

  const toggleSource = (key: SourceKey) =>
    setActiveNode((prev) => (prev?.kind === "source" && prev.key === key ? null : { kind: "source", key }));
  const toggleSystem = (key: SystemKey) =>
    setActiveNode((prev) => (prev?.kind === "system" && prev.key === key ? null : { kind: "system", key }));

  const sourceToAgentPath = (i: number) =>
    `M ${SOURCE_X} ${SOURCE_Y[i]} C 30 ${SOURCE_Y[i]}, 30 ${AGENT_POINT.y}, ${AGENT_POINT.x} ${AGENT_POINT.y}`;
  const agentToSystemPath = (i: number) =>
    `M ${AGENT_POINT.x} ${AGENT_POINT.y} C 70 ${AGENT_POINT.y}, 70 ${SYSTEM_Y[i]}, ${SYSTEM_X} ${SYSTEM_Y[i]}`;

  const panelLabels = {
    connection: t("panelLabels.connection"),
    url: t("panelLabels.url"),
    tools: t("panelLabels.tools"),
    close: t("panelLabels.close"),
  };
  const sampleBadge = t("sampleBadge");

  const renderSourceNode = (key: SourceKey) => {
    const i = renderedSourceKeys.indexOf(key);
    const Icon = SOURCE_ICONS[key];
    const expanded = activeNode?.kind === "source" && activeNode.key === key;
    return (
      <div key={key} className="relative">
        <NodeCard
          icon={Icon}
          label={t(`${key}.label`)}
          sublabel={t(`${key}.sublabel`)}
          active={!reducedMotion && i === activeSource}
          pulseKey={cycle}
          interactive
          expanded={expanded}
          onToggle={() => toggleSource(key)}
        />
        {expanded && <SourceFlyout items={t.raw(`flyout.${key}`) as string[]} />}
      </div>
    );
  };

  const renderSystemNode = (key: SystemKey, i: number) => {
    const Icon = SYSTEM_ICONS[key];
    const expanded = activeNode?.kind === "system" && activeNode.key === key;
    return (
      <NodeCard
        key={key}
        icon={Icon}
        label={t(`${key}.label`)}
        sublabel={t(`${key}.sublabel`)}
        active={!reducedMotion && i === activeSystem}
        pulseKey={cycle}
        interactive
        expanded={expanded}
        onToggle={() => toggleSystem(key)}
      />
    );
  };

  const expandedSystem = activeNode?.kind === "system" ? activeNode.key : null;

  return (
    <div ref={panelRef} className="min-w-0 overflow-hidden rounded-2xl border border-border bg-card/50">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 bg-muted/40 px-4 py-3">
        <div aria-hidden className="flex shrink-0 gap-1.5">
          <span className="size-2.5 rounded-full bg-red-400/70" />
          <span className="size-2.5 rounded-full bg-amber-400/70" />
          <span className="size-2.5 rounded-full bg-emerald-400/70" />
        </div>
        <Tabs
          value={department}
          onValueChange={(v) => {
            setDepartment(v as Department);
            setActiveSource(0);
            setCycle((c) => c + 1);
            setActiveNode(null);
          }}
        >
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

        <div className="relative grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,148px)_minmax(0,1fr)] sm:items-center">
          <svg
            aria-hidden
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            className="pointer-events-none absolute inset-0 hidden h-full w-full sm:block"
          >
            {renderedSourceKeys.map((key, i) => (
              <FlowPath
                key={key}
                d={sourceToAgentPath(i)}
                isActive={!reducedMotion && i === activeSource}
                reducedMotion={reducedMotion}
              />
            ))}
            {SYSTEM_KEYS.map((key, i) => (
              <FlowPath
                key={key}
                d={agentToSystemPath(i)}
                isActive={!reducedMotion && i === activeSystem}
                reducedMotion={reducedMotion}
                animateBegin={`${FLOW_DUR_S / 2}s`}
              />
            ))}
            {!reducedMotion && !activeNode && (
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
            <GroupHeading text={groupHeadings[0]} />
            {group0.map(renderSourceNode)}
            <GroupHeading text={groupHeadings[1]} />
            {group1.map(renderSourceNode)}
          </div>

          <div className="min-w-0 w-full">
            <NodeCard icon={Bot} label={t(`agent.${department}.label`)} sublabel={t(`agent.${department}.sublabel`)} active />
          </div>

          <div className="min-w-0 flex flex-col gap-3">
            <GroupHeading text={t("systemsHeading")} />
            {SYSTEM_KEYS.map((key, i) => renderSystemNode(key, i))}
          </div>
        </div>

        {expandedSystem && (
          <SystemConnectionPanel
            key={expandedSystem}
            url={t(`connection.${expandedSystem}.url`)}
            tools={CONNECTION_TOOL_KEYS[expandedSystem].map((toolKey) => ({
              key: toolKey,
              name: t(`connection.${expandedSystem}.tools.${toolKey}.name`),
              description: t(`connection.${expandedSystem}.tools.${toolKey}.description`),
            }))}
            labels={panelLabels}
            sampleBadge={sampleBadge}
            onClose={() => setActiveNode(null)}
          />
        )}
      </div>
    </div>
  );
}
