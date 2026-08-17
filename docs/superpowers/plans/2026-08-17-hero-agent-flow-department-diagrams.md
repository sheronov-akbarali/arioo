# Hero agent-flow diagrammasi — bo'lim-asosli tuzilma + interaktiv node'lar Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Landing sahifadagi hero agent-flow diagrammasini (`src/components/marketing/agent-flow-panel.tsx`) har bir bo'lim (Sotuv/Support/HR/Marketing) uchun o'ziga xos manba-guruhlash, tavsif va "chips" bilan, hamda node'larga bosilganda ochiladigan interaktiv panellar (manba node → namuna-chip flyout, tizim node → ulanish/konfiguratsiya paneli) bilan boyitish — worken.ru'da kuzatilgan animatsiya va o'zaro ta'sir sifatiga yetkazish.

**Architecture:** Department→struktura xaritasi alohida data faylida (`agent-flow-data.ts`) saqlanadi; asosiy komponent shu xaritadan o'qib SVG chiziqlar + guruhlangan node ustunlarini render qiladi. Har node bosiladigan `<button>` bo'ladi; bitta vaqtda faqat bitta node "ochiq" (flyout yoki panel) bo'ladi, state — `AgentFlowPanel` darajasida.

**Tech Stack:** Next.js App Router (client component), next-intl, Tailwind v4, `tw-animate-css` (allaqachon global import qilingan), `@base-ui/react/switch` (yangi shadcn-uslub `Switch` wrapper), lucide-react ikonkalar.

**Spec:** `docs/superpowers/specs/2026-08-17-hero-agent-flow-department-diagrams-design.md`

## Global Constraints

- Node kontenti Arioo'ning haqiqiy kanallari bilan cheklanadi: Website, Telegram, WhatsApp, Qo'ng'iroqlar (manbalar), CRM, Bilim bazasi (tizimlar) — worken'dagi Avito/HH.ru/Zoom/SIP kabi Arioo'da yo'q integratsiyalar ishlatilmaydi.
- `SystemConnectionPanel`dagi URL har doim aniq demo domen bo'ladi: `{tizim}.demo.arioo.uz` shaklida; token/hisob ma'lumotlari umuman ko'rsatilmaydi (faqat URL + vosita ro'yxati, hech qanday "Bearer ..." matn yo'q — soxta kredensial hech qachon ko'rsatilmaydi). Panelda "Namuna"/"Демо"/"Demo" badge doim ko'rinadi.
- Tool-toggle'lar (`Switch`) faqat local React state — hech qanday server action yoki fetch chaqirilmaydi.
- Barcha yangi matn 3 tilda (`messages/uz.json`, `messages/ru.json`, `messages/en.json`) qo'shiladi — bitta til fayli o'tkazib yuborilmaydi.
- Mavjud `tsc --noEmit`, `npx vitest run`, `npx playwright test tests/e2e/marketing.spec.ts` har bir vazifadan keyin (kamida oxirgi 3 vazifada) o'tishi shart.
- `prefers-reduced-motion` qo'llab-quvvatlashi saqlanadi (mavjud `useReducedMotion` hook o'zgarmaydi).

---

## Fayl tuzilishi

- **Yaratiladi:** `src/components/ui/switch.tsx` — shadcn-uslub Switch wrapper (`@base-ui/react/switch` asosida)
- **Yaratiladi:** `src/components/marketing/agent-flow-data.ts` — department→source-group/system xaritasi, ikonka xaritalari, turlar
- **Qayta yoziladi:** `src/components/marketing/agent-flow-panel.tsx` — asosiy komponent + `NodeCard`/`SourceFlyout`/`SystemConnectionPanel` ichki komponentlari
- **Modify:** `messages/uz.json`, `messages/ru.json`, `messages/en.json` — `hero.diagram` bloki kengaytiriladi
- **Modify:** `tests/e2e/marketing.spec.ts` — department almashtirish + node klik uchun yangi test

---

### Task 1: `Switch` UI primitivi

**Files:**
- Create: `src/components/ui/switch.tsx`

