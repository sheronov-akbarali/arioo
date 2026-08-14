# Integrations Guruh 3: Telegram Bot/MTProto tanlov oynasi (Implementation Plan)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** "Telegram" kartasi bosilganda Bot (BotFather) va Shaxsiy akkaunt
(MTProto) orasida tanlov oynasi ko'rsatish; MTProto ulanish formasini
Statistics/Marketing sahifasidan Integrations sahifasiga ko'chirish; ikkala
oqim ham `integrations` jadvaliga status yozib borishi.

**Architecture:** Mavjud ikkita mustaqil oqim (`connectTelegramBotAction` →
`channels`, `startTelegramConnection`/`submitTelegramCode`/`submitTelegramPassword`
→ `telegramChannelConnections`) o'zgarishsiz qoladi — ularning ustiga bitta
tanlov modali va har ikkala oqim muvaffaqiyatli tugagach `integrations`
jadvaliga yozuvchi qatlam qo'shiladi.

**Tech Stack:** Next.js Server Actions, React `useActionState`, Drizzle ORM, next-intl.

**Spec:** `docs/superpowers/specs/2026-08-14-integrations-overhaul-design.md` (5-bo'lim)

**Depends on:** `2026-08-14-integrations-group-1-data-model.md`, `2026-08-14-integrations-group-2-status-dashboard.md`

## Global Constraints

- `providerId` qiymatlari: Bot oqimi → `"telegram_bot"`, MTProto oqimi → `"telegram_mtproto"`
- Mavjud `telegramChannelConnections` va `channels` jadvallari sxemasi **o'zgarmaydi**
- MTProto oqimining GramJS/session mantig'i (`src/lib/telegram/client.ts`, `finalize-connection.ts`, `session-crypto.ts`) **o'zgarmaydi** — faqat chaqiruv joyi va UI joylashuvi ko'chadi

---

### Task 1: MTProto server action'larni umumiy `lib` joyiga ko'chirish

**Files:**
- Create: `src/lib/telegram/mtproto-actions.ts`
- Delete: `src/app/[locale]/(dashboard)/statistics/marketing/telegram-actions.ts`
- Test: `src/lib/telegram/mtproto-actions.test.ts` (mavjud `telegram-actions.test.ts`dan ko'chiriladi)
- Modify: `src/app/[locale]/(dashboard)/statistics/marketing/page.tsx` (import manzili)

**Interfaces:**
- Produces: `startTelegramConnection(locale, prevState, formData)`, `submitTelegramCode(locale, prevState, formData)`, `submitTelegramPassword(locale, prevState, formData)`, `disconnectTelegramChannel(locale)` — imzolar o'zgarmaydi

- [ ] `git mv "src/app/[locale]/(dashboard)/statistics/marketing/telegram-actions.ts" src/lib/telegram/mtproto-actions.ts` buyrug'ini ishga tushirish.
- [ ] `git mv "src/app/[locale]/(dashboard)/statistics/marketing/telegram-actions.test.ts" src/lib/telegram/mtproto-actions.test.ts` buyrug'ini ishga tushirish.
- [ ] `src/lib/telegram/mtproto-actions.test.ts` faylida import yo'llarini tekshirish — nisbiy importlar (`./client`, `./session-crypto`, `./finalize-connection`, `./connect-state`) o'zgarishsiz to'g'ri ishlashi kerak, chunki fayl `src/lib/telegram/` papkasiga ko'chdi (avval ham shu nisbiy chuqurlikda edi, faqat papka nomi o'zgardi — import yo'llari **o'zgarmasligi** kerak, agar avval `"@/lib/telegram/..."` absolyut import ishlatilgan bo'lsa ham to'g'ri qoladi).
- [ ] `src/app/[locale]/(dashboard)/statistics/marketing/page.tsx` faylida importni yangilash:

  Eski: `import { startTelegramConnection, submitTelegramCode, submitTelegramPassword, disconnectTelegramChannel } from "./telegram-actions";`

  Yangi: `import { startTelegramConnection, submitTelegramCode, submitTelegramPassword, disconnectTelegramChannel } from "@/lib/telegram/mtproto-actions";`

- [ ] `npx vitest run src/lib/telegram/mtproto-actions.test.ts` — barcha testlar PASS bo'lishi kerak (ko'chirishdan oldingi holat bilan bir xil sonda).
- [ ] `npx tsc --noEmit` — xatosiz.
- [ ] Commit:

```bash
git add -A
git commit -m "refactor(telegram): move MTProto server actions from statistics route to shared lib"
```

---

### Task 2: MTProto ulanishini `integrations` jadvaliga yozish

**Files:**
- Modify: `src/lib/telegram/mtproto-actions.ts`

**Interfaces:**
- Consumes: `integrations` jadval (`@/db/schema/integrations`), `integrationEvents` jadval
- Produces: MTProto ulanish `"connected"` statusiga o'tganda mos `integrations` qatori `status: "active"`ga yangilanadi/yaratiladi

- [ ] `src/lib/telegram/mtproto-actions.ts` fayliga import qo'shish:

```ts
import { integrations } from "@/db/schema/integrations";
import { integrationEvents } from "@/db/schema/integrations";
```

(Ikkala export ham bitta `@/db/schema/integrations` faylidan keladi — bitta import qatoriga birlashtiriladi: `import { integrations, integrationEvents } from "@/db/schema/integrations";`)

- [ ] `submitTelegramCode` funksiyasi ichida (yoki `submitTelegramPassword` ichida, qaysi birida `status: "connected"` ga o'rnatilishi — mavjud kodni o'qib aniqlash) muvaffaqiyatli ulanishdan keyin, `telegramChannelConnections` yozuvini yangilagan joydan so'ng, quyidagi kodni qo'shish:

```ts
const [existingIntegration] = await db
  .select({ id: integrations.id })
  .from(integrations)
  .where(
    and(eq(integrations.organizationId, organization.id), eq(integrations.providerId, "telegram_mtproto"))
  );

if (existingIntegration) {
  await db
    .update(integrations)
    .set({ status: "active", lastVerifiedAt: new Date(), lastError: null, updatedAt: new Date() })
    .where(eq(integrations.id, existingIntegration.id));
  await db.insert(integrationEvents).values({
    integrationId: existingIntegration.id,
    type: "verified",
    message: "MTProto session verified",
  });
} else {
  const [created] = await db
    .insert(integrations)
    .values({
      organizationId: organization.id,
      providerId: "telegram_mtproto",
      connectionMode: "wizard",
      status: "active",
      linkedTelegramConnectionId: connection.id,
      lastVerifiedAt: new Date(),
    })
    .returning({ id: integrations.id });
  await db.insert(integrationEvents).values({
    integrationId: created.id,
    type: "created",
    message: "MTProto connection established",
  });
}
```

`connection.id` va `and`/`eq` importlari mavjud faylda allaqachon bor-yo'qligini tekshirish (`and` kerak bo'lsa `drizzle-orm`dan import qilish); `connection` o'zgaruvchisi — funksiya ichida `telegramChannelConnections`ga yozilgan/yangilangan qator obyekti, aniq nomini mavjud kodni o'qib moslashtirish.

