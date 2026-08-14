# Integrations Guruh 6: Boshqaruv sahifasi /integrations/[id] (Implementation Plan)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Har bir ulangan integratsiya uchun alohida `/integrations/:id`
boshqaruv sahifasi — profil, ulanish tafsilotlari, lifecycle log, "Test
connection", Archive va Delete.

**Architecture:** Server komponent sahifa `integrations` va
`integration_events` jadvallaridan bitta yozuvni o'qiydi (`organizationId`
bo'yicha tekshirib, boshqa tashkilotning yozuvi ko'rsatilmasligini
ta'minlaydi), tegishli provayder-maxsus "Test connection" funksiyasini
chaqiradi.

**Tech Stack:** Next.js Server Components + Server Actions, Drizzle ORM.

**Spec:** `docs/superpowers/specs/2026-08-14-integrations-overhaul-design.md` (9-bo'lim)

**Depends on:** `2026-08-14-integrations-group-1-data-model.md`, `2026-08-14-integrations-group-2-status-dashboard.md`

## Global Constraints

- Sahifa faqat so'rov yuborayotgan tashkilotga tegishli integratsiya
  yozuvlarini ko'rsatishi shart — boshqa `organizationId`ga tegishli `id`
  bilan kirilsa `notFound()` chaqiriladi
- Delete — `integrations` va `integration_events` yozuvlarini o'chiradi,
  lekin bog'liq `channels`/`telegramChannelConnections` yozuvini
  o'chirmaydi (spec 9-bo'lim)

---

### Task 1: Test connection funksiyalari

**Files:**
- Create: `src/lib/integrations/test-connection.ts`
- Test: `src/lib/integrations/test-connection.test.ts`

**Interfaces:**
- Produces: `testIntegrationConnection(providerId: string, integration: { credentialsEncrypted: string | null; config: Record<string, unknown> | null; linkedChannelId: string | null }): Promise<{ ok: boolean; error?: string }>`

- [ ] `src/lib/integrations/test-connection.test.ts` yozish:

```ts
import { describe, it, expect, vi } from "vitest";
import { testIntegrationConnection } from "./test-connection";

describe("testIntegrationConnection", () => {
  it("returns ok:false with a clear error when credentials are missing", async () => {
    const result = await testIntegrationConnection("amocrm", {
      credentialsEncrypted: null,
      config: null,
      linkedChannelId: null,
    });
    expect(result.ok).toBe(false);
    expect(result.error).toBeTruthy();
  });

  it("returns ok:false for a provider with no test implemented", async () => {
    const result = await testIntegrationConnection("unknown_provider", {
      credentialsEncrypted: "fake",
      config: null,
      linkedChannelId: null,
    });
    expect(result.ok).toBe(false);
  });
});
```

- [ ] Testni ishga tushirish: `npx vitest run src/lib/integrations/test-connection.test.ts` — FAIL (`Cannot find module`).

- [ ] `src/lib/integrations/test-connection.ts` yaratish. Har bir provayder uchun mini-tekshiruv qiladi; hozircha faqat "kalit mavjudmi" darajasida (haqiqiy provayder API'siga so'rov yuborish keyingi bosqichda kengaytiriladi — Telegram uchun `getMe` allaqachon mavjud amaliy misol):

```ts
import "server-only";
import { decryptCredential } from "./credential-crypto";

type IntegrationSnapshot = {
  credentialsEncrypted: string | null;
  config: Record<string, unknown> | null;
  linkedChannelId: string | null;
};

async function testTelegramBot(snapshot: IntegrationSnapshot): Promise<{ ok: boolean; error?: string }> {
  if (!snapshot.credentialsEncrypted) return { ok: false, error: "Bot token topilmadi" };
  const { botToken } = JSON.parse(decryptCredential(snapshot.credentialsEncrypted));
  const response = await fetch(`https://api.telegram.org/bot${botToken}/getMe`);
  const data = await response.json();
  return data.ok ? { ok: true } : { ok: false, error: "Bot token yaroqsiz" };
}

async function testGenericOAuth(snapshot: IntegrationSnapshot): Promise<{ ok: boolean; error?: string }> {
  if (!snapshot.credentialsEncrypted) return { ok: false, error: "OAuth token topilmadi" };
  return { ok: true };
}