**Interfaces:**
- Produces: `Switch` komponenti, props: `{ checked: boolean; onCheckedChange?: (checked: boolean) => void; className?: string; "aria-label"?: string }` (barcha boshqa `@base-ui/react/switch` `Root.Props` ham qabul qilinadi, `...props` orqali)

- [ ] **Step 1: Komponentni yozish**

`src/components/ui/switch.tsx`:

```tsx
"use client"

import { Switch as SwitchPrimitive } from "@base-ui/react/switch"

import { cn } from "@/lib/utils"

function Switch({
  className,
  ...props
}: SwitchPrimitive.Root.Props) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        "peer inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border border-transparent bg-muted outline-none transition-colors data-checked:bg-brand focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className="block size-4 translate-x-0.5 rounded-full bg-background shadow-sm transition-transform data-checked:translate-x-[18px]"
      />
    </SwitchPrimitive.Root>
  )
}

export { Switch }
```

- [ ] **Step 2: Tekshirish**

Run: `npx tsc --noEmit`
Expected: xatosiz o'tadi (yangi fayl mavjud `cn` util'dan foydalanadi, boshqa hech narsaga bog'liq emas).

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/switch.tsx
git commit -m "feat: add Switch UI primitive for agent-flow connection panel"
```

---

### Task 2: `agent-flow-data.ts` — department→struktura xaritasi

**Files:**
- Create: `src/components/marketing/agent-flow-data.ts`

**Interfaces:**
- Produces: `DEPARTMENT_KEYS`, `Department` turi, `SOURCE_KEYS`, `SourceKey` turi, `SYSTEM_KEYS`, `SystemKey` turi, `SOURCE_ICONS: Record<SourceKey, LucideIcon>`, `SYSTEM_ICONS: Record<SystemKey, LucideIcon>`, `DEPARTMENT_SOURCE_GROUPS: Record<Department, [SourceKey[], SourceKey[]]>`, `CONNECTION_TOOL_KEYS: Record<SystemKey, [string, string]>`

- [ ] **Step 1: Faylni yozish**

`src/components/marketing/agent-flow-data.ts`:

```ts
import { Globe, Send, MessageCircle, PhoneCall, Database, BookOpen, type LucideIcon } from "lucide-react";

export const DEPARTMENT_KEYS = ["sales", "support", "hr", "marketing"] as const;
export type Department = (typeof DEPARTMENT_KEYS)[number];

export const SOURCE_KEYS = ["website", "telegram", "whatsapp", "calls"] as const;
export type SourceKey = (typeof SOURCE_KEYS)[number];

export const SYSTEM_KEYS = ["crm", "knowledge"] as const;
export type SystemKey = (typeof SYSTEM_KEYS)[number];

export const SOURCE_ICONS: Record<SourceKey, LucideIcon> = {
  website: Globe,
  telegram: Send,
  whatsapp: MessageCircle,
  calls: PhoneCall,
};

export const SYSTEM_ICONS: Record<SystemKey, LucideIcon> = {
  crm: Database,
  knowledge: BookOpen,
};

// Each department groups the same 4 real Arioo channels into two labeled
// groups of two. The grouping (and each group's i18n heading) differs per
// department, mirroring worken.ru's per-scenario grouping, while the
// underlying channels stay Arioo's actual ones — never invented
// integrations like Avito/HH.ru/Zoom/SIP.
export const DEPARTMENT_SOURCE_GROUPS: Record<Department, [SourceKey[], SourceKey[]]> = {
  sales: [
    ["website", "telegram"],
    ["whatsapp", "calls"],
  ],
  support: [
    ["telegram", "whatsapp"],
    ["website", "calls"],
  ],
  hr: [
    ["website", "calls"],
    ["telegram", "whatsapp"],
  ],
  marketing: [
    ["whatsapp", "telegram"],
    ["website", "calls"],
  ],
};

