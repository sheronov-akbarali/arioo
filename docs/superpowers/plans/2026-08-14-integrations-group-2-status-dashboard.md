# Integrations Guruh 2: Status dashboard va ikki-bo'limli grid (Implementation Plan)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `/integrations` sahifasiga status dashboard (5 karta), status+kategoriya
filter pill'lari va "Sizning integratsiyalaringiz" / "Yana toping" ikki bo'limli
grid'ni qo'shish — worken.ru'dagi tashkil bilan bir xil.

**Architecture:** Sahifa (`page.tsx`) endi `integrations` jadvalidan tashkilotning
barcha yozuvlarini oladi va client komponentlarga uzatadi. Yangi kichik
komponentlar (`IntegrationStatusDashboard`, `IntegrationFilters`) mavjud
`IntegrationsGrid`ni ikkiga (Your integrations / Discover more) bo'ladi.

**Tech Stack:** Next.js Server Components, React (client komponent filter uchun), Drizzle ORM, next-intl.

**Spec:** `docs/superpowers/specs/2026-08-14-integrations-overhaul-design.md` (8-bo'lim)

**Depends on:** `2026-08-14-integrations-group-1-data-model.md` (bajarilgan bo'lishi shart — `integrations` jadvali va `src/lib/integrations/providers.ts` mavjud bo'lishi kerak)

## Global Constraints

- Telegram karta bu guruhda **o'zgarmaydi** — hozirgi `channels.type === "telegram"` tekshiruvi davom etadi (Telegram Bot/MTProto tanlovi guruh-3'da ishlanadi)
- Boshqa provayderlar uchun ulanish dialoglari bu guruhda **o'zgarmaydi** — faqat status ko'rinishi (badge/progress) `integrations` jadvalidan olinadi

---

### Task 1: `integrations` qatorlarini sahifaga yuklash

**Files:**
- Modify: `src/app/[locale]/(dashboard)/integrations/page.tsx`

**Interfaces:**
- Produces: `IntegrationsGrid`ga yangi `integrationRows` prop (`{ id: string; providerId: string; status: IntegrationStatus; connectionMode: ConnectionMode; lastError: string | null }[]`)

- [ ] `src/app/[locale]/(dashboard)/integrations/page.tsx` fayliga import qo'shish:

```ts
import { integrations } from "@/db/schema/integrations";
```

- [ ] `orgChannels` o'zgaruvchisidan keyin yangi so'rov qo'shish:

```ts
const integrationRows = await db
  .select({
    id: integrations.id,
    providerId: integrations.providerId,
    status: integrations.status,
    connectionMode: integrations.connectionMode,
    lastError: integrations.lastError,
  })
  .from(integrations)
  .where(eq(integrations.organizationId, organization.id));
```

- [ ] `<IntegrationsGrid agents={agents} channels={orgChannels} />` qatorini `<IntegrationsGrid agents={agents} channels={orgChannels} integrationRows={integrationRows} />` bilan almashtirish.

