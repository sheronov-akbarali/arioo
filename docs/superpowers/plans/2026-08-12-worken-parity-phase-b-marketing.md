# worken.ru Parity Phase B: Marketing Site Pixel-Parity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the hero diagram a 4-department tab switcher and a Calls
source card, add a real token-pricing table (sourced from Vercel AI
Gateway's public pricing endpoint) to the pricing page, add a disabled
Telegram CTA to the footer, and restyle the mobile nav from a full-height
side drawer to a top-anchored dropdown panel.

**Architecture:** Four independent tasks, each touching a distinct
marketing component and its own translation keys — no task depends on
another's code. Task 1 rewrites `agent-flow-panel.tsx` in place (same
exported signature `AgentFlowPanel()`, still consumed by `hero.tsx` with no
changes needed there). Task 2 adds a new static data file and a new
component, wired into the existing `/pricing` page below the current tier
grid. Task 3 is a small addition inside `footer.tsx`. Task 4 changes one
prop and one className on the existing `Sheet`-based `mobile-nav.tsx` — no
new UI primitive is introduced.

**Tech Stack:** Next.js App Router, React client components, next-intl,
existing shadcn/ui-style primitives (`Tabs`, `Tooltip`, `Sheet`, `Button`),
inline SVG (unchanged animation mechanism from the existing hero diagram).

## Global Constraints

- `hero.diagram.*` gains new keys (`calls`, `departments`, and a
  restructured `agent` — see Task 1) — all three locale files
  (`en.json`, `ru.json`, `uz.json`) must gain identical key sets, or
  `messages/messages.test.ts` fails.