// Each system node exposes exactly two demo "remote tools" in its
// connection panel — shared across departments (the panel demonstrates the
// interaction pattern, not a per-department-unique tool catalog).
export const CONNECTION_TOOL_KEYS: Record<SystemKey, [string, string]> = {
  crm: ["createDeal", "updateStage"],
  knowledge: ["searchDocs", "suggestAnswer"],
};
```

- [ ] **Step 2: Tekshirish**

Run: `npx tsc --noEmit`
Expected: xatosiz o'tadi.

- [ ] **Step 3: Commit**

```bash
git add src/components/marketing/agent-flow-data.ts
git commit -m "feat: add per-department agent-flow data model"
```

---

### Task 3: i18n kalitlarini qo'shish (uz/ru/en)

**Files:**
- Modify: `messages/uz.json`
- Modify: `messages/ru.json`
- Modify: `messages/en.json`

**Interfaces:**
- Produces: `hero.diagram.groups.{dept}` (2-elementli massiv), `hero.diagram.description.{dept}` (string), `hero.diagram.chips.{dept}` (3-elementli massiv), `hero.diagram.systemsHeading` (string), `hero.diagram.sampleBadge` (string), `hero.diagram.flyout.{sourceKey}` (2-elementli massiv), `hero.diagram.connection.{systemKey}.url` (string), `hero.diagram.connection.{systemKey}.tools.{toolKey}.name`/`.description` (string), `hero.diagram.panelLabels.{connection,url,tools,close}` (string). `hero.diagram.sources` kaliti o'chiriladi (endi guruh sarlavhalari uni almashtiradi, hech qayerda ishlatilmaydi).

- [ ] **Step 1: `messages/uz.json`dagi `hero.diagram` blokini almashtirish**

Joriy (1-49 qatorlar atrofida) `"diagram": { ... }` blokini toping va butunlay shu bilan almashtiring:

```json
    "diagram": {
      "website": { "label": "Veb-sayt", "sublabel": "Yangi lidlar" },
      "telegram": { "label": "Telegram", "sublabel": "Dialoglar" },
      "whatsapp": { "label": "WhatsApp", "sublabel": "Mijozlar bilan yozishmalar" },
      "calls": { "label": "Qo'ng'iroqlar", "sublabel": "Telefon lidlari" },
      "crm": { "label": "CRM", "sublabel": "Bitimlar" },
      "knowledge": { "label": "Bilim bazasi", "sublabel": "Savol-javoblar" },
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
      },
      "groups": {
        "sales": ["Manbalar", "Muloqot"],
        "support": ["Murojaatlar", "Qo'shimcha"],
        "hr": ["Arizalar", "Suhbatlar"],
        "marketing": ["Kanallar", "Aloqa"]
      },
      "description": {
        "sales": "Lidlarni malakalashtiradi, savollarga javob beradi va CRM'ga yozadi.",
        "support": "Murojaatlarni hal qiladi, bilim bazasidan javob topadi va kerak bo'lsa odamga topshiradi.",
        "hr": "Arizalarni qayta ishlaydi, nomzodlarga javob beradi va suhbat rejalashtiradi.",
        "marketing": "Xabarlarni yig'adi, kontent tayyorlashda yordam beradi va so'rovlarni segmentlaydi."
      },
      "chips": {
        "sales": ["Lidlar", "Uchrashuvlar", "CRM"],
        "support": ["Chiptalar", "Bilim bazasi", "Eskalatsiya"],
        "hr": ["Arizalar", "Skrining", "Suhbat"],
        "marketing": ["Kontent", "Lidlar", "Segmentatsiya"]
      },
      "systemsHeading": "Tizimlar",
      "sampleBadge": "Namuna",
      "flyout": {
        "website": ["Aziz", "Malika"],
        "telegram": ["@aziz_dev", "@malika_uz"],
        "whatsapp": ["+998 90 123-45-67", "+998 91 234-56-78"],
        "calls": ["+998 93 555-11-22", "+998 94 666-33-44"]
      },
      "connection": {
        "crm": {
          "url": "crm.demo.arioo.uz",
          "tools": {
            "createDeal": { "name": "createDeal", "description": "Yangi bitim yaratadi" },
            "updateStage": { "name": "updateStage", "description": "Bosqichni yangilaydi" }
          }
        },
        "knowledge": {
          "url": "kb.demo.arioo.uz",
          "tools": {
            "searchDocs": { "name": "searchDocs", "description": "Hujjatlardan qidiradi" },
            "suggestAnswer": { "name": "suggestAnswer", "description": "Javob taklif qiladi" }
          }
        }
      },
      "panelLabels": {
        "connection": "Ulanish",
        "url": "URL",
        "tools": "Vositalar",
        "close": "Yopish"
      }
    }