- [ ] `disconnectTelegramChannel` funksiyasi ichida, `telegramChannelConnections`ni o'chirgan/yangilagan joydan keyin, mos `integrations` qatorini `status: "setup_needed"`ga qaytarish (o'chirilmaydi, faqat status qaytariladi):

```ts
await db
  .update(integrations)
  .set({ status: "setup_needed", updatedAt: new Date() })
  .where(and(eq(integrations.organizationId, organization.id), eq(integrations.providerId, "telegram_mtproto")));
```

- [ ] `npx tsc --noEmit` — xatosiz.
- [ ] `npx vitest run src/lib/telegram/mtproto-actions.test.ts` — hali PASS (mavjud testlar `integrations` yozuvini tekshirmaydi, lekin buzilmasligi kerak).
- [ ] Commit:

```bash
git add src/lib/telegram/mtproto-actions.ts
git commit -m "feat(integrations): sync Telegram MTProto connection status into integrations table"
```

---

### Task 3: Telegram Bot ulanishini `integrations` jadvaliga yozish

**Files:**
- Modify: `src/lib/integrations/actions.ts`

**Interfaces:**
- Consumes: `integrations` jadval
- Produces: `connectTelegramBotAction` muvaffaqiyatli tugagach `providerId: "telegram_bot"` bilan `integrations` qatori yaratiladi/yangilanadi