const TESTERS: Record<string, (snapshot: IntegrationSnapshot) => Promise<{ ok: boolean; error?: string }>> = {
  telegram_bot: testTelegramBot,
  amocrm: testGenericOAuth,
  bitrix24: testGenericOAuth,
  google: testGenericOAuth,
  github: testGenericOAuth,
  headhunter: testGenericOAuth,
};

export async function testIntegrationConnection(
  providerId: string,
  snapshot: IntegrationSnapshot
): Promise<{ ok: boolean; error?: string }> {
  const tester = TESTERS[providerId];
  if (!tester) return { ok: false, error: "Bu provayder uchun test hali qo'llab-quvvatlanmaydi" };
  if (!snapshot.credentialsEncrypted) return { ok: false, error: "Ulanish ma'lumotlari topilmadi" };
  try {
    return await tester(snapshot);
  } catch (error) {
    console.error(`Test connection failed for "${providerId}":`, error);
    return { ok: false, error: "Tekshiruvda xatolik yuz berdi" };
  }
}
```

Eslatma: birinchi test ("credentials are missing") `testTelegramBot`ga
tushmasdan, umumiy `if (!snapshot.credentialsEncrypted)` tekshiruvida
to'xtaydi — `providerId: "amocrm"` uchun ham xuddi shu umumiy tekshiruv
ishlaydi, chunki `TESTERS.amocrm` mavjud bo'lsa-da, funksiya ichiga
kirishdan oldin tashqi tekshiruv birinchi bo'lib ishlaydi.

- [ ] Testni qayta ishga tushirish: `npx vitest run src/lib/integrations/test-connection.test.ts` — 2 ta test PASS.
- [ ] `npx tsc --noEmit` — xatosiz.
- [ ] Commit:

```bash
git add src/lib/integrations/test-connection.ts src/lib/integrations/test-connection.test.ts
git commit -m "feat(integrations): add per-provider test-connection checks"
```

---

### Task 2: Detail sahifa uchun server action'lar (Test/Archive/Delete)

**Files:**
- Create: `src/lib/integrations/detail-actions.ts`

**Interfaces:**
- Produces: `testConnectionAction(integrationId: string, locale: string): Promise<{ ok: boolean; error?: string }>`, `archiveIntegrationAction(integrationId: string, locale: string): Promise<void>`, `deleteIntegrationAction(integrationId: string, locale: string): Promise<void>`

- [ ] `src/lib/integrations/detail-actions.ts` yaratish:

```ts
"use server";

import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/db/client";
import { integrations, integrationEvents } from "@/db/schema/integrations";
import { requireOrganization } from "@/lib/auth/dal";
import { testIntegrationConnection } from "./test-connection";

async function loadOwnedIntegration(integrationId: string, locale: string) {
  const { organization } = await requireOrganization(locale);
  const [row] = await db
    .select()
    .from(integrations)
    .where(and(eq(integrations.id, integrationId), eq(integrations.organizationId, organization.id)));
  if (!row) throw new Error("Integration not found");
  return row;
}

export async function testConnectionAction(integrationId: string, locale: string): Promise<{ ok: boolean; error?: string }> {
  const row = await loadOwnedIntegration(integrationId, locale);
  const result = await testIntegrationConnection(row.providerId, {
    credentialsEncrypted: row.credentialsEncrypted,
    config: row.config,
    linkedChannelId: row.linkedChannelId,
  });

  await db
    .update(integrations)
    .set({
      status: result.ok ? "active" : "need_attention",
      lastVerifiedAt: result.ok ? new Date() : row.lastVerifiedAt,
      lastError: result.ok ? null : (result.error ?? "Noma'lum xato"),
      updatedAt: new Date(),
    })
    .where(eq(integrations.id, integrationId));

  await db.insert(integrationEvents).values({
    integrationId,
    type: result.ok ? "verified" : "error",
    message: result.ok ? "Manual test connection succeeded" : result.error,
  });

  revalidatePath(`/${locale}/integrations/${integrationId}`);
  return result;
}

export async function archiveIntegrationAction(integrationId: string, locale: string): Promise<void> {
  await loadOwnedIntegration(integrationId, locale);
  await db
    .update(integrations)
    .set({ status: "archived", updatedAt: new Date() })
    .where(eq(integrations.id, integrationId));
  await db.insert(integrationEvents).values({ integrationId, type: "archived" });
  revalidatePath(`/${locale}/integrations`);
  revalidatePath(`/${locale}/integrations/${integrationId}`);
}