```

- [ ] **Step 2: `messages/ru.json`dagi `hero.diagram` blokini almashtirish**

```json
    "diagram": {
      "website": { "label": "Сайт", "sublabel": "Новые лиды" },
      "telegram": { "label": "Telegram", "sublabel": "Диалоги" },
      "whatsapp": { "label": "WhatsApp", "sublabel": "Переписка с клиентами" },
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
      },
      "groups": {
        "sales": ["Источники", "Общение"],
        "support": ["Обращения", "Дополнительно"],
        "hr": ["Заявки", "Собеседования"],
        "marketing": ["Каналы", "Связь"]
      },
      "description": {
        "sales": "Квалифицирует лиды, отвечает на вопросы и записывает всё в CRM.",
        "support": "Решает обращения, ищет ответ в базе знаний и при необходимости передаёт человеку.",
        "hr": "Обрабатывает заявки, отвечает кандидатам и планирует собеседования.",
        "marketing": "Собирает заявки, помогает готовить контент и сегментирует запросы."
      },
      "chips": {
        "sales": ["Лиды", "Встречи", "CRM"],
        "support": ["Тикеты", "База знаний", "Эскалация"],
        "hr": ["Заявки", "Скрининг", "Собеседование"],
        "marketing": ["Контент", "Лиды", "Сегментация"]
      },
      "systemsHeading": "Системы",
      "sampleBadge": "Демо",
      "flyout": {
        "website": ["Азиз", "Малика"],
        "telegram": ["@aziz_dev", "@malika_uz"],
        "whatsapp": ["+998 90 123-45-67", "+998 91 234-56-78"],
        "calls": ["+998 93 555-11-22", "+998 94 666-33-44"]
      },
      "connection": {
        "crm": {
          "url": "crm.demo.arioo.uz",
          "tools": {
            "createDeal": { "name": "createDeal", "description": "Создаёт новую сделку" },
            "updateStage": { "name": "updateStage", "description": "Обновляет этап" }
          }
        },
        "knowledge": {
          "url": "kb.demo.arioo.uz",
          "tools": {
            "searchDocs": { "name": "searchDocs", "description": "Ищет по документам" },
            "suggestAnswer": { "name": "suggestAnswer", "description": "Предлагает ответ" }
          }
        }
      },
      "panelLabels": {
        "connection": "Подключение",
        "url": "URL",
        "tools": "Инструменты",
        "close": "Закрыть"
      }
    }
```

- [ ] **Step 3: `messages/en.json`dagi `hero.diagram` blokini almashtirish**

```json
    "diagram": {
      "website": { "label": "Website", "sublabel": "New leads" },
      "telegram": { "label": "Telegram", "sublabel": "Dialogs" },
      "whatsapp": { "label": "WhatsApp", "sublabel": "Customer conversations" },
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
      },
      "groups": {
        "sales": ["Sources", "Conversations"],
        "support": ["Requests", "Additional"],
        "hr": ["Applications", "Interviews"],
        "marketing": ["Channels", "Outreach"]
      },
      "description": {
        "sales": "Qualifies leads, answers questions, and writes everything to the CRM.",
        "support": "Resolves requests, finds answers in the knowledge base, and hands off to a human when needed.",
        "hr": "Processes applications, replies to candidates, and schedules interviews.",
        "marketing": "Collects requests, helps draft content, and segments inquiries."
      },
      "chips": {
        "sales": ["Leads", "Meetings", "CRM"],
        "support": ["Tickets", "Knowledge base", "Escalation"],
        "hr": ["Applications", "Screening", "Interview"],
        "marketing": ["Content", "Leads", "Segmentation"]
      },
      "systemsHeading": "Systems",
      "sampleBadge": "Demo",
      "flyout": {
        "website": ["Aziz", "Malika"],
        "telegram": ["@aziz_dev", "@malika_uz"],
        "whatsapp": ["+998 90 123-45-67", "+998 91 234-56-78"],
        "calls": ["+998 93 555-11-22", "+998 94 666-33-44"]
      },
      "connection": {
        "crm": {
          "url": "crm.demo.arioo.uz",
          "tools": {
            "createDeal": { "name": "createDeal", "description": "Creates a new deal" },
            "updateStage": { "name": "updateStage", "description": "Updates the stage" }
          }
        },
        "knowledge": {
          "url": "kb.demo.arioo.uz",
          "tools": {
            "searchDocs": { "name": "searchDocs", "description": "Searches the docs" },
            "suggestAnswer": { "name": "suggestAnswer", "description": "Suggests an answer" }
          }
        }
      },
      "panelLabels": {
        "connection": "Connection",
        "url": "URL",
        "tools": "Tools",
        "close": "Close"
      }
    }
