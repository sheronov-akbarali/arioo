# Integrations Guruh 1: Ma'lumotlar modeli va umumiy infratuzilma (Implementation Plan)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Barcha integratsiyalar uchun umumiy status/lifecycle ma'lumotlar
qatlamini (`integrations` + `integration_events` jadvallari), shifrlash
modulini va status-hisoblash logikasini yaratish — keyingi guruhlar shu
ustiga quriladi.

**Architecture:** Drizzle ORM orqali ikkita yangi jadval, AES-256-GCM asosidagi
umumiy credential-crypto moduli (mavjud `telegram/session-crypto.ts`
naqshiga mos, lekin mustaqil), va provayder katalogini config-driven qilib
qayta yozish.

**Tech Stack:** Drizzle ORM (Postgres/Neon), Node.js `crypto` (AES-256-GCM), TypeScript, Vitest.

**Spec:** `docs/superpowers/specs/2026-08-14-integrations-overhaul-design.md` (3, 4, 3.3-bo'limlar)

## Global Constraints

- Shifrlash kaliti env o'zgaruvchisi: `INTEGRATION_CREDENTIALS_ENCRYPTION_KEY`, 32 bayt, base64
- `organizationId` + `providerId` juftligi unique bo'lishi shart
- `providerId` qiymatlari **`src/lib/integrations/providers.ts`dagi `INTEGRATION_PROVIDERS[].id` bilan harfma-harf bir xil bo'lishi shart** (aks holda status-qidiruv ishlamay qoladi): `telegram_bot`, `telegram_mtproto` (Telegram — ikkiga bo'lingan yagona istisno), `whatsapp`, `websiteWidget`, `olx`, `sip`, `oneC`, `customMcp`, `vk`, `amocrm`, `bitrix24`, `google`, `github`, `headhunter`

---

### Task 1: `integrations` va `integration_events` jadvallarini yaratish