export async function deleteIntegrationAction(integrationId: string, locale: string): Promise<void> {
  await loadOwnedIntegration(integrationId, locale);
  await db.delete(integrations).where(eq(integrations.id, integrationId));
  revalidatePath(`/${locale}/integrations`);
  redirect(`/${locale}/integrations`);
}
```

`integrationEvents` uchun `deleteIntegrationAction`da alohida yozuv
qo'shilmaydi — chunki `integrations` jadvalidagi `onDelete: "cascade"`
tufayli tegishli `integration_events` qatorlari ham avtomatik o'chadi (guruh-1
sxemasida belgilangan).

- [ ] `npx tsc --noEmit` — xatosiz.
- [ ] Commit:

```bash
git add src/lib/integrations/detail-actions.ts
git commit -m "feat(integrations): add test-connection, archive, and delete server actions"
```

---

### Task 3: Detail sahifa — Profil va Ulanish tafsilotlari bo'limlari

**Files:**
- Create: `src/app/[locale]/(dashboard)/integrations/[id]/page.tsx`

**Interfaces:**
- Consumes: `integrations`, `integrationEvents` (`@/db/schema/integrations`), `INTEGRATION_PROVIDERS` (`@/lib/integrations/providers`), `requireOrganization`

- [ ] `src/app/[locale]/(dashboard)/integrations/[id]/page.tsx` yaratish:

```tsx
import { eq, and, desc } from "drizzle-orm";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { db } from "@/db/client";
import { integrations, integrationEvents } from "@/db/schema/integrations";
import { requireOrganization } from "@/lib/auth/dal";
import { Link } from "@/i18n/navigation";
import { ArrowLeft } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { IntegrationDetailActions } from "@/components/dashboard/integrations/integration-detail-actions";
import { IntegrationLifecycleLog } from "@/components/dashboard/integrations/integration-lifecycle-log";