- [ ] `src/lib/integrations/actions.ts` fayliga import qo'shish: `import { integrations, integrationEvents } from "@/db/schema/integrations";`
- [ ] `connectTelegramBotAction` funksiyasida `channels`ga yozgan (`await db.insert(channels).values({...})`) qatordan keyin, `revalidatePath("/integrations")`dan oldin qo'shish:

```ts
const [existingIntegration] = await db
  .select({ id: integrations.id })
  .from(integrations)
  .where(and(eq(integrations.organizationId, organization.id), eq(integrations.providerId, "telegram_bot")));

if (existingIntegration) {
  await db
    .update(integrations)
    .set({ status: "active", agentId, lastVerifiedAt: new Date(), lastError: null, updatedAt: new Date() })
    .where(eq(integrations.id, existingIntegration.id));
} else {
  const [created] = await db
    .insert(integrations)
    .values({
      organizationId: organization.id,
      providerId: "telegram_bot",
      connectionMode: "special",
      status: "active",
      agentId,
      lastVerifiedAt: new Date(),
    })
    .returning({ id: integrations.id });
  await db.insert(integrationEvents).values({ integrationId: created.id, type: "created" });
}
```

`and` importi kerak bo'lsa `drizzle-orm`dan qo'shish (fayl boshida `eq` allaqachon import qilingan).

- [ ] `npx tsc --noEmit` — xatosiz.
- [ ] Commit:

```bash
git add src/lib/integrations/actions.ts
git commit -m "feat(integrations): sync Telegram Bot connection status into integrations table"
```

---

### Task 4: Tanlov oynasi (`TelegramChoiceDialog`)

**Files:**
- Create: `src/components/dashboard/integrations/telegram-choice-dialog.tsx`
- Create: `src/components/dashboard/integrations/telegram-mtproto-dialog.tsx`
- Modify: `src/components/dashboard/integrations/integrations-grid.tsx`