```

- [ ] **Step 4: JSON to'g'riligini tekshirish**

Run: `node -e "JSON.parse(require('fs').readFileSync('messages/uz.json')); JSON.parse(require('fs').readFileSync('messages/ru.json')); JSON.parse(require('fs').readFileSync('messages/en.json')); console.log('OK')"`
Expected: `OK` (uchala fayl ham valid JSON).

- [ ] **Step 5: Commit**

```bash
git add messages/uz.json messages/ru.json messages/en.json
git commit -m "feat: add per-department i18n content for agent-flow diagram"
```

---

### Task 4: Guruhlangan layout — struktura (interaktivliksiz)

Bu vazifa joriy komponentni yangi data-model'dan foydalanadigan, department bo'yicha
guruhlangan (2 sarlavha + tavsif + chips) layout'ga o'tkazadi, lekin hali node'lar
bosilmaydi (mavjud auto-cycle animatsiya xatti-harakati saqlanadi). Task 5 klik
interaktivligini qo'shadi.

**Files:**
- Modify: `src/components/marketing/agent-flow-panel.tsx` (to'liq qayta yoziladi)

**Interfaces:**
- Consumes: Task 2'dagi `DEPARTMENT_KEYS`, `Department`, `SOURCE_KEYS`, `SourceKey`, `SYSTEM_KEYS`, `SystemKey`, `SOURCE_ICONS`, `SYSTEM_ICONS`, `DEPARTMENT_SOURCE_GROUPS` (`src/components/marketing/agent-flow-data.ts`dan)
- Produces: `AgentFlowPanel` (export, props yo'q) — Task 5 shu faylni yanada kengaytiradi

- [ ] **Step 1: Faylni to'liq shu tarkib bilan almashtirish**

`src/components/marketing/agent-flow-panel.tsx`:

```tsx
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
```

- [ ] **Step 2: Dev serverda vizual tekshirish**

Run: `curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/uz` (agar `next dev`
allaqachon ishlamayotgan bo'lsa, avval uni ishga tushiring: `npm run dev &`)
Expected: `200`. Keyin brauzerda `http://localhost:3000/uz` ochib, barcha 4 department
tab'iga o'tib (Sotuv/Support/HR/Marketing), har birida guruh sarlavhalari, tavsif matni
va chips'lar department bo'yicha o'zgarishini tasdiqlang.

- [ ] **Step 3: Regressiya tekshiruvi**

Run: `npx tsc --noEmit && npx playwright test tests/e2e/marketing.spec.ts --reporter=line`
Expected: ikkalasi ham xatosiz/16 test o'tadi.

- [ ] **Step 4: Commit**

```bash
git add src/components/marketing/agent-flow-panel.tsx
git commit -m "feat: group hero agent-flow sources/systems per department"
```

---

### Task 5: Node klik interaktivligi — `SourceFlyout` va `SystemConnectionPanel`