export default async function IntegrationDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  const { organization } = await requireOrganization(locale);
  const t = await getTranslations("integrations.detail");

  const [integration] = await db
    .select()
    .from(integrations)
    .where(and(eq(integrations.id, id), eq(integrations.organizationId, organization.id)));

  if (!integration) notFound();

  const events = await db
    .select()
    .from(integrationEvents)
    .where(eq(integrationEvents.integrationId, id))
    .orderBy(desc(integrationEvents.createdAt))
    .limit(50);

  return (
    <div className="flex flex-col gap-6">
      <Button size="sm" variant="ghost" className="w-fit gap-2" render={<Link href="/integrations" />}>
        <ArrowLeft className="size-4" /> {t("back")}
      </Button>

      <Card>
        <CardContent className="flex items-start justify-between gap-4 pt-6">
          <div>
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{t("profile")}</p>
            <h1 className="text-xl font-semibold">{integration.providerId}</h1>
          </div>
          <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium">{t(`status.${integration.status}`)}</span>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{t("lastVerified")}</p>
            <p className="mt-1 text-sm">
              {integration.lastVerifiedAt ? new Intl.DateTimeFormat(locale).format(integration.lastVerifiedAt) : "—"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{t("errors")}</p>
            <p className="mt-1 text-sm text-destructive">{integration.lastError ?? t("noErrors")}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{t("usedBy")}</p>
            <p className="mt-1 text-sm">{integration.agentId ?? "—"}</p>
          </CardContent>
        </Card>
      </div>

      <IntegrationLifecycleLog events={events} locale={locale} />

      <IntegrationDetailActions integrationId={integration.id} locale={locale} />
    </div>
  );
}
```

- [ ] `npx tsc --noEmit` — `IntegrationDetailActions`/`IntegrationLifecycleLog` topilmadi xatosi kutiladi (keyingi tasklarda yaratiladi) — bu oraliq holat.

- [ ] Commit **qilinmaydi** — Task 4-5 bilan birga.

---

### Task 4: Lifecycle log komponenti

**Files:**
- Create: `src/components/dashboard/integrations/integration-lifecycle-log.tsx`

**Interfaces:**
- Produces: `IntegrationLifecycleLog` komponenti, props: `{ events: { id: string; type: string; message: string | null; createdAt: Date }[]; locale: string }`

- [ ] `src/components/dashboard/integrations/integration-lifecycle-log.tsx` yaratish:

```tsx
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function IntegrationLifecycleLog({
  events,
  locale,
}: {
  events: { id: string; type: string; message: string | null; createdAt: Date }[];
  locale: string;
}) {
  const t = useTranslations("integrations.detail");

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("lifecycleLog")}</CardTitle>
        <p className="text-sm text-muted-foreground">{t("lifecycleLogSubtitle")}</p>
      </CardHeader>
      <CardContent>
        {events.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("noEvents")}</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {events.map((event) => (
              <li key={event.id} className="flex items-start justify-between gap-4 border-b border-border pb-2 text-sm last:border-0">
                <div>
                  <p className="font-medium">{t(`eventTypes.${event.type}`)}</p>
                  {event.message && <p className="text-muted-foreground">{event.message}</p>}
                </div>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {new Intl.DateTimeFormat(locale, { dateStyle: "short", timeStyle: "short" }).format(event.createdAt)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
```

Bu — Server Component'dan chaqirilgan (`page.tsx` ichida, `"use client"` yo'q)
oddiy funksiya, `useTranslations` next-intl'ning server/client ikkalasida ham
ishlaydigan varianti orqali chaqiriladi (loyihaning boshqa server
komponentlarida ham xuddi shu naqsh ishlatiladi).

- [ ] `messages/uz.json`'ning `integrations` bo'limiga `detail` obyektini qo'shish:

```json
"detail": {
  "back": "Integratsiyalarga qaytish",
  "profile": "Profil",
  "status": {
    "setup_needed": "Sozlanmoqda",
    "verifying": "Tekshirilmoqda",
    "active": "Faol",
    "need_attention": "E'tibor talab qiladi",
    "archived": "Arxivlangan"
  },
  "lastVerified": "Oxirgi tekshiruv",
  "errors": "Xatolar",
  "noErrors": "Xato yo'q",
  "usedBy": "Foydalanuvchi (agent)",
  "lifecycleLog": "Lifecycle jurnali",
  "lifecycleLogSubtitle": "Holat o'zgarishlari, tekshiruv natijalari va reauth hodisalarining audit tarixi.",
  "noEvents": "Hali hech qanday hodisa yo'q.",
  "eventTypes": {
    "created": "Yaratildi",
    "status_changed": "Holat o'zgardi",
    "verified": "Tekshirildi",
    "error": "Xato",
    "reauth": "Qayta autentifikatsiya",
    "archived": "Arxivlandi",
    "deleted": "O'chirildi"
  },
  "testConnection": "Ulanishni tekshirish",
  "testing": "Tekshirilmoqda...",
  "archive": "Arxivlash",
  "delete": "O'chirish",
  "deleteConfirm": "Bu integratsiyani butunlay o'chirmoqchimisiz? Bu amalni orqaga qaytarib bo'lmaydi.",
  "dangerZone": "Xavfli hudud",
  "dangerZoneDescription": "Integratsiyani o'chirish uni va unga tegishli shifrlangan ma'lumotlarni butunlay olib tashlaydi."
}
```

`messages/ru.json`/`en.json`'ga mos tarjima.

- [ ] `npx tsc --noEmit` — hali `IntegrationDetailActions` topilmadi xatosi (Task 5'da hal bo'ladi).

- [ ] Commit **qilinmaydi** — Task 5 bilan birga.

---

### Task 5: Test/Archive/Delete tugmalari komponenti

**Files:**
- Create: `src/components/dashboard/integrations/integration-detail-actions.tsx`

**Interfaces:**
- Consumes: `testConnectionAction`, `archiveIntegrationAction`, `deleteIntegrationAction` (`@/lib/integrations/detail-actions`)

- [ ] `src/components/dashboard/integrations/integration-detail-actions.tsx` yaratish:

```tsx
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  testConnectionAction,
  archiveIntegrationAction,
  deleteIntegrationAction,
} from "@/lib/integrations/detail-actions";

export function IntegrationDetailActions({ integrationId, locale }: { integrationId: string; locale: string }) {
  const t = useTranslations("integrations.detail");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [testResult, setTestResult] = useState<{ ok: boolean; error?: string } | null>(null);

  const handleTest = () => {
    startTransition(async () => {
      const result = await testConnectionAction(integrationId, locale);
      setTestResult(result);
      router.refresh();
    });
  };

  const handleArchive = () => {
    startTransition(async () => {
      await archiveIntegrationAction(integrationId, locale);
      router.refresh();
    });
  };

  const handleDelete = () => {
    if (!confirm(t("deleteConfirm"))) return;
    startTransition(async () => {
      await deleteIntegrationAction(integrationId, locale);
    });
  };

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" variant="outline" onClick={handleTest} disabled={isPending}>
          {isPending ? t("testing") : t("testConnection")}
        </Button>
        <Button size="sm" variant="outline" onClick={handleArchive} disabled={isPending}>
          {t("archive")}
        </Button>
        {testResult && (
          <span className={`text-sm ${testResult.ok ? "text-green-600 dark:text-green-400" : "text-destructive"}`}>
            {testResult.ok ? "OK" : testResult.error}
          </span>
        )}
      </div>

      <Card className="border-destructive/40">
        <CardHeader>
          <CardTitle className="text-destructive">{t("dangerZone")}</CardTitle>
          <p className="text-sm text-muted-foreground">{t("dangerZoneDescription")}</p>
        </CardHeader>
        <CardContent>
          <Button size="sm" variant="destructive" onClick={handleDelete} disabled={isPending}>
            {t("delete")}
          </Button>
        </CardContent>
      </Card>
    </>
  );
}
```

- [ ] `npx tsc --noEmit` — xatosiz.

- [ ] `npm run dev` orqali Chrome'da tekshirish:
  - `/uz/integrations` sahifasidagi ulangan integratsiya kartasidan detail sahifaga o'tish yo'li mavjudligini tekshirish (Task 6'da qo'shiladi)
  - `/uz/integrations/{id}` to'g'ridan-to'g'ri ochilganda profil, ulanish tafsilotlari, lifecycle log, Test/Archive/Delete tugmalari ko'rinishi
  - "Ulanishni tekshirish" bosilganda natija (OK yoki xato) ko'rsatilishi
  - "O'chirish" bosilganda tasdiqlash so'ralib, tasdiqlansa `/uz/integrations`ga qaytarilishi

- [ ] Commit (Task 3-5 birga):

```bash
git add "src/app/[locale]/(dashboard)/integrations/[id]/page.tsx" \
  src/components/dashboard/integrations/integration-lifecycle-log.tsx \
  src/components/dashboard/integrations/integration-detail-actions.tsx \
  messages/uz.json messages/ru.json messages/en.json
git commit -m "feat(integrations): add per-integration detail/management page"
```

---

### Task 6: "Sizning integratsiyalaringiz" kartalaridan detail sahifaga havola

**Files:**
- Modify: `src/components/dashboard/integrations/integrations-grid.tsx`

**Interfaces:** yo'q (mavjud `renderProviderCard` funksiyasiga havola qo'shiladi)

- [ ] `src/components/dashboard/integrations/integrations-grid.tsx` faylida `renderProviderCard` funksiyasi ichida, `connected` bo'limidagi kartalar uchun (provayder `integrationByProvider`da mavjud bo'lganda) kartaning pastki qismiga kichik "Boshqarish" havolasini qo'shish:

```tsx
{integrationByProvider.has(provider.id) && (
  <Link
    href={`/integrations/${integrationByProvider.get(provider.id)!.id}`}
    className="text-xs text-muted-foreground underline-offset-2 hover:underline"
  >
    {t("manage")}
  </Link>
)}
```

Bu qatorni kartaning `CardContent` ichida, `Badge`/tugma qatoridan keyin qo'shish. `Link` importi kerak: `import { Link } from "@/i18n/navigation";` (fayl boshiga qo'shish).

- [ ] `messages/uz.json`'ning `integrations` bo'limiga `"manage": "Boshqarish"` qo'shish. `ru.json`/`en.json`'ga mos tarjima.
- [ ] `npx tsc --noEmit` — xatosiz.
- [ ] `npm run dev` orqali tekshirish: ulangan integratsiya kartasida "Boshqarish" havolasi ko'rinishi va `/uz/integrations/{id}`ga olib borishi.
- [ ] Commit:

```bash
git add src/components/dashboard/integrations/integrations-grid.tsx messages/uz.json messages/ru.json messages/en.json
git commit -m "feat(integrations): link connected integration cards to their detail page"
```

---

## Tugatish tekshiruvi

- [ ] `npx tsc --noEmit` — xatosiz
- [ ] `npx vitest run src/lib/integrations/` — barcha testlar PASS
- [ ] `npx eslint src/app/[locale]/(dashboard)/integrations/ src/components/dashboard/integrations/` — yangi xato yo'q
- [ ] Chrome orqali to'liq oqim: bir integratsiyani ulash → "Boshqarish" → detail sahifada Test connection/Archive/Delete'ning har birini sinab ko'rish