**Files:**
- Create: `src/db/schema/integrations.ts`
- Modify: `src/db/schema/index.ts` (yangi export qo'shish)

**Interfaces:**
- Produces: `integrations` (jadval), `integrationConnectionMode` (pgEnum: `"oauth" | "form" | "wizard" | "special"`), `integrationStatus` (pgEnum: `"setup_needed" | "verifying" | "active" | "need_attention" | "archived"`), `integrationEvents` (jadval), `integrationEventType` (pgEnum: `"created" | "status_changed" | "verified" | "error" | "reauth" | "archived" | "deleted"`)

- [ ] `src/db/schema/integrations.ts` faylini yaratish:

```ts
import { pgTable, text, timestamp, pgEnum, jsonb, uniqueIndex } from "drizzle-orm/pg-core";
import { organizations } from "./org";
import { channels } from "./channels";
import { telegramChannelConnections } from "./telegram-channel-connection";
import { aiAgents } from "./agents";

export const integrationConnectionMode = pgEnum("integration_connection_mode", [
  "oauth",
  "form",
  "wizard",
  "special",
]);

export const integrationStatus = pgEnum("integration_status", [
  "setup_needed",
  "verifying",
  "active",
  "need_attention",
  "archived",
]);

export const integrations = pgTable(
  "integration",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organizationId")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    providerId: text("providerId").notNull(),
    connectionMode: integrationConnectionMode("connectionMode").notNull(),
    status: integrationStatus("status").notNull().default("setup_needed"),
    credentialsEncrypted: text("credentialsEncrypted"),
    config: jsonb("config").$type<Record<string, unknown>>(),
    linkedChannelId: text("linkedChannelId").references(() => channels.id, {
      onDelete: "set null",
    }),
    linkedTelegramConnectionId: text("linkedTelegramConnectionId").references(
      () => telegramChannelConnections.id,
      { onDelete: "set null" }
    ),
    agentId: text("agentId").references(() => aiAgents.id, { onDelete: "set null" }),
    lastVerifiedAt: timestamp("lastVerifiedAt", { mode: "date" }),
    lastError: text("lastError"),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("integration_org_provider_idx").on(table.organizationId, table.providerId)]
);

export const integrationEventType = pgEnum("integration_event_type", [
  "created",
  "status_changed",
  "verified",
  "error",
  "reauth",
  "archived",
  "deleted",
]);

export const integrationEvents = pgTable("integration_event", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  integrationId: text("integrationId")
    .notNull()
    .references(() => integrations.id, { onDelete: "cascade" }),
  type: integrationEventType("type").notNull(),
  message: text("message"),
  createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
});
```

- [ ] `src/db/schema/index.ts` ichiga `export * from "./integrations";` qatorini qo'shish (mavjud eksportlar formatiga mos joyga).
- [ ] Terminalda `node -e 'require("dotenv").config({path: ".env.local"}); require("child_process").execSync("npx drizzle-kit push", {stdio: "inherit"})'` buyrug'ini ishga tushirib, jadvallarni Neon bazasiga yozish. Interaktiv so'rov chiqsa (masalan "create table" tasdiqlash), "Yes" tanlash.
- [ ] `npx tsc --noEmit` ishga tushirib, xato yo'qligini tekshirish.
- [ ] Commit:

```bash
git add src/db/schema/integrations.ts src/db/schema/index.ts drizzle/
git commit -m "feat(integrations): add integrations and integration_events tables"
```

---

### Task 2: Umumiy shifrlash moduli (`credential-crypto.ts`)

**Files:**
- Create: `src/lib/integrations/credential-crypto.ts`
- Test: `src/lib/integrations/credential-crypto.test.ts`

**Interfaces:**
- Consumes: Node.js `crypto` (`createCipheriv`, `createDecipheriv`, `randomBytes`)
- Produces: `encryptCredential(plaintext: string): string`, `decryptCredential(ciphertext: string): string`

- [ ] `.env.local` fayliga yangi qator qo'shish (mavjud `TELEGRAM_SESSION_ENCRYPTION_KEY` qatoridan keyin):

```
INTEGRATION_CREDENTIALS_ENCRYPTION_KEY=
```

Qiymatni generatsiya qilish uchun terminalda: `openssl rand -base64 32` ishga tushirish va natijani shu qatorga yozish.

- [ ] `.env.example` fayliga ham `INTEGRATION_CREDENTIALS_ENCRYPTION_KEY=` qatorini (bo'sh qiymat bilan) qo'shish.

- [ ] `src/lib/integrations/credential-crypto.test.ts` yozish (avval xato beradigan holatda):

```ts
import { describe, it, expect, beforeAll } from "vitest";
import { encryptCredential, decryptCredential } from "./credential-crypto";

beforeAll(() => {
  process.env.INTEGRATION_CREDENTIALS_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString("base64");
});

describe("credential-crypto", () => {
  it("round-trips a plaintext string through encrypt/decrypt", () => {
    const plaintext = "super-secret-token-value";
    const encrypted = encryptCredential(plaintext);
    expect(encrypted).not.toEqual(plaintext);
    expect(decryptCredential(encrypted)).toEqual(plaintext);
  });

  it("produces different ciphertext for the same plaintext (random IV)", () => {
    const a = encryptCredential("same-value");
    const b = encryptCredential("same-value");
    expect(a).not.toEqual(b);
  });

  it("throws when the encryption key env var is missing", () => {
    const original = process.env.INTEGRATION_CREDENTIALS_ENCRYPTION_KEY;
    delete process.env.INTEGRATION_CREDENTIALS_ENCRYPTION_KEY;
    expect(() => encryptCredential("x")).toThrow();
    process.env.INTEGRATION_CREDENTIALS_ENCRYPTION_KEY = original;
  });
});
```

- [ ] Testni ishga tushirish: `npx vitest run src/lib/integrations/credential-crypto.test.ts` — `Cannot find module './credential-crypto'` xatosi bilan FAIL bo'lishi kerak.

- [ ] `src/lib/integrations/credential-crypto.ts` yaratish (mavjud `src/lib/telegram/session-crypto.ts`dagi bir xil AES-256-GCM naqshi, boshqa env nomi bilan):

```ts
import "server-only";
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

function getKey(): Buffer {
  const raw = process.env.INTEGRATION_CREDENTIALS_ENCRYPTION_KEY;
  if (!raw) throw new Error("INTEGRATION_CREDENTIALS_ENCRYPTION_KEY is not set");
  const key = Buffer.from(raw, "base64");
  if (key.length !== 32) {
    throw new Error("INTEGRATION_CREDENTIALS_ENCRYPTION_KEY must decode to exactly 32 bytes");
  }
  return key;
}

export function encryptCredential(plaintext: string): string {
  const key = getKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return Buffer.concat([iv, authTag, encrypted]).toString("base64");
}

export function decryptCredential(ciphertext: string): string {
  const key = getKey();
  const raw = Buffer.from(ciphertext, "base64");
  const iv = raw.subarray(0, 12);
  const authTag = raw.subarray(12, 28);
  const encrypted = raw.subarray(28);
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
}
```

`"server-only"` importi bu modulni client komponentlarda import qilishning oldini oladi (loyihaning mavjud konvensiyasi).

- [ ] Testni qayta ishga tushirish: `npx vitest run src/lib/integrations/credential-crypto.test.ts` — 3 ta test ham PASS bo'lishi kerak.

- [ ] Commit:

```bash
git add src/lib/integrations/credential-crypto.ts src/lib/integrations/credential-crypto.test.ts .env.example
git commit -m "feat(integrations): add AES-256-GCM credential encryption helper"
```

---

### Task 3: Provider katalogini config-driven qilib qayta yozish

**Files:**
- Create: `src/lib/integrations/providers.ts`
- Modify: `src/components/dashboard/integrations/integrations-grid.tsx` (import manzilini yangilash)
- Delete: `src/lib/integrations-data.ts` (o'rniga yangi fayl ishlatiladi)

**Interfaces:**
- Produces: `IntegrationCategory` (type), `ConnectionMode` (type: `"oauth" | "form" | "wizard" | "special"`), `ProviderConfig` (type), `INTEGRATION_PROVIDERS` (array)
- Consumes (keyingi guruhlar uchun): `ProviderConfig.oauth?.envPrefix` — OAuth guruh-4'da `${envPrefix}_CLIENT_ID` / `${envPrefix}_CLIENT_SECRET` sifatida o'qiladi

- [ ] `src/lib/integrations/providers.ts` yaratish:

```ts
export type IntegrationCategory =
  | "chat"
  | "marketplace"
  | "crm"
  | "voice"
  | "files"
  | "calendar"
  | "git"
  | "other";

export type ConnectionMode = "oauth" | "form" | "wizard" | "special";

export type ProviderConfig = {
  id: string;
  categories: IntegrationCategory[];
  connectionMode: ConnectionMode;
  oauth?: { envPrefix: string; scopes: string[] };
};

export const INTEGRATION_PROVIDERS: ProviderConfig[] = [
  { id: "telegram", categories: ["chat"], connectionMode: "special" },
  { id: "whatsapp", categories: ["chat"], connectionMode: "special" },
  { id: "websiteWidget", categories: ["chat"], connectionMode: "special" },
  { id: "olx", categories: ["marketplace"], connectionMode: "special" },
  { id: "sip", categories: ["voice"], connectionMode: "form" },
  { id: "oneC", categories: ["crm"], connectionMode: "form" },
  { id: "customMcp", categories: ["other"], connectionMode: "form" },
  { id: "vk", categories: ["chat"], connectionMode: "form" },
  {
    id: "amocrm",
    categories: ["crm"],
    connectionMode: "oauth",
    oauth: { envPrefix: "AMOCRM", scopes: [] },
  },
  {
    id: "bitrix24",
    categories: ["crm"],
    connectionMode: "oauth",
    oauth: { envPrefix: "BITRIX24", scopes: ["im", "imbot", "imopenlines", "crm", "user_basic"] },
  },
  {
    id: "google",
    categories: ["files", "calendar"],
    connectionMode: "oauth",
    oauth: {
      envPrefix: "GOOGLE",
      scopes: [
        "https://www.googleapis.com/auth/drive",
        "https://www.googleapis.com/auth/spreadsheets",
        "https://www.googleapis.com/auth/calendar",
        "https://www.googleapis.com/auth/calendar.events",
        "https://www.googleapis.com/auth/userinfo.profile",
        "https://www.googleapis.com/auth/userinfo.email",
      ],
    },
  },
  {
    id: "github",
    categories: ["git"],
    connectionMode: "oauth",
    oauth: { envPrefix: "GITHUB", scopes: ["repo", "read:user"] },
  },
  {
    id: "headhunter",
    categories: ["chat"],
    connectionMode: "oauth",
    oauth: { envPrefix: "HEADHUNTER", scopes: [] },
  },
];
```

- [ ] `src/components/dashboard/integrations/integrations-grid.tsx` faylida `import { INTEGRATION_PROVIDERS, type IntegrationCategory } from "@/lib/integrations-data";` qatorini `import { INTEGRATION_PROVIDERS, type IntegrationCategory } from "@/lib/integrations/providers";` bilan almashtirish (fayl boshidagi import bo'limi, taxminan 15-qator).

- [ ] `ICONS` obyektiga yangi providerlar uchun ikonalar qo'shish (fayl boshi, ~28-38 qator): `vk: MessageCircle, google: FileSpreadsheet, headhunter: Building2` qo'shish, `lucide-react` importidan kerak bo'lsa yangi ikonka import qilish (masalan `Users` HeadHunter uchun — mavjud ikonalardan foydalanish yetarli, yangisini import qilish shart emas).

- [ ] Eski `src/lib/integrations-data.ts` faylini o'chirish: `rm src/lib/integrations-data.ts`. Bu faylni import qilgan boshqa joylarni tekshirish: `grep -rn "integrations-data" src/` — topilgan har bir joyni `@/lib/integrations/providers` bilan almashtirish.

- [ ] `npx tsc --noEmit` ishga tushirib, xato yo'qligini tekshirish (ayniqsa `googleWorkspace` provider ID'sini ishlatgan eski kodlar bo'lsa — bular guruh-5'da to'liq hal qilinadi, hozircha faqat kompilyatsiya xatosi bo'lmasligi yetarli; agar `googleWorkspace`ga tegishli kod topilsa, uni vaqtincha `google` bilan almashtirish).

- [ ] Commit:

```bash
git add src/lib/integrations/providers.ts src/components/dashboard/integrations/integrations-grid.tsx
git rm src/lib/integrations-data.ts
git commit -m "refactor(integrations): move provider catalog to config-driven providers.ts"
```

---

### Task 4: Status hisoblash yordamchi funksiyasi

**Files:**
- Create: `src/lib/integrations/status.ts`
- Test: `src/lib/integrations/status.test.ts`

**Interfaces:**
- Consumes: `integrations` jadval qatori shakli — `{ status: IntegrationStatus, lastError: string | null }`
- Produces: `getStatusLabel(status: IntegrationStatus, locale: "uz" | "ru" | "en"): string`, `STATUS_DASHBOARD_ORDER: IntegrationStatus[]`, `countByStatus(rows: { status: IntegrationStatus }[]): Record<IntegrationStatus, number>`

- [ ] `src/lib/integrations/status.test.ts` yozish:

```ts
import { describe, it, expect } from "vitest";
import { countByStatus, STATUS_DASHBOARD_ORDER } from "./status";

describe("countByStatus", () => {
  it("counts rows grouped by status, defaulting missing statuses to 0", () => {
    const rows = [
      { status: "active" as const },
      { status: "active" as const },
      { status: "need_attention" as const },
    ];
    const counts = countByStatus(rows);
    expect(counts.active).toBe(2);
    expect(counts.need_attention).toBe(1);
    expect(counts.verifying).toBe(0);
    expect(counts.setup_needed).toBe(0);
    expect(counts.archived).toBe(0);
  });

  it("exposes a fixed dashboard display order with 5 statuses", () => {
    expect(STATUS_DASHBOARD_ORDER).toEqual([
      "active",
      "need_attention",
      "verifying",
      "setup_needed",
      "archived",
    ]);
  });
});
```

- [ ] Testni ishga tushirish: `npx vitest run src/lib/integrations/status.test.ts` — FAIL (`Cannot find module './status'`).

- [ ] `src/lib/integrations/status.ts` yaratish:

```ts
export type IntegrationStatus = "setup_needed" | "verifying" | "active" | "need_attention" | "archived";

export const STATUS_DASHBOARD_ORDER: IntegrationStatus[] = [
  "active",
  "need_attention",
  "verifying",
  "setup_needed",
  "archived",
];

export function countByStatus(rows: { status: IntegrationStatus }[]): Record<IntegrationStatus, number> {
  const counts: Record<IntegrationStatus, number> = {
    setup_needed: 0,
    verifying: 0,
    active: 0,
    need_attention: 0,
    archived: 0,
  };
  for (const row of rows) {
    counts[row.status] += 1;
  }
  return counts;
}
```

- [ ] Testni qayta ishga tushirish: `npx vitest run src/lib/integrations/status.test.ts` — 2 ta test PASS.

- [ ] Commit:

```bash
git add src/lib/integrations/status.ts src/lib/integrations/status.test.ts
git commit -m "feat(integrations): add status counting helper for dashboard"
```

---

## Tugatish tekshiruvi

- [ ] `npx tsc --noEmit` — xatosiz
- [ ] `npx vitest run src/lib/integrations/` — barcha testlar PASS
- [ ] `npm run dev` ishga tushirib, `/uz/integrations` sahifasi hali eski ko'rinishda (lekin xatosiz) ochilishini tasdiqlash — bu guruh faqat fundament, UI guruh-2'da o'zgaradi