- **Scope simplification from the design spec, noted here explicitly so a
  reviewer doesn't flag it as a missed requirement:** the spec's Part 1
  illustrated department tabs varying *both* the agent's role label *and*
  which two systems highlight per department (e.g., "Support → Knowledge
  base + Approvals-queue"). This plan implements only the agent
  role/sublabel swap per department; the two system nodes stay CRM +
  Knowledge base for every department. Varying systems per department would
  require adding Approvals/Products as new diagram system entries with new
  icons — a real scope increase the spec only offered as an "e.g.", not a
  hard requirement. The department *tabs* and the *Calls* source card (the
  spec's concrete, load-bearing requirements) are both implemented in full.
- No new npm dependency and no new shadcn/ui primitive is introduced
  anywhere in this plan (Task 4 reuses `Sheet`'s existing `side="top"`
  variant instead of adding a `Popover`/`DropdownMenu` primitive, since
  neither exists in `src/components/ui/` today and adding one is out of
  scope for a marketing-site parity pass).
- Token-pricing table values are the exact figures already fetched from
  `https://ai-gateway.vercel.sh/v1/models` on 2026-08-12, listed verbatim in
  Task 2, Step 1 — do not substitute different numbers.
- UZS is the primary currency display, USD secondary — matches this
  project's existing convention (`src/lib/pricing-data.ts`'s
  `formatUZS`/`formatUSDApprox`, both reused by Task 2 rather than
  reimplemented).
- The footer's new Telegram button must be **disabled with a tooltip**
  ("coming soon" framing), not a dead or placeholder link — matches this
  codebase's established pattern for CTAs that need real third-party
  infrastructure not yet wired up (e.g. `/integrations` "Connect" buttons).

---

## Task 1: Hero diagram — department tabs + Calls source

**Files:**
- Modify: `src/components/marketing/agent-flow-panel.tsx` (full rewrite)
- Modify: `messages/en.json`, `messages/ru.json`, `messages/uz.json`
  (restructure `hero.diagram` keys)

**Interfaces:**
- Produces: `AgentFlowPanel()` — same zero-prop signature as today, still
  imported by `src/components/marketing/hero.tsx:5` as
  `import { AgentFlowPanel } from "./agent-flow-panel"` and rendered as
  `<AgentFlowPanel />` — **no change needed in `hero.tsx`**.
- Consumes: `hero.diagram.*` translation keys, restructured per Step 1
  below.

- [ ] **Step 1: Restructure the `hero.diagram` translation keys in all three locale files**

In `messages/en.json`, find the `"hero"` object's `"diagram"` block:

```json
    "diagram": {
      "sources": "Sources",
      "website": { "label": "Website", "sublabel": "New leads" },
      "telegram": { "label": "Telegram", "sublabel": "Dialogs" },
      "olx": { "label": "OLX.uz", "sublabel": "Listing inquiries" },
      "crm": { "label": "CRM", "sublabel": "Deals" },
      "knowledge": { "label": "Knowledge base", "sublabel": "Q&A" },
      "agent": { "label": "AI Employee", "sublabel": "Qualifies and replies" }
    }
```

Replace it with:

```json
    "diagram": {
      "sources": "Sources",
      "website": { "label": "Website", "sublabel": "New leads" },
      "telegram": { "label": "Telegram", "sublabel": "Dialogs" },
      "olx": { "label": "OLX.uz", "sublabel": "Listing inquiries" },
      "calls": { "label": "Calls", "sublabel": "Phone leads" },
      "crm": { "label": "CRM", "sublabel": "Deals" },
      "knowledge": { "label": "Knowledge base", "sublabel": "Q&A" },
      "departments": {
        "sales": "Sales",
        "support": "Support",
        "hr": "HR",
        "marketing": "Marketing"
      },
      "agent": {
        "sales": { "label": "AI Sales", "sublabel": "Qualifies leads and replies" },
        "support": { "label": "AI Support", "sublabel": "Resolves tickets and escalates" },
        "hr": { "label": "AI HR", "sublabel": "Screens candidates and schedules" },
        "marketing": { "label": "AI Marketing", "sublabel": "Drafts content and campaigns" }
      }
    }
```

In `messages/ru.json`, find the equivalent `"diagram"` block:

```json
    "diagram": {
      "sources": "Источники",
      "website": { "label": "Сайт", "sublabel": "Новые лиды" },
      "telegram": { "label": "Telegram", "sublabel": "Диалоги" },
      "olx": { "label": "OLX.uz", "sublabel": "Запросы по объявлениям" },
      "crm": { "label": "CRM", "sublabel": "Сделки" },
      "knowledge": { "label": "База знаний", "sublabel": "Вопросы и ответы" },
      "agent": { "label": "AI Сотрудник", "sublabel": "Квалифицирует и отвечает" }
    }
```

(If the exact current Russian strings differ slightly from the above, keep
the existing values for `sources`/`website`/`telegram`/`olx`/`crm`/
`knowledge` unchanged and only apply the structural change below.) Replace
with:

```json
    "diagram": {
      "sources": "Источники",
      "website": { "label": "Сайт", "sublabel": "Новые лиды" },
      "telegram": { "label": "Telegram", "sublabel": "Диалоги" },
      "olx": { "label": "OLX.uz", "sublabel": "Запросы по объявлениям" },
      "calls": { "label": "Звонки", "sublabel": "Телефонные лиды" },
      "crm": { "label": "CRM", "sublabel": "Сделки" },
      "knowledge": { "label": "База знаний", "sublabel": "Вопросы и ответы" },
      "departments": {
        "sales": "Продажи",
        "support": "Поддержка",
        "hr": "HR",
        "marketing": "Маркетинг"
      },
      "agent": {
        "sales": { "label": "AI Продажи", "sublabel": "Квалифицирует лиды и отвечает" },
        "support": { "label": "AI Поддержка", "sublabel": "Решает обращения и эскалирует" },
        "hr": { "label": "AI HR", "sublabel": "Отбирает кандидатов и планирует" },
        "marketing": { "label": "AI Маркетинг", "sublabel": "Готовит контент и кампании" }
      }
    }
```

In `messages/uz.json`, find the equivalent `"diagram"` block (same caveat —
keep existing values for the unchanged keys, apply the structural change):

```json
    "diagram": {
      "sources": "Manbalar",
      "website": { "label": "Sayt", "sublabel": "Yangi lidlar" },
      "telegram": { "label": "Telegram", "sublabel": "Muloqotlar" },
      "olx": { "label": "OLX.uz", "sublabel": "E'lon so'rovlari" },
      "calls": { "label": "Qo'ng'iroqlar", "sublabel": "Telefon lidlari" },
      "crm": { "label": "CRM", "sublabel": "Bitimlar" },
      "knowledge": { "label": "Bilim bazasi", "sublabel": "Savol-javob" },
      "departments": {
        "sales": "Sotuv",
        "support": "Qo'llab-quvvatlash",
        "hr": "HR",
        "marketing": "Marketing"
      },
      "agent": {
        "sales": { "label": "AI Sotuv", "sublabel": "Lidlarni malakalashtiradi va javob beradi" },
        "support": { "label": "AI Qo'llab-quvvatlash", "sublabel": "Murojaatlarni hal qiladi va eskalatsiya qiladi" },
        "hr": { "label": "AI HR", "sublabel": "Nomzodlarni saralaydi va uchrashuv belgilaydi" },
        "marketing": { "label": "AI Marketing", "sublabel": "Kontent va kampaniyalar tayyorlaydi" }
      }
    }
```

- [ ] **Step 2: Run the locale-key-parity test**

Run: `npx vitest run messages/messages.test.ts`
Expected: PASS.

- [ ] **Step 3: Rewrite `agent-flow-panel.tsx`**

Replace the full contents of `src/components/marketing/agent-flow-panel.tsx`:

```tsx
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
    <div className="rounded-2xl border border-border bg-card/50 p-6">
      <Tabs value={department} onValueChange={(v) => setDepartment(v as Department)}>
        <TabsList className="mb-4">
          {DEPARTMENT_KEYS.map((key) => (
            <TabsTrigger key={key} value={key}>
              {t(`departments.${key}`)}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
      <p className="mb-4 text-xs font-medium tracking-wide text-muted-foreground uppercase">
        {t("sources")}
      </p>
      <div className="relative grid grid-cols-[1fr_auto_1fr] items-center gap-3">
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

        <div className="flex flex-col gap-3">
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

        <div className="flex flex-col gap-3">
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
```

Notes for the implementer:
- `SOURCE_Y` grew from 3 to 4 entries (`[8, 36, 64, 92]`) to fit the new
  Calls source card evenly — the previous `[12, 50, 88]` spacing pattern
  is extended the same way, just for 4 rows instead of 3.
- `department` state is independent of `activeSource`/`activeSystem` — the
  tabs are a user-controlled selection (via `Tabs`/`onValueChange`), not
  part of the existing auto-cycling animation, so switching tabs doesn't
  reset or interfere with the source/system cycle already running.
- Everything else (the `useReducedMotion` hook, the SVG path/animation
  mechanics, the `Node` component) is unchanged from the current file.

- [ ] **Step 4: Typecheck and lint**

Run: `npx tsc --noEmit -p tsconfig.json && npm run lint`
Expected: both clean.

- [ ] **Step 5: Run the full unit suite and build**

Run: `npx vitest run && npm run build`
Expected: all tests pass; build succeeds.

- [ ] **Step 6: Manual verification**

With `npm run dev` running, visit `/uz` (and `/ru`, `/en`): confirm 4 tabs
render above "Manbalar/Источники/Sources", clicking each instantly changes
the center agent node's label/sublabel, a 4th "Calls"/"Qo'ng'iroqlar" source
card appears and participates in the existing cycling animation, and
`prefers-reduced-motion` still renders a static (non-cycling) diagram as
before.

- [ ] **Step 7: Commit**

```bash
git add src/components/marketing/agent-flow-panel.tsx messages/en.json messages/ru.json messages/uz.json
git commit -m "feat: add department tabs and a Calls source to the hero diagram"
```

---

## Task 2: Token-pricing table on the pricing page

**Files:**
- Create: `src/lib/token-pricing-data.ts`
- Create: `src/components/marketing/token-pricing-table.tsx`
- Modify: `src/lib/pricing-data.ts:53` (export `UZS_PER_USD`)
- Modify: `src/app/[locale]/(marketing)/pricing/page.tsx` (render the new table)
- Modify: `messages/en.json`, `messages/ru.json`, `messages/uz.json` (add
  `pricing.tokenTable.*`)

**Interfaces:**
- Consumes: `UZS_PER_USD` (exported from `src/lib/pricing-data.ts`, Step 1
  below).
- Produces: `TokenPricingTable()` — a named export, no props, rendered once
  on the pricing page below `<PricingTable />`.

- [ ] **Step 1: Export `UZS_PER_USD` from `pricing-data.ts`**

In `src/lib/pricing-data.ts`, change:

```ts
const UZS_PER_USD = 12700;
```

to:

```ts
export const UZS_PER_USD = 12700;
```

- [ ] **Step 2: Add the `pricing.tokenTable` translation namespace to all three locale files**

In `messages/en.json`, inside the `"pricing": { ... }` object, add a new
`"tokenTable"` key (as a sibling of `"tiers"`, e.g. right after `"cta"` and
before `"tiers"`):

```json
    "tokenTable": {
      "title": "Model-by-model token pricing",
      "subtitle": "Plan credits are spent per token, at the exact rate each model's provider charges — no markup.",
      "modelColumn": "Model",
      "promptColumn": "Prompt / 1,000 tokens",
      "completionColumn": "Completion / 1,000 tokens",
      "priceColumn": "Price / 1,000 tokens",
      "embeddingTitle": "Embedding models",
      "footnote": "More models are available directly inside each AI employee's model picker."
    }
```

In `messages/ru.json`, same position:

```json
    "tokenTable": {
      "title": "Цены на токены по моделям",
      "subtitle": "Кредиты тарифа расходуются за токен, по точной цене провайдера модели — без наценки.",
      "modelColumn": "Модель",
      "promptColumn": "Промпт / 1000 токенов",
      "completionColumn": "Ответ / 1000 токенов",
      "priceColumn": "Цена / 1000 токенов",
      "embeddingTitle": "Модели эмбеддингов",
      "footnote": "Больше моделей доступно прямо в селекторе модели каждого AI-сотрудника."
    }
```

In `messages/uz.json`, same position:

```json
    "tokenTable": {
      "title": "Model bo'yicha token narxlari",
      "subtitle": "Tarif kreditlari har bir model provayderining aniq narxida, ustama qo'shilmasdan token bo'yicha sarflanadi.",
      "modelColumn": "Model",
      "promptColumn": "Prompt / 1000 token",
      "completionColumn": "Javob / 1000 token",
      "priceColumn": "Narx / 1000 token",
      "embeddingTitle": "Embedding modellar",
      "footnote": "Har bir AI xodimning model tanlagichida yana ko'proq model mavjud."
    }
```

- [ ] **Step 3: Run the locale-key-parity test**

Run: `npx vitest run messages/messages.test.ts`
Expected: PASS.

- [ ] **Step 4: Create `token-pricing-data.ts`**

Create `src/lib/token-pricing-data.ts`:

```ts
import { UZS_PER_USD } from "./pricing-data";

export type TokenPriceModel = {
  id: string;
  name: string;
  // USD price per single token, as returned by the AI Gateway pricing
  // endpoint (https://ai-gateway.vercel.sh/v1/models, fetched 2026-08-12).
  inputPerToken: number;
  outputPerToken: number;
};

export type TokenPriceProvider = {
  key: string;
  name: string;
  models: TokenPriceModel[];
};

// Source: https://ai-gateway.vercel.sh/v1/models (fetched 2026-08-12).
// A representative seed across 5 providers, not the endpoint's full
// 30+-provider catalog — see the design spec's "Token-pricing table
// sourcing decision" for why these specific numbers were chosen over
// worken.ru's own (unrelated) markup.
export const TOKEN_PRICING_PROVIDERS: TokenPriceProvider[] = [
  {
    key: "alibaba",
    name: "Alibaba (Qwen)",
    models: [
      { id: "qwen-3-14b", name: "Qwen3-14B", inputPerToken: 0.00000012, outputPerToken: 0.00000024 },
      { id: "qwen-3-30b", name: "Qwen3-30B-A3B", inputPerToken: 0.00000012, outputPerToken: 0.0000005 },
      { id: "qwen-3-32b", name: "Qwen 3 32B", inputPerToken: 0.00000016, outputPerToken: 0.00000064 },
      { id: "qwen-3-235b", name: "Qwen3 235B A22B", inputPerToken: 0.00000022, outputPerToken: 0.00000088 },
      { id: "qwen-3.5-flash", name: "Qwen 3.5 Flash", inputPerToken: 0.0000001, outputPerToken: 0.0000004 },
      { id: "qwen-3.6-plus", name: "Qwen 3.6 Plus", inputPerToken: 0.0000005, outputPerToken: 0.000003 },
      { id: "qwen-3.8-max", name: "Qwen 3.8 Max", inputPerToken: 0.000002, outputPerToken: 0.000006 },
      { id: "qwen-3.7-max", name: "Qwen 3.7 Max", inputPerToken: 0.0000025, outputPerToken: 0.0000075 },
    ],
  },
  {
    key: "amazon",
    name: "Amazon (Nova)",
    models: [
      { id: "nova-micro", name: "Nova Micro", inputPerToken: 0.000000035, outputPerToken: 0.00000014 },
      { id: "nova-lite", name: "Nova Lite", inputPerToken: 0.00000006, outputPerToken: 0.00000024 },
      { id: "nova-2-lite", name: "Nova 2 Lite", inputPerToken: 0.0000003, outputPerToken: 0.0000025 },
      { id: "nova-pro", name: "Nova Pro", inputPerToken: 0.0000008, outputPerToken: 0.0000032 },
    ],
  },
  {
    key: "anthropic",
    name: "Anthropic (Claude)",
    models: [
      { id: "claude-3-haiku", name: "Claude 3 Haiku", inputPerToken: 0.00000025, outputPerToken: 0.00000125 },
      { id: "claude-haiku-4.5", name: "Claude Haiku 4.5", inputPerToken: 0.000001, outputPerToken: 0.000005 },
      { id: "claude-sonnet-5", name: "Claude Sonnet 5", inputPerToken: 0.000002, outputPerToken: 0.00001 },
      { id: "claude-sonnet-4", name: "Claude Sonnet 4", inputPerToken: 0.000003, outputPerToken: 0.000015 },
      { id: "claude-opus-5", name: "Claude Opus 5", inputPerToken: 0.000005, outputPerToken: 0.000025 },
      { id: "claude-opus-4.5", name: "Claude Opus 4.5", inputPerToken: 0.000005, outputPerToken: 0.000025 },
      { id: "claude-opus-4", name: "Claude Opus 4", inputPerToken: 0.000015, outputPerToken: 0.000075 },
    ],
  },
  {
    key: "deepseek",
    name: "DeepSeek",
    models: [
      { id: "deepseek-v4-flash", name: "DeepSeek V4 Flash", inputPerToken: 0.0000002, outputPerToken: 0.0000004 },
      { id: "deepseek-v3", name: "DeepSeek V3 0324", inputPerToken: 0.00000027, outputPerToken: 0.00000112 },
      { id: "deepseek-r1", name: "DeepSeek-R1", inputPerToken: 0.00000135, outputPerToken: 0.0000054 },
    ],
  },
  {
    key: "cohere",
    name: "Cohere",
    models: [
      { id: "command-a", name: "Command A", inputPerToken: 0.0000025, outputPerToken: 0.00001 },
    ],
  },
];

export type EmbeddingPriceModel = {
  id: string;
  name: string;
  pricePerToken: number;
};

export const TOKEN_PRICING_EMBEDDINGS: EmbeddingPriceModel[] = [
  { id: "qwen3-embedding-0.6b", name: "Qwen3 Embedding 0.6B", pricePerToken: 0.00000001 },
  { id: "qwen3-embedding-4b", name: "Qwen3 Embedding 4B", pricePerToken: 0.00000002 },
  { id: "qwen3-embedding-8b", name: "Qwen3 Embedding 8B", pricePerToken: 0.00000005 },
  { id: "titan-embed-text-v2", name: "Titan Text Embeddings V2", pricePerToken: 0.00000002 },
  { id: "embed-v4.0", name: "Embed v4.0", pricePerToken: 0.00000012 },
];

// Both formatters take a USD-per-single-token rate and return the price for
// 1,000 tokens, matching this table's column headers (`promptColumn` /
// `completionColumn` / `priceColumn` all say "/ 1,000 tokens").
export function formatUzsPer1k(usdPerToken: number): string {
  const uzs = usdPerToken * 1000 * UZS_PER_USD;
  return uzs.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).replace(/,/g, " ");
}

export function formatUsdPer1k(usdPerToken: number): string {
  const usd = usdPerToken * 1000;
  return `$${usd.toFixed(4)}`;
}
```

- [ ] **Step 5: Create `token-pricing-table.tsx`**

Create `src/components/marketing/token-pricing-table.tsx`:

```tsx
import { useTranslations } from "next-intl";
import {
  TOKEN_PRICING_PROVIDERS,
  TOKEN_PRICING_EMBEDDINGS,
  formatUzsPer1k,
  formatUsdPer1k,
} from "@/lib/token-pricing-data";

export function TokenPricingTable() {
  const t = useTranslations("pricing.tokenTable");

  return (
    <div className="mt-20">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="text-2xl font-bold tracking-tight">{t("title")}</h2>
        <p className="mt-3 text-muted-foreground">{t("subtitle")}</p>
      </div>

      <div className="mt-10 space-y-10">
        {TOKEN_PRICING_PROVIDERS.map((provider) => (
          <div key={provider.key}>
            <h3 className="mb-3 text-sm font-semibold tracking-wide text-muted-foreground uppercase">
              {provider.name}
            </h3>
            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="w-full text-left text-sm">
                <thead className="bg-muted/50 text-muted-foreground">
                  <tr>
                    <th className="px-4 py-2 font-medium">{t("modelColumn")}</th>
                    <th className="px-4 py-2 font-medium">{t("promptColumn")}</th>
                    <th className="px-4 py-2 font-medium">{t("completionColumn")}</th>
                  </tr>
                </thead>
                <tbody>
                  {provider.models.map((model) => (
                    <tr key={model.id} className="border-t border-border">
                      <td className="px-4 py-2">{model.name}</td>
                      <td className="px-4 py-2">
                        {formatUzsPer1k(model.inputPerToken)} UZS
                        <span className="ml-1 text-xs text-muted-foreground">
                          ({formatUsdPer1k(model.inputPerToken)})
                        </span>
                      </td>
                      <td className="px-4 py-2">
                        {formatUzsPer1k(model.outputPerToken)} UZS
                        <span className="ml-1 text-xs text-muted-foreground">
                          ({formatUsdPer1k(model.outputPerToken)})
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}

        <div>
          <h3 className="mb-3 text-sm font-semibold tracking-wide text-muted-foreground uppercase">
            {t("embeddingTitle")}
          </h3>
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/50 text-muted-foreground">
                <tr>
                  <th className="px-4 py-2 font-medium">{t("modelColumn")}</th>
                  <th className="px-4 py-2 font-medium">{t("priceColumn")}</th>
                </tr>
              </thead>
              <tbody>
                {TOKEN_PRICING_EMBEDDINGS.map((model) => (
                  <tr key={model.id} className="border-t border-border">
                    <td className="px-4 py-2">{model.name}</td>
                    <td className="px-4 py-2">
                      {formatUzsPer1k(model.pricePerToken)} UZS
                      <span className="ml-1 text-xs text-muted-foreground">
                        ({formatUsdPer1k(model.pricePerToken)})
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <p className="mt-6 text-center text-xs text-muted-foreground">{t("footnote")}</p>
    </div>
  );
}
```

- [ ] **Step 6: Render it on the pricing page**

In `src/app/[locale]/(marketing)/pricing/page.tsx`, add the import:

```tsx
import { TokenPricingTable } from "@/components/marketing/token-pricing-table";
```

and change:

```tsx
      <div className="mt-12">
        <PricingTable />
      </div>
```

to:

```tsx
      <div className="mt-12">
        <PricingTable />
      </div>
      <TokenPricingTable />
```

- [ ] **Step 7: Typecheck and lint**

Run: `npx tsc --noEmit -p tsconfig.json && npm run lint`
Expected: both clean.

- [ ] **Step 8: Run the full unit suite and build**

Run: `npx vitest run && npm run build`
Expected: all tests pass; build succeeds.

- [ ] **Step 9: Manual verification**

With `npm run dev` running, visit `/uz/pricing`: confirm a new "Model
bo'yicha token narxlari" section renders below the 5-tier grid, grouped by
provider (Alibaba, Amazon, Anthropic, DeepSeek, Cohere) plus a separate
"Embedding modellar" table, each row showing a UZS price with a USD figure
in parentheses. Repeat for `/ru/pricing` and `/en/pricing`.

- [ ] **Step 10: Commit**

```bash
git add src/lib/token-pricing-data.ts src/components/marketing/token-pricing-table.tsx src/lib/pricing-data.ts src/app/\[locale\]/\(marketing\)/pricing/page.tsx messages/en.json messages/ru.json messages/uz.json
git commit -m "feat: add a per-model token-pricing table to the pricing page"
```

---

## Task 3: Footer Telegram CTA (disabled, coming soon)

**Files:**
- Modify: `src/components/marketing/footer.tsx`
- Modify: `messages/en.json`, `messages/ru.json`, `messages/uz.json` (add
  `footer.telegramCta`, `footer.comingSoon`)

**Interfaces:** None — purely additive JSX inside the existing `Footer()`
component, no new exports.

- [ ] **Step 1: Add the two new translation keys to all three locale files**

In `messages/en.json`, inside the `"footer": { ... }` object, add two new
keys (as siblings of `"tagline"`):

```json
    "telegramCta": "Message us on Telegram",
    "comingSoon": "Coming soon",
```

In `messages/ru.json`, same position:

```json
    "telegramCta": "Написать в Telegram",
    "comingSoon": "Скоро",
```

In `messages/uz.json`, same position:

```json
    "telegramCta": "Telegram orqali yozing",
    "comingSoon": "Tez orada",
```

- [ ] **Step 2: Run the locale-key-parity test**

Run: `npx vitest run messages/messages.test.ts`
Expected: PASS.

- [ ] **Step 3: Add the button to `footer.tsx`**

In `src/components/marketing/footer.tsx`, add these imports at the top:

```tsx
import { Button } from "@/components/ui/button";
import { Send } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
```

Then change:

```tsx
        <div>
          <p className="font-semibold text-foreground">Arioo</p>
          <p className="mt-2 max-w-xs text-muted-foreground">{t("tagline")}</p>
        </div>
```

to:

```tsx
        <div>
          <p className="font-semibold text-foreground">Arioo</p>
          <p className="mt-2 max-w-xs text-muted-foreground">{t("tagline")}</p>
          <Tooltip>
            <TooltipTrigger
              render={
                <Button variant="outline" size="sm" disabled className="mt-4 gap-2" />
              }
            >
              <Send className="size-4" />
              {t("telegramCta")}
            </TooltipTrigger>
            <TooltipContent>{t("comingSoon")}</TooltipContent>
          </Tooltip>
        </div>
```

- [ ] **Step 4: Typecheck and lint**

Run: `npx tsc --noEmit -p tsconfig.json && npm run lint`
Expected: both clean.

- [ ] **Step 5: Run the full unit suite and build**

Run: `npx vitest run && npm run build`
Expected: all tests pass; build succeeds.

- [ ] **Step 6: Manual verification**

With `npm run dev` running, scroll to the footer on any marketing page:
confirm the "Telegram orqali yozing" button renders disabled (not
clickable), and hovering it shows a "Tez orada" tooltip.

- [ ] **Step 7: Commit**

```bash
git add src/components/marketing/footer.tsx messages/en.json messages/ru.json messages/uz.json
git commit -m "feat: add a disabled Telegram CTA to the footer"
```

---

## Task 4: Mobile nav — top-anchored dropdown panel

**Files:**
- Modify: `src/components/marketing/mobile-nav.tsx`

**Interfaces:** None — internal styling/prop change only, `MobileNav()`
keeps its existing zero-prop signature and usage in `header.tsx`.

- [ ] **Step 1: Change the Sheet's side and add rounded-bottom-corner styling**

In `src/components/marketing/mobile-nav.tsx`, change:

```tsx
      <SheetContent side="right" className="w-72">
```

to:

```tsx
      <SheetContent side="top" className="rounded-b-2xl border-x-0 border-t-0">
```

(`side="top"` switches this `SheetContent` to the primitive's existing
top-anchored, auto-height variant — see `data-[side=top]:inset-x-0
data-[side=top]:top-0 data-[side=top]:h-auto data-[side=top]:border-b` in
`src/components/ui/sidebar.tsx`'s sibling `src/components/ui/sheet.tsx` —
which already matches worken's "panel drops down from the header, not a
full-height side drawer" pattern with no new primitive needed.
`border-x-0 border-t-0` removes the left/right/top borders a full-bleed top
panel doesn't need, keeping only the bottom border the primitive already
adds via `data-[side=top]:border-b`.)

- [ ] **Step 2: Typecheck and lint**

Run: `npx tsc --noEmit -p tsconfig.json && npm run lint`
Expected: both clean.

- [ ] **Step 3: Run the full unit suite and build**

Run: `npx vitest run && npm run build`
Expected: all tests pass; build succeeds.

- [ ] **Step 4: Manual verification**

With `npm run dev` running, shrink the browser to a mobile width, open the
hamburger menu: confirm the panel now drops down from the top with rounded
bottom corners and a dimmed backdrop below it, instead of sliding in from
the right edge as a full-height drawer. Confirm every link (Pricing,
Partners, dashboard/sign-in) and the language/theme toggles still work and
still close the menu on click.

- [ ] **Step 5: Commit**

```bash
git add src/components/marketing/mobile-nav.tsx
git commit -m "feat: restyle the mobile menu as a top-anchored dropdown panel"
```