- [ ] `npx tsc --noEmit` — `IntegrationsGrid` propType xatosi kutiladi (Task 2'da tuzatiladi), bu normal oraliq holat.

- [ ] Commit **qilinmaydi** — Task 2 bilan birga bitta commit qilinadi (interfeys mos kelishi shart).

---

### Task 2: Status dashboard komponenti

**Files:**
- Create: `src/components/dashboard/integrations/integration-status-dashboard.tsx`
- Test: yo'q (sof UI komponent, loyihaning mavjud konvensiyasiga ko'ra qo'lda Chrome orqali tekshiriladi)

**Interfaces:**
- Consumes: `countByStatus` va `STATUS_DASHBOARD_ORDER` (`@/lib/integrations/status`)
- Produces: `IntegrationStatusDashboard` komponenti, props: `{ rows: { status: IntegrationStatus }[] }`

- [ ] `src/components/dashboard/integrations/integration-status-dashboard.tsx` yaratish:

```tsx
import { useTranslations } from "next-intl";
import { countByStatus, STATUS_DASHBOARD_ORDER, type IntegrationStatus } from "@/lib/integrations/status";
import { Card, CardContent } from "@/components/ui/card";

const DOT_COLOR: Record<IntegrationStatus, string> = {
  active: "bg-green-500",
  need_attention: "bg-red-500",
  verifying: "bg-blue-500",
  setup_needed: "bg-amber-500",
  archived: "bg-muted-foreground",
};

export function IntegrationStatusDashboard({ rows }: { rows: { status: IntegrationStatus }[] }) {
  const t = useTranslations("integrations.statusDashboard");
  const counts = countByStatus(rows);

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {STATUS_DASHBOARD_ORDER.map((status) => (
        <Card key={status}>
          <CardContent className="flex flex-col gap-1 pt-6">
            <div className="flex items-center gap-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
              <span className={`size-1.5 rounded-full ${DOT_COLOR[status]}`} />
              {t(`labels.${status}`)}
            </div>
            <p className="text-2xl font-semibold">{counts[status]}</p>
            <p className="text-xs text-muted-foreground">{t(`hints.${status}`)}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
```

- [ ] `messages/uz.json`, `messages/ru.json`, `messages/en.json` fayllarining `integrations` bo'limiga (`connect`/`connected` kalitlari yonidan) yangi `statusDashboard` obyektini qo'shish. `messages/uz.json` uchun:

```json
"statusDashboard": {
  "labels": {
    "active": "Faol",
    "need_attention": "E'tibor talab qiladi",
    "verifying": "Tekshirilmoqda",
    "setup_needed": "Sozlanmoqda",
    "archived": "Arxivlangan"
  },
  "hints": {
    "active": "tasdiqlangan",
    "need_attention": "qayta ulanish / xato",
    "verifying": "provayder tekshiruvi",
    "setup_needed": "sozlashni yakunlang",
    "archived": "tiklash mumkin"
  }
}
```

`messages/ru.json` uchun mos ruscha, `messages/en.json` uchun worken.ru'dagi original inglizcha matnlarga mos (`verified`, `reauth / error`, `vendor check`, `finish wizard`, `restorable`) tarjima qilish.

- [ ] Commit **qilinmaydi** — Task 4 bilan birga qilinadi.

---

### Task 3: Status va kategoriya filter komponenti

**Files:**
- Create: `src/components/dashboard/integrations/integration-filters.tsx`

**Interfaces:**
- Produces: `IntegrationFilters` komponenti, props: `{ statusCounts: Record<IntegrationStatus, number>; totalCount: number; selectedStatus: IntegrationStatus | "all"; onStatusChange: (s: IntegrationStatus | "all") => void; categories: IntegrationCategory[]; selectedCategory: IntegrationCategory | null; onCategoryChange: (c: IntegrationCategory | null) => void }`

- [ ] `src/components/dashboard/integrations/integration-filters.tsx` yaratish:

```tsx
"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import type { IntegrationCategory } from "@/lib/integrations/providers";
import type { IntegrationStatus } from "@/lib/integrations/status";

const STATUS_PILLS: IntegrationStatus[] = ["active", "need_attention", "verifying", "setup_needed", "archived"];

export function IntegrationFilters({
  statusCounts,
  totalCount,
  selectedStatus,
  onStatusChange,
  categories,
  selectedCategory,
  onCategoryChange,
}: {
  statusCounts: Record<IntegrationStatus, number>;
  totalCount: number;
  selectedStatus: IntegrationStatus | "all";
  onStatusChange: (status: IntegrationStatus | "all") => void;
  categories: IntegrationCategory[];
  selectedCategory: IntegrationCategory | null;
  onCategoryChange: (category: IntegrationCategory | null) => void;
}) {
  const t = useTranslations("integrations");

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant={selectedStatus === "all" ? "default" : "outline"} onClick={() => onStatusChange("all")}>
          {t("filters.all")} · {totalCount}
        </Button>
        {STATUS_PILLS.map((status) => (
          <Button
            key={status}
            size="sm"
            variant={selectedStatus === status ? "default" : "outline"}
            onClick={() => onStatusChange(status)}
          >
            {t(`statusDashboard.labels.${status}`)} {statusCounts[status]}
          </Button>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant={!selectedCategory ? "default" : "outline"} onClick={() => onCategoryChange(null)}>
          {t("categoryFilters.all")}
        </Button>
        {categories.map((cat) => (
          <Button
            key={cat}
            size="sm"
            variant={selectedCategory === cat ? "default" : "outline"}
            onClick={() => onCategoryChange(cat)}
          >
            {t(`categories.${cat}`)}
          </Button>
        ))}
      </div>
    </div>
  );
}
```

- [ ] `messages/uz.json`'ning `integrations` bo'limiga `"filters": { "all": "Hammasi" }` qo'shish (agar `categoryFilters.all` allaqachon mavjud bo'lsa, `filters.all` alohida kalit sifatida qo'shiladi — status va kategoriya pill qatorlari uchun bir xil "Hammasi" so'zi ishlatilsa ham, ikkita mustaqil kalit saqlanadi, chunki kelajakda matn farqlanishi mumkin). `ru.json`/`en.json`'ga mos tarjima.