**Interfaces:**
- Consumes: `TelegramConnectDialog` (mavjud, o'zgarmaydi), yangi `TelegramMtprotoDialog`, `startTelegramConnection`/`submitTelegramCode`/`submitTelegramPassword` (`@/lib/telegram/mtproto-actions`)
- Produces: `TelegramChoiceDialog` komponenti, props: `{ agents: { id: string; name: string }[]; locale: string; botConnected: boolean; mtprotoConnected: boolean }`

- [ ] Avval mavjud `src/components/dashboard/statistics/telegram-connect-form.tsx`dagi `TelegramConnectForm`ni o'qib, uni Dialog ichiga o'raydigan yangi `src/components/dashboard/integrations/telegram-mtproto-dialog.tsx` yaratish:

```tsx
"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { TelegramConnectForm } from "@/components/dashboard/statistics/telegram-connect-form";
import {
  startTelegramConnection,
  submitTelegramCode,
  submitTelegramPassword,
} from "@/lib/telegram/mtproto-actions";

export function TelegramMtprotoDialog({ locale, connected }: { locale: string; connected: boolean }) {
  const t = useTranslations("integrations.telegramChoice.mtproto");
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button size="sm" variant="outline" className="w-full justify-start">
            {connected ? t("manage") : t("connectButton")}
          </Button>
        }
      />
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{t("dialogTitle")}</DialogTitle>
        </DialogHeader>
        <TelegramConnectForm
          startAction={startTelegramConnection.bind(null, locale)}
          submitCodeAction={submitTelegramCode.bind(null, locale)}
          submitPasswordAction={submitTelegramPassword.bind(null, locale)}
        />
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] `src/components/dashboard/statistics/telegram-connect-form.tsx` faylida `useTranslations("statistics.marketing.telegram.connect")` qatorini `useTranslations("integrations.telegramChoice.mtproto.connect")` bilan almashtirish.

- [ ] `src/components/dashboard/integrations/telegram-choice-dialog.tsx` yaratish:

```tsx
"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Send, Phone } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { TelegramConnectDialog } from "./telegram-connect-dialog";
import { TelegramMtprotoDialog } from "./telegram-mtproto-dialog";

export function TelegramChoiceDialog({
  agents,
  locale,
  botConnected,
  mtprotoConnected,
}: {
  agents: { id: string; name: string }[];
  locale: string;
  botConnected: boolean;
  mtprotoConnected: boolean;
}) {
  const t = useTranslations("integrations.telegramChoice");
  const [open, setOpen] = useState(false);

  const connectedCount = Number(botConnected) + Number(mtprotoConnected);
  const label = connectedCount > 0 ? `${connectedCount}/2 ${t("connected")}` : t("connect");

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button size="sm" variant="outline" className="gap-2">
            {label} <Send className="size-3" />
          </Button>
        }
      />
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>{t("subtitle")}</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <div className="rounded-lg border border-border p-4">
            <div className="mb-1 flex items-center gap-2 font-medium">
              <Send className="size-4" /> {t("bot.title")}
            </div>
            <p className="mb-3 text-sm text-muted-foreground">{t("bot.description")}</p>
            <TelegramConnectDialog agents={agents} />
          </div>
          <div className="rounded-lg border border-border p-4">
            <div className="mb-1 flex items-center gap-2 font-medium">
              <Phone className="size-4" /> {t("mtproto.title")}
            </div>
            <p className="mb-3 text-sm text-muted-foreground">{t("mtproto.description")}</p>
            <TelegramMtprotoDialog locale={locale} connected={mtprotoConnected} />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

Eslatma: `TelegramConnectDialog` va `TelegramMtprotoDialog` o'z ichida `<Dialog>` ochadi — bu ichma-ich (nested) Dialog holatini yaratadi (tashqi tanlov modali ochiq turganda ichki modal ochiladi). base-ui Dialog komponenti nested dialoglarni qo'llab-quvvatlaydi (portal orqali renderlanadi), shuning uchun funksional muammo bo'lmaydi, lekin ichki dialog ochilganda tashqi tanlov oynasi orqada qolishi kutiladi — bu qabul qilinadi (worken.ru'da ham xuddi shunday ikki qatlamli modal ishlaydi, avvalgi tahlilda kuzatilgan).

- [ ] `messages/uz.json`'ning `integrations` bo'limiga yangi `telegramChoice` obyektini qo'shish (tugma matni uchun kalit nomi `connectButton` — chunki `mtproto` ichida `connect` obyekti bosqichlar tarjimasi uchun band):

```json
"telegramChoice": {
  "title": "Telegram qanday ulanadi?",
  "subtitle": "Bu provayder bir nechta ulanish rejimini taklif qiladi. Kerakligini tanlang.",
  "connect": "Ulash",
  "connected": "ulangan",
  "bot": {
    "title": "Bot (@BotFather)",
    "description": "BotFather'dan token orqali. Oddiy messenjer-integratsiya: bot yozishmalarga, guruh va kanallarga javob beradi."
  },
  "mtproto": {
    "title": "Shaxsiy akkaunt (MTProto)",
    "description": "Kanal statistikasi uchun, telefon raqami orqali kirish — bu bot EMAS.",
    "dialogTitle": "Telegram (MTProto) ulash",
    "connectButton": "Ulash",
    "manage": "Boshqarish",
    "connect": {
      "riskWarning": "Diqqat: bu shaxsiy Telegram akkountingizni ulaydi. Telegram bunday avtomatlashtirishni cheklashi mumkin — xavf faqat ulangan akkauntga tegishli.",
      "phoneLabel": "Telefon raqami",
      "channelLabel": "Kanal username (@ belgisisiz)",
      "codeLabel": "Telegram'dan kelgan kod",
      "passwordLabel": "Ikki bosqichli parol",
      "start": "Ulash",
      "confirm": "Tasdiqlash",
      "submitting": "Yuborilmoqda...",
      "connected": "Telegram kanali ulandi.",
      "errors": {
        "missing_fields": "Telefon va kanal username kiritilishi shart.",
        "invalid_code": "Kod noto'g'ri. Qayta urinib ko'ring.",
        "invalid_password": "Parol noto'g'ri. Qayta urinib ko'ring.",
        "not_channel_admin": "Bu akkaunt ko'rsatilgan kanalga admin emas.",
        "channel_not_found": "Kanal topilmadi."
      }
    }
  }
}
```

