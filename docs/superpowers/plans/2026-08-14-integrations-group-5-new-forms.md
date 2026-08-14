# Integrations Guruh 5: Yangi va yangilangan formalar (Implementation Plan)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** SIP va Custom MCP Server dialoglarini soxta (`Mock ... save`) holatdan
haqiqiy `integrations` yozuvchi server action'ga o'tkazish; 1C uchun yangi
forma yaratish (hozir "Tez orada" disabled); VK uchun yangi forma qo'shish;
Custom MCP Server'ni worken.ru'dagi kabi "URL + dinamik HTTP headers"
ko'rinishiga qayta qurish.

**Architecture:** Bitta umumiy `connectFormIntegrationAction` server action
(providerId + config JSON qabul qiladi, `integrations` jadvaliga yozadi) —
har bir forma dialogi shu umumiy action'ni o'z maydonlari bilan chaqiradi.

**Tech Stack:** Next.js Server Actions, React `useTransition`, Drizzle ORM.

**Spec:** `docs/superpowers/specs/2026-08-14-integrations-overhaul-design.md` (4, 7-bo'limlar)

**Depends on:** `2026-08-14-integrations-group-1-data-model.md`

## Global Constraints

- `config` JSON'da parol/token/secret kabi sezgir qiymatlar
  `credentialsEncrypted`ga (shifrlangan), qolgan maydonlar (server manzili,
  URL kabi) `config`ga (ochiq) yoziladi
- `providerId` qiymatlari (`INTEGRATION_PROVIDERS[].id` bilan bir xil bo'lishi shart): `sip`, `oneC`, `vk`, `customMcp`

---

### Task 1: Umumiy forma-integratsiya server action

**Files:**
- Create: `src/lib/integrations/form-actions.ts`
- Test: `src/lib/integrations/form-actions.test.ts`

**Interfaces:**
- Consumes: `encryptCredential` (`@/lib/integrations/credential-crypto`), `integrations`/`integrationEvents` (`@/db/schema/integrations`), `requireOrganization` (`@/lib/auth/dal`)
- Produces: `connectFormIntegrationAction(input: { providerId: string; publicConfig: Record<string, string>; secretConfig: Record<string, string>; locale: string }): Promise<{ success: boolean; error?: string }>`

- [ ] `src/lib/integrations/form-actions.test.ts` yozish (DB'ni mock qilmasdan, faqat funksiya signaturasi va validatsiya mantiqini tekshiruvchi yengil test):

```ts
import { describe, it, expect } from "vitest";
import { buildIntegrationCredentials } from "./form-actions";

describe("buildIntegrationCredentials", () => {
  it("serializes secret fields into a single JSON string for encryption", () => {
    const json = buildIntegrationCredentials({ password: "hunter2", apiKey: "abc" });
    expect(JSON.parse(json)).toEqual({ password: "hunter2", apiKey: "abc" });
  });

  it("returns null when there are no secret fields", () => {
    expect(buildIntegrationCredentials({})).toBeNull();
  });
});
```

- [ ] Testni ishga tushirish: `npx vitest run src/lib/integrations/form-actions.test.ts` — FAIL.

- [ ] `src/lib/integrations/form-actions.ts` yaratish:

```ts
"use server";

import { eq, and } from "drizzle-orm";
import { db } from "@/db/client";
import { integrations, integrationEvents } from "@/db/schema/integrations";
import { requireOrganization } from "@/lib/auth/dal";
import { encryptCredential } from "@/lib/integrations/credential-crypto";

export function buildIntegrationCredentials(secretConfig: Record<string, string>): string | null {
  if (Object.keys(secretConfig).length === 0) return null;
  return JSON.stringify(secretConfig);
}

export async function connectFormIntegrationAction(input: {
  providerId: string;
  publicConfig: Record<string, string>;
  secretConfig: Record<string, string>;
  locale: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const { organization } = await requireOrganization(input.locale);

    const credentialsJson = buildIntegrationCredentials(input.secretConfig);
    const credentialsEncrypted = credentialsJson ? encryptCredential(credentialsJson) : null;

    const [existing] = await db
      .select({ id: integrations.id })
      .from(integrations)
      .where(and(eq(integrations.organizationId, organization.id), eq(integrations.providerId, input.providerId)));

    let integrationId: string;
    if (existing) {
      await db
        .update(integrations)
        .set({
          status: "active",
          config: input.publicConfig,
          credentialsEncrypted,
          lastVerifiedAt: new Date(),
          lastError: null,
          updatedAt: new Date(),
        })
        .where(eq(integrations.id, existing.id));
      integrationId = existing.id;
    } else {
      const [created] = await db
        .insert(integrations)
        .values({
          organizationId: organization.id,
          providerId: input.providerId,
          connectionMode: "form",
          status: "active",
          config: input.publicConfig,
          credentialsEncrypted,
          lastVerifiedAt: new Date(),
        })
        .returning({ id: integrations.id });
      integrationId = created.id;
    }

    await db.insert(integrationEvents).values({ integrationId, type: "created" });

    return { success: true };
  } catch (error) {
    console.error(`Form integration connect failed for "${input.providerId}":`, error);
    return { success: false, error: "Kutilmagan xatolik yuz berdi" };
  }
}
```

- [ ] Testni qayta ishga tushirish: `npx vitest run src/lib/integrations/form-actions.test.ts` — 2 ta test PASS.
- [ ] `npx tsc --noEmit` — xatosiz.
- [ ] Commit:

```bash
git add src/lib/integrations/form-actions.ts src/lib/integrations/form-actions.test.ts
git commit -m "feat(integrations): add shared form-based connect server action"
```

---

### Task 2: SIP dialogini haqiqiy action'ga ulash

**Files:**
- Modify: `src/components/dashboard/integrations/sip-connect-dialog.tsx`

**Interfaces:**
- Consumes: `connectFormIntegrationAction` (`@/lib/integrations/form-actions`)

- [ ] `src/components/dashboard/integrations/sip-connect-dialog.tsx` faylida:
  1. Import qo'shish: `import { connectFormIntegrationAction } from "@/lib/integrations/form-actions";`
  2. Komponent props'iga `locale: string` qo'shish: `export function SipConnectDialog({ locale }: { locale: string }) {`
  3. `handleSubmit` funksiyasini almashtirish:

```ts
const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
  e.preventDefault();
  const formData = new FormData(e.currentTarget);
  startTransition(async () => {
    const result = await connectFormIntegrationAction({
      providerId: "sip",
      publicConfig: { server: String(formData.get("server") ?? "") },
      secretConfig: {
        login: String(formData.get("login") ?? ""),
        password: String(formData.get("password") ?? ""),
      },
      locale,
    });
    if (result.success) setOpen(false);
  });
};
```

- [ ] `src/components/dashboard/integrations/integrations-grid.tsx` faylida `<SipConnectDialog />` chaqiruvini `<SipConnectDialog locale={locale} />`ga o'zgartirish (`locale` prop komponentga guruh-3'da allaqachon qo'shilgan).
- [ ] `npx tsc --noEmit` — xatosiz.
- [ ] Commit:

```bash
git add src/components/dashboard/integrations/sip-connect-dialog.tsx src/components/dashboard/integrations/integrations-grid.tsx
git commit -m "feat(integrations): wire SIP dialog to real integrations table"
```

---

### Task 3: 1C uchun yangi forma

**Files:**
- Create: `src/components/dashboard/integrations/onec-connect-dialog.tsx`
- Modify: `src/components/dashboard/integrations/integrations-grid.tsx`

**Interfaces:**
- Consumes: `connectFormIntegrationAction`

- [ ] `src/components/dashboard/integrations/onec-connect-dialog.tsx` yaratish (worken.ru'dagi 1C formasiga mos: konfiguratsiya turi, base URL, login, parol, ixtiyoriy HTTP header):

```tsx
"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Building2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { connectFormIntegrationAction } from "@/lib/integrations/form-actions";

export function OneCConnectDialog({ locale }: { locale: string }) {
  const t = useTranslations("integrations");
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await connectFormIntegrationAction({
        providerId: "oneC",
        publicConfig: { baseUrl: String(formData.get("baseUrl") ?? "") },
        secretConfig: {
          login: String(formData.get("login") ?? ""),
          password: String(formData.get("password") ?? ""),
        },
        locale,
      });
      if (result.success) setOpen(false);
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button size="sm" variant="outline" className="gap-2">
            {t("connect")} <Building2 className="size-3" />
          </Button>
        }
      />
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>1C ulanishi</DialogTitle>
            <DialogDescription>
              Mahsulot va narxlar ma'lumotlarini 1C bilan sinxronizatsiya qilish uchun ulanish ma'lumotlarini kiriting.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="baseUrl">Bazaviy URL</Label>
              <Input id="baseUrl" name="baseUrl" placeholder="https://erp.example.uz/ut" required />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="login">Foydalanuvchi nomi</Label>
              <Input id="login" name="login" required />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="password">Parol</Label>
              <Input id="password" name="password" type="password" required />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Bekor qilish
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Saqlanmoqda..." : "Saqlash va Ulash"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] `src/components/dashboard/integrations/integrations-grid.tsx` faylida `provider.id === "oneC"` shartini topib (avval default "Tez orada" disabled blokka tushayotgan edi), uni `<OneCConnectDialog locale={locale} />`ga almashtirish. Import qo'shish: `import { OneCConnectDialog } from "./onec-connect-dialog";`
- [ ] `npx tsc --noEmit` — xatosiz.
- [ ] Commit:

```bash
git add src/components/dashboard/integrations/onec-connect-dialog.tsx src/components/dashboard/integrations/integrations-grid.tsx
git commit -m "feat(integrations): add real 1C connect form"
```

---

### Task 4: VK uchun yangi forma

**Files:**
- Create: `src/components/dashboard/integrations/vk-connect-dialog.tsx`
- Modify: `src/components/dashboard/integrations/integrations-grid.tsx`
- Modify: `src/lib/integrations/providers.ts` (agar `vk` yozuvi guruh-1'da qo'shilmagan bo'lsa)

**Interfaces:**
- Consumes: `connectFormIntegrationAction`

- [ ] `src/lib/integrations/providers.ts` faylida `INTEGRATION_PROVIDERS` massivida `{ id: "vk", categories: ["chat"], connectionMode: "form" }` yozuvi borligini tekshirish (guruh-1'da qo'shilgan edi) — yo'q bo'lsa qo'shish.
- [ ] `src/components/dashboard/integrations/vk-connect-dialog.tsx` yaratish (worken.ru'dagi VK formasiga mos: access token, group ID, webhook secret):

```tsx
"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { MessageCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { connectFormIntegrationAction } from "@/lib/integrations/form-actions";

export function VkConnectDialog({ locale }: { locale: string }) {
  const t = useTranslations("integrations");
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await connectFormIntegrationAction({
        providerId: "vk",
        publicConfig: { groupId: String(formData.get("groupId") ?? "") },
        secretConfig: {
          accessToken: String(formData.get("accessToken") ?? ""),
          webhookSecret: String(formData.get("webhookSecret") ?? ""),
        },
        locale,
      });
      if (result.success) setOpen(false);
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button size="sm" variant="outline" className="gap-2">
            {t("connect")} <MessageCircle className="size-3" />
          </Button>
        }
      />
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>VK · ВКонтакте ulanishi</DialogTitle>
            <DialogDescription>VK · ВКонтакте integratsiyasini ulash uchun maydonlarni to'ldiring.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="accessToken">Access token (VK API uchun)</Label>
              <Input id="accessToken" name="accessToken" required />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="groupId">VK guruh ID</Label>
              <Input id="groupId" name="groupId" required />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="webhookSecret">Webhook so'rovlarini tasdiqlash uchun Secret key</Label>
              <Input id="webhookSecret" name="webhookSecret" required />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Bekor qilish
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Saqlanmoqda..." : "Saqlash va Ulash"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] `src/components/dashboard/integrations/integrations-grid.tsx` faylida `provider.id === "vk"` shartini qo'shish (yangi, default "Tez orada" blokidan chiqarib), `<VkConnectDialog locale={locale} />` bilan bog'lash. Import qo'shish: `import { VkConnectDialog } from "./vk-connect-dialog";` `ICONS`ga `vk: MessageCircle` qo'shish.
- [ ] `npx tsc --noEmit` — xatosiz.
- [ ] Commit:

```bash
git add src/components/dashboard/integrations/vk-connect-dialog.tsx src/components/dashboard/integrations/integrations-grid.tsx src/lib/integrations/providers.ts
git commit -m "feat(integrations): add VK connect form"
```

---

### Task 5: Custom MCP Server'ni URL+dinamik headers ko'rinishiga qayta qurish

**Files:**
- Modify: `src/components/dashboard/integrations/mcp-connect-dialog.tsx`

**Interfaces:**
- Consumes: `connectFormIntegrationAction`

- [ ] `src/components/dashboard/integrations/mcp-connect-dialog.tsx` faylini butunlay qayta yozish — hozirgi mantiq (Arioo'ning o'z API kalitini generatsiya qilish) worken.ru'dagi haqiqiy ma'noga mos emas: bu integratsiya **tashqi self-hosted MCP serverni ulash** uchun (URL + HTTP headerlar), Arioo'ning o'z API kalitini yaratish emas:

```tsx
"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Webhook, Plus, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { connectFormIntegrationAction } from "@/lib/integrations/form-actions";

type HeaderRow = { key: string; value: string };

export function McpConnectDialog({ locale }: { locale: string }) {
  const t = useTranslations("integrations");
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [headers, setHeaders] = useState<HeaderRow[]>([{ key: "Authorization", value: "" }]);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const secretConfig: Record<string, string> = {};
    headers.forEach((header, index) => {
      if (header.key.trim()) secretConfig[`header_${index}_${header.key}`] = header.value;
    });
    startTransition(async () => {
      const result = await connectFormIntegrationAction({
        providerId: "customMcp",
        publicConfig: {
          url: String(formData.get("mcpUrl") ?? ""),
          headerKeys: JSON.stringify(headers.map((h) => h.key)),
        },
        secretConfig,
        locale,
      });
      if (result.success) setOpen(false);
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button size="sm" variant="outline" className="gap-2">
            {t("connect")} <Webhook className="size-3" />
          </Button>
        }
      />
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Custom MCP Server ulash</DialogTitle>
            <DialogDescription>
              Self-hosted MCP serverni ulab, uning MCP imkoniyatlar ro'yxatini olib kelish uchun.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="mcpUrl">MCP server URL</Label>
              <Input id="mcpUrl" name="mcpUrl" placeholder="https://mcp.example.com" required />
            </div>
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <Label>HTTP headers</Label>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="gap-1"
                  onClick={() => setHeaders([...headers, { key: "", value: "" }])}
                >
                  <Plus className="size-3" /> Header qo'shish
                </Button>
              </div>
              {headers.map((header, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Input
                    placeholder="Header"
                    value={header.key}
                    onChange={(e) => {
                      const next = [...headers];
                      next[index] = { ...next[index], key: e.target.value };
                      setHeaders(next);
                    }}
                  />
                  <Input
                    placeholder="Value"
                    value={header.value}
                    onChange={(e) => {
                      const next = [...headers];
                      next[index] = { ...next[index], value: e.target.value };
                      setHeaders(next);
                    }}
                  />
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    onClick={() => setHeaders(headers.filter((_, i) => i !== index))}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Bekor qilish
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Ulanmoqda..." : "Ulash"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
```

Header qiymatlari (`secretConfig`) shifrlangan holda saqlanadi (masalan `Authorization: Bearer ...`); header nomlari (`publicConfig.headerKeys`) ochiq saqlanadi — bu detail sahifada (guruh-6) headerlar ro'yxatini qiymatsiz ko'rsatish imkonini beradi.

- [ ] `src/components/dashboard/integrations/integrations-grid.tsx` faylida `<McpConnectDialog />` chaqiruvini `<McpConnectDialog locale={locale} />`ga o'zgartirish.
- [ ] `npx tsc --noEmit` — xatosiz.
- [ ] `npm run dev` orqali Chrome'da tekshirish: Custom MCP Server kartasi bosilganda URL maydoni va "Header qo'shish" tugmasi bilan dinamik ro'yxat ko'rinadi, header qo'shish/o'chirish ishlaydi.
- [ ] Commit:

```bash
git add src/components/dashboard/integrations/mcp-connect-dialog.tsx src/components/dashboard/integrations/integrations-grid.tsx
git commit -m "refactor(integrations): rebuild Custom MCP Server dialog with URL and dynamic headers"
```

---

## Tugatish tekshiruvi

- [ ] `npx tsc --noEmit` — xatosiz
- [ ] `npx vitest run src/lib/integrations/` — barcha testlar PASS
- [ ] Chrome orqali: SIP, 1C, VK, Custom MCP Server kartalarining har biri ulanganda "Sizning integratsiyalaringiz" bo'limiga ko'chishini tasdiqlash (guruh-2'dagi status mantig'i orqali)