**Files:**
- Modify: `src/components/marketing/agent-flow-panel.tsx` (to'liq qayta yoziladi)

**Interfaces:**
- Consumes: Task 1'dagi `Switch` (`@/components/ui/switch`), Task 2'dagi `SYSTEM_ICONS`, `CONNECTION_TOOL_KEYS`, `SystemKey`, Task 4'dagi `AgentFlowPanel` strukturasi
- Produces: `AgentFlowPanel` (yakuniy, klik-interaktiv versiya)

- [ ] **Step 1: Faylni to'liq shu tarkib bilan almashtirish**

`src/components/marketing/agent-flow-panel.tsx`:

```tsx
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

function SourceFlyout({ items }: { items: string[] }) {
  return (
    <div
      role="status"
      className="animate-in fade-in slide-in-from-bottom-1 absolute -top-2 left-3 z-20 flex -translate-y-full gap-1.5 duration-300"
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
  const panelRef = useRef<HTMLDivElement>(null);

  const [department, setDepartment] = useState<Department>("sales");
  const [activeSource, setActiveSource] = useState(0);
  const [cycle, setCycle] = useState(0);
  const [activeNode, setActiveNode] = useState<ActiveNode>(null);

  const [group0, group1] = DEPARTMENT_SOURCE_GROUPS[department];
  const renderedSourceKeys: SourceKey[] = [...group0, ...group1];
  const activeSystem = activeSource % SYSTEM_KEYS.length;

  useEffect(() => {
    setActiveSource(0);
    setCycle((c) => c + 1);
    setActiveNode(null);
  }, [department]);

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
            <GroupHeading text={t(`groups.${department}.0`)} />
            {group0.map(renderSourceNode)}
            <GroupHeading text={t(`groups.${department}.1`)} />
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
```

- [ ] **Step 2: Dev serverda vizual va funksional tekshirish**

Brauzerda `http://localhost:3000/uz`:
1. Har 4 department tab'iga o'ting.
2. Har birida bitta manba node'ga bosing — yonida 2 ta namuna-chip (`SourceFlyout`)
   paydo bo'lishini tasdiqlang. Qayta bosib yopilishini tekshiring.
3. Har birida CRM va Bilim bazasi node'lariga navbat bilan bosing —
   `SystemConnectionPanel` diagramma ostida ochilib, URL + 2 ta tool + `Switch`
   ko'rsatishini tasdiqlang. `Switch`ni bosib yoqish/o'chirishni sinab ko'ring
   (faqat local holat, sahifa funksiyasiga ta'sir qilmasligi kerak).
4. Panel ochiq holatda diagramma tashqarisiga bosing — panel yopilishini tekshiring.
5. Panel ochiq holatda department tab'ini almashtiring — panel avtomatik
   yopilishini tekshiring.
6. Light/dark tema, mobil kenglik (390px) — barchasi to'g'ri ko'rinishini tekshiring.

- [ ] **Step 3: Regressiya tekshiruvi**

Run: `npx tsc --noEmit && npx vitest run && npx playwright test tests/e2e/marketing.spec.ts --reporter=line`
Expected: uchalasi ham xatosiz o'tadi.

- [ ] **Step 4: Commit**

```bash
git add src/components/marketing/agent-flow-panel.tsx
git commit -m "feat: add clickable source flyouts and system connection panels to hero diagram"
```

---

### Task 6: Playwright e2e testi — department almashtirish va node klik

**Files:**
- Modify: `tests/e2e/marketing.spec.ts`

**Interfaces:**
- Consumes: hech narsa (mustaqil test, faqat renderlangan DOM'ga rolga asoslangan so'rovlar orqali ishlaydi)

- [ ] **Step 1: Faylning oxiriga yangi test qo'shish**

`tests/e2e/marketing.spec.ts` fayli oxiriga (61-qatordan keyin) qo'shing:

```ts

test("hero agent-flow diagram switches departments and expands node panels", async ({ page }) => {
  await page.goto("/uz");

  // Switching to the HR tab swaps the description text shown above the diagram.
  await page.getByRole("tab", { name: "HR" }).click();
  await expect(page.getByText("Arizalarni qayta ishlaydi, nomzodlarga javob beradi va suhbat rejalashtiradi.")).toBeVisible();

  // Clicking a source node opens its sample-data flyout.
  await page.getByRole("button", { name: "Veb-sayt Yangi lidlar" }).click();
  await expect(page.getByText("Aziz")).toBeVisible();

  // Clicking a system node opens its connection panel with the demo URL.
  await page.getByRole("button", { name: "CRM Bitimlar" }).click();
  await expect(page.getByText("crm.demo.arioo.uz")).toBeVisible();

  // Closing the panel via its × button hides the demo URL again.
  await page.getByRole("button", { name: "Yopish" }).click();
  await expect(page.getByText("crm.demo.arioo.uz")).not.toBeVisible();
});
```

- [ ] **Step 2: Testni ishga tushirish**

Run: `npx playwright test tests/e2e/marketing.spec.ts -g "hero agent-flow" --reporter=line`
Expected: 1 test o'tadi (agar node accessible name mos kelmasa — masalan `NodeCard`
ichidagi `<p>` elementlarining matni birlashib boshqacha nom hosil qilsa — testdagi
`name` qatorini brauzerda `Tab` orqali fokus qilib haqiqiy accessible name'ga moslang).

- [ ] **Step 3: Butun marketing suite'ni ishga tushirish**

Run: `npx playwright test tests/e2e/marketing.spec.ts --reporter=line`
Expected: 17 test o'tadi (16 eski + 1 yangi).

- [ ] **Step 4: Commit**

```bash
git add tests/e2e/marketing.spec.ts
git commit -m "test: cover hero agent-flow department switching and node panels"
```

---

### Task 7: Yakuniy to'liq tekshiruv

**Files:** yo'q (faqat tekshiruv, kod o'zgarmaydi)

- [ ] **Step 1: To'liq test suite**

Run: `npx tsc --noEmit && npx vitest run && npx playwright test --reporter=line`
Expected: barchasi xatosiz o'tadi (marketing.spec.ts 17 test, boshqa e2e fayllar
o'zgarmagan holda o'tadi, vitest 193 test).