Shu tuzilmani `messages/uz.json`ning `integrations` bo'limiga qo'shish, so'ng `messages/uz.json`ning `statistics.marketing.telegram.connect` obyektini butunlay o'chirish (Task 6'da statistics sahifasi bu formani ishlatmay qoladi). `messages/ru.json` va `messages/en.json`'ga bir xil tuzilmada tarjima qilib qo'shish, ularda ham `statistics.marketing.telegram.connect`ni o'chirish.

- [ ] `src/components/dashboard/integrations/integrations-grid.tsx` faylida `TelegramConnectDialog` chaqiruvi joyini topib (`provider.id === "telegram"` sharti ichida), uni `TelegramChoiceDialog`ga almashtirish. Bu yerda `botConnected`/`mtprotoConnected` qiymatlarini aniqlash uchun komponentga yangi prop kerak bo'ladi — Task 5'da `page.tsx` orqali uzatiladi. Hozircha:

```tsx
) : provider.id === "telegram" ? (
  <TelegramChoiceDialog
    agents={agents}
    locale={locale}
    botConnected={channels.some((c) => c.type === "telegram" && c.isActive)}
    mtprotoConnected={mtprotoConnected}
  />
) : provider.id === "websiteWidget" ? (
```

`locale` va `mtprotoConnected` — komponent props'iga qo'shiladigan yangi qiymatlar (quyidagi qadamda).

- [ ] `IntegrationsGrid` komponentining props signaturasiga qo'shish: `locale: string; mtprotoConnected: boolean;` (mavjud `agents`/`channels`/`integrationRows`dan keyin).

- [ ] `import { TelegramChoiceDialog } from "./telegram-choice-dialog";` qo'shish, `import { TelegramConnectDialog } from "./telegram-connect-dialog";` importi endi to'g'ridan-to'g'ri ishlatilmasa ham qoladi (chunki `TelegramChoiceDialog` uni ichida ishlatadi, bu faylda emas) — shu import qatorini olib tashlash mumkin, agar ESLint "unused import" xato bermasa tekshirish.

- [ ] Commit **qilinmaydi** — Task 5 bilan birga.

---

### Task 5: Integrations sahifasidan `locale` va MTProto holatini uzatish

**Files:**
- Modify: `src/app/[locale]/(dashboard)/integrations/page.tsx`

**Interfaces:**
- Consumes: `telegramChannelConnections` (`@/db/schema/telegram-channel-connection`)

- [ ] `src/app/[locale]/(dashboard)/integrations/page.tsx` fayliga import qo'shish: `import { telegramChannelConnections } from "@/db/schema/telegram-channel-connection";`
- [ ] `integrationRows` so'rovidan keyin qo'shish:

```ts
const [telegramConnection] = await db
  .select({ status: telegramChannelConnections.status })
  .from(telegramChannelConnections)
  .where(eq(telegramChannelConnections.organizationId, organization.id));
```

- [ ] `<IntegrationsGrid ... />` chaqiruviga `locale={locale}` va `mtprotoConnected={telegramConnection?.status === "connected"}` proplarini qo'shish.

- [ ] `npx tsc --noEmit` — xatosiz.

- [ ] `npm run dev` orqali brauzerda tekshirish:
  - `/uz/integrations` sahifasida Telegram kartasi bosilganda tanlov oynasi ochiladi
  - "Bot (@BotFather)" tugmasi bosilsa mavjud bot-token forma ochiladi
  - "Shaxsiy akkaunt (MTProto)" tugmasi bosilsa 4-bosqichli wizard ochiladi (Phone → SMS code)
  - `/uz/statistics/marketing`da MTProto ulanish formasi endi ko'rinmaydi (Task 6'da olib tashlanadi — hozircha eski forma hali qolgan bo'lishi mumkin, keyingi taskda tozalanadi)

- [ ] Commit:

```bash
git add src/components/dashboard/integrations/telegram-choice-dialog.tsx \
  src/components/dashboard/integrations/telegram-mtproto-dialog.tsx \
  src/components/dashboard/integrations/integrations-grid.tsx \
  src/components/dashboard/statistics/telegram-connect-form.tsx \
  src/app/[locale]/(dashboard)/integrations/page.tsx \
  messages/uz.json messages/ru.json messages/en.json
git commit -m "feat(integrations): add Telegram Bot vs MTProto choice dialog"
```

---

### Task 6: Statistics/Marketing sahifasidan ulanish formasini olib tashlash

**Files:**
- Modify: `src/app/[locale]/(dashboard)/statistics/marketing/page.tsx`

**Interfaces:**
- Consumes: `Link` (`@/i18n/navigation`)

- [ ] `src/app/[locale]/(dashboard)/statistics/marketing/page.tsx` faylida `TelegramConnectForm` importini va `startTelegramConnection`/`submitTelegramCode`/`submitTelegramPassword` importlarini olib tashlash (`disconnectTelegramChannel` import qoladi, chunki ulangan holatda "Uzish" tugmasi hali shu sahifada qoladi).
- [ ] `else` blokidagi `<TelegramConnectForm ... />` (taxminan 199-204 qatorlar atrofida, aniq joyini `grep -n "TelegramConnectForm" "src/app/[locale]/(dashboard)/statistics/marketing/page.tsx"` orqali topish) — quyidagicha almashtirish:

```tsx
) : (
  <div className="flex flex-col gap-2">
    <p className="text-sm text-muted-foreground">{t("marketing.telegram.connectElsewhere")}</p>
    <Button size="sm" variant="outline" className="w-fit" render={<Link href="/integrations" />}>
      {t("marketing.telegram.goToIntegrations")}
    </Button>
  </div>
)}
```

- [ ] `messages/uz.json`'ning `statistics.marketing.telegram` bo'limiga qo'shish: `"connectElsewhere": "Telegram statistikasini ko'rish uchun avval Integratsiyalar sahifasida ulang.", "goToIntegrations": "Integratsiyalarga o'tish"`. `ru.json`/`en.json`'ga mos tarjima.
- [ ] `messages/uz.json`'ning `statistics.marketing.telegram.connect` obyektini butunlay o'chirish (Task 4'da `integrations.telegramChoice.mtproto.connect`ga ko'chirilgan edi). `ru.json`/`en.json`'da ham xuddi shu obyektni o'chirish.
- [ ] `npx tsc --noEmit` — xatosiz.
- [ ] `npm run dev` orqali `/uz/statistics/marketing`ni tekshirish — ulanmagan holatda "Integratsiyalarga o'tish" tugmasi ko'rinishi, bosilganda `/uz/integrations`ga o'tishi.
- [ ] Commit:

```bash
git add "src/app/[locale]/(dashboard)/statistics/marketing/page.tsx" messages/uz.json messages/ru.json messages/en.json
git commit -m "refactor(statistics): replace Telegram MTProto connect form with link to Integrations page"
```

---

## Tugatish tekshiruvi

- [ ] `npx tsc --noEmit` — xatosiz
- [ ] `npx vitest run src/lib/telegram/` — barcha testlar PASS
- [ ] Chrome orqali to'liq oqim: Integrations → Telegram → Bot tanlash → ulash; Integrations → Telegram → MTProto tanlash → 4 bosqichni ko'rish (haqiqiy SMS kiritmasdan, faqat forma ko'rinishini tekshirish yetarli)