- [ ] `messages/uz.json`'ning `integrations.categories` obyektiga `"calendar": "Kalendar"` qo'shish (Google endi calendar kategoriyasiga ham kiradi — guruh-1'dagi `providers.ts`da `calendar` kategoriyasi qo'shilgan edi). `ru.json`/`en.json`'ga mos tarjima.

- [ ] Commit **qilinmaydi** — Task 4 bilan birga qilinadi.

---

### Task 4: `IntegrationsGrid`ni ikki bo'limga bo'lish va yangi komponentlarni ulash

**Files:**
- Modify: `src/components/dashboard/integrations/integrations-grid.tsx`

**Interfaces:**
- Consumes: `IntegrationStatusDashboard` (Task 2), `IntegrationFilters` (Task 3), `countByStatus` (`@/lib/integrations/status`)
- Produces: `IntegrationsGrid` props kengaytiriladi — `integrationRows: { id: string; providerId: string; status: IntegrationStatus; connectionMode: ConnectionMode; lastError: string | null }[]`

- [ ] `src/components/dashboard/integrations/integrations-grid.tsx` faylini ochib, quyidagi o'zgarishlarni kiritish:

  1. Import qo'shish:
  ```ts
  import { IntegrationStatusDashboard } from "./integration-status-dashboard";
  import { IntegrationFilters } from "./integration-filters";
  import { countByStatus, type IntegrationStatus } from "@/lib/integrations/status";
  ```

  2. Komponent props signaturasini yangilash:
  ```ts
  export function IntegrationsGrid({
    agents = [],
    channels = [],
    integrationRows = [],
  }: {
    agents?: { id: string; name: string }[];
    channels?: { id: string; type: string; isActive: boolean; botUsername: string | null }[];
    integrationRows?: { id: string; providerId: string; status: IntegrationStatus; lastError: string | null }[];
  }) {
  ```

  3. Komponent ichida `query`/`category` state'laridan keyin yangi state qo'shish:
  ```ts
  const [statusFilter, setStatusFilter] = useState<IntegrationStatus | "all">("all");
  ```

  4. Har bir provider uchun status'ni topuvchi yordamchi qo'shish (`filtered` hisoblanishidan oldin). `channels.type` enum qiymatlari (`"telegram" | "whatsapp" | "widget" | "olx"`) katalogdagi `provider.id` (`"websiteWidget"` va h.k.) bilan har doim bir xil yozilmagani uchun aniq moslik jadvali kerak:

  ```ts
  const integrationByProvider = new Map(integrationRows.map((row) => [row.providerId, row]));

  // channels.type ("widget") va provider.id ("websiteWidget") turlicha yozilishi mumkin.
  // "telegram" ham shu yerda qoladi: integrations jadvalida "telegram" providerId'i
  // hech qachon yozilmaydi (guruh-3'dan keyin "telegram_bot"/"telegram_mtproto" yoziladi),
  // shuning uchun Telegram kartasining ulanish holati doim shu channels-fallback orqali
  // aniqlanadi — bu guruh-3'dan keyin ham to'g'ri ishlashda davom etadi.
  const CHANNEL_TYPE_BY_PROVIDER: Record<string, string> = {
    telegram: "telegram",
    whatsapp: "whatsapp",
    websiteWidget: "widget",
    olx: "olx",
  };

  function hasActiveChannel(providerId: string): boolean {
    const channelType = CHANNEL_TYPE_BY_PROVIDER[providerId];
    if (!channelType) return false;
    return channels.some((c) => c.type === channelType && c.isActive);
  }

  function statusFor(providerId: string): IntegrationStatus {
    if (integrationByProvider.has(providerId)) return integrationByProvider.get(providerId)!.status;
    return hasActiveChannel(providerId) ? "active" : "setup_needed";
  }
  ```

  5. `filtered` massivini status bo'yicha ham filtrlashni qo'shish (`matchesCategory`/`matchesQuery`dan keyin):
  ```ts
  const matchesStatus = statusFilter === "all" || statusFor(provider.id) === statusFilter;
  return matchesCategory && matchesQuery && matchesStatus;
  ```

  6. `filtered` massivini ikkiga ajratish (return bloki boshida, `<div className="flex flex-col gap-4">` ichida, qidiruv/filter qatorlaridan keyin, grid'dan oldin):
  ```ts
  const connected = filtered.filter((p) => integrationByProvider.has(p.id) || hasActiveChannel(p.id));
  const discoverable = filtered.filter((p) => !connected.includes(p));
  ```

  7. Return JSX'ni quyidagicha qayta tashkil qilish (mavjud `<ListSearchInput>` va filter tugmalari qatoridan **oldin** dashboard, filter tugmalari qatorini `IntegrationFilters`ga almashtirish, keyin ikkita alohida grid bo'limi):
  ```tsx
  return (
    <div className="flex flex-col gap-6">
      <IntegrationStatusDashboard rows={integrationRows} />
      <ListSearchInput placeholder={t("searchPlaceholder")} value={query} onChange={setQuery} />
      <IntegrationFilters
        statusCounts={countByStatus(integrationRows)}
        totalCount={integrationRows.length}
        selectedStatus={statusFilter}
        onStatusChange={setStatusFilter}
        categories={availableCategories}
        selectedCategory={category}
        onCategoryChange={setCategory}
      />
      {connected.length > 0 && (
        <div className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold text-muted-foreground">
            {t("yourIntegrations")} · {connected.length}
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {connected.map((provider) => renderProviderCard(provider))}
          </div>
        </div>
      )}
      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-muted-foreground">
          {t("discoverMore")} · {discoverable.length}
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {discoverable.map((provider) => renderProviderCard(provider))}
        </div>
      </div>
    </div>
  );
  ```

  8. Mavjud `{filtered.map((provider) => { ... })}` blokini (hozirgi kartani chizuvchi kod, `Icon`/`Card`/`CardContent` bilan) alohida `renderProviderCard(provider: ProviderConfig)` funksiyasiga o'tkazish (komponent ichida, `return` dan oldin e'lon qilinadi), tarkibi o'zgarmaydi — faqat `filtered.map` o'rniga funksiya qaytaradigan JSX bo'ladi.