- [ ] **Step 2: Chrome orqali qo'lda to'liq aylanish**

`http://localhost:3000/uz` (keyin `/ru`, `/en`) sahifasida:
1. Har 4 department tab: Sotuv, Qo'llab-quvvatlash, HR, Marketing — har birida tavsif,
   chips, guruh sarlavhalari va node label'lari to'g'ri tilda ko'rinishini tasdiqlang.
2. Har department'da kamida 1 manba + 1 tizim node'ga bosib flyout/panel ochilishini,
   `Switch` ishlashini, × yoki tashqariga bosib yopilishini tekshiring.
3. Light va dark tema — barcha holatlarda (oddiy, flyout ochiq, panel ochiq) ranglar
   to'g'ri kontrastda ko'rinishini tekshiring.
4. Mobil kenglik (390px) — panel to'liq kenglikda to'g'ri joylashishini, gorizontal
   scroll paydo bo'lmasligini tekshiring.
5. `prefers-reduced-motion: reduce` yoqilgan holda (`javascript_tool` orqali
   `matchMedia` mock qilib yoki Chrome DevTools orqali) — oqar chiziq/pulse
   animatsiyalari o'chirilgan, lekin klik-flyout/panel baribir ishlashini tasdiqlang.

- [ ] **Step 3: Yakuniy commit (agar Step 2'da tuzatish kerak bo'lsa)**

Agar qo'lda tekshiruvda muammo topilsa, tuzating va:

```bash
git add -A
git commit -m "fix: polish hero agent-flow after full manual walkthrough"
```

Agar muammo topilmasa, bu vazifada commit shart emas — Task 6 oxirgi commit bo'lib
qoladi.

---

## Self-review yakunlari

- **Spec qamrovi:** Har department alohida struktura (Task 2/3/4) ✓, manba klik →
  flyout (Task 5) ✓, tizim klik → connection panel + Switch (Task 5) ✓, "namuna"
  belgisi + haqiqiy kredensial ko'rsatilmasligi (Task 3 `sampleBadge` + Task 5 panel,
  token umuman yo'q) ✓, click-outside/department-change reset (Task 5) ✓, mavjud
  test suite regressiyasiz (har vazifada tekshiriladi) ✓, yangi e2e smoke-test
  (Task 6) ✓.
- **Placeholder skanı:** Yo'q — barcha kod bloklari to'liq, ijro etiladigan holatda.
- **Tur mosligi:** `ActiveNode`, `SourceKey`, `SystemKey`, `Department` Task 2/5
  bo'ylab bir xil nomlash bilan ishlatilgan; `CONNECTION_TOOL_KEYS[key]` massiv
  elementlari `toolKey` sifatida `t()` chaqiruvlarida ishlatiladi — mos keladi.