- [ ] `messages/uz.json`'ning `integrations` bo'limiga qo'shish: `"yourIntegrations": "Sizning integratsiyalaringiz", "discoverMore": "Yana toping"`. `ru.json`/`en.json`'ga mos tarjima (worken'dagi "Your integrations"/"Discover more"ga mos).

- [ ] `npx tsc --noEmit` — xatosiz bo'lishi kerak.

- [ ] `npm run dev` ishga tushirib, brauzerda `http://localhost:3000/uz/integrations`ni tekshirish:
  - Status dashboard 5 ta karta ko'rsatadi (barchasi 0 yoki mavjud kanal sonига mos)
  - Status va kategoriya filter pill'lari ishlaydi
  - "Sizning integratsiyalaringiz" va "Yana toping" bo'limlari alohida ko'rinadi
  - Telegram kartasi avvalgidek ishlaydi (bu guruhda o'zgarmagan)

- [ ] Commit (Task 1-4 birga):

```bash
git add src/app/[locale]/(dashboard)/integrations/page.tsx \
  src/components/dashboard/integrations/integrations-grid.tsx \
  src/components/dashboard/integrations/integration-status-dashboard.tsx \
  src/components/dashboard/integrations/integration-filters.tsx \
  messages/uz.json messages/ru.json messages/en.json
git commit -m "feat(integrations): add status dashboard and split grid into connected/discoverable sections"
```

---

## Tugatish tekshiruvi

- [ ] `npx tsc --noEmit` — xatosiz
- [ ] `npx eslint src/components/dashboard/integrations/` — yangi xato yo'q (mavjud `no-unescaped-entities` ogohlantirishlaridan tashqari)
- [ ] Chrome orqali `/uz/integrations`, `/ru/integrations`, `/en/integrations` — uchala tilda ham matnlar to'g'ri ko'rinishini tekshirish
