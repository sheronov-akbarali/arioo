# Homepage worken.ru Structural Parity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring the homepage's section composition and CTA behavior into structural parity with worken.ru: restore the deleted consultation lead-form feature, embed a pricing table on the homepage, and repoint the Hero/Pricing CTAs to the restored form — while leaving the header CTA, `/partners`, and `/(dashboard)/billing` untouched.

**Architecture:** Restore seven previously-deleted files verbatim from git history (`src/lib/consultation/*` and `src/components/marketing/lead-form.tsx`), re-add the `leadForm` i18n block, then wire the homepage (`src/app/[locale]/page.tsx`) to render `PricingTable` and `LeadForm` after `WorkZonesSection`, and flip two `href`s (`hero.tsx`, `pricing-table.tsx`) plus one i18n string (`hero.ctaPrimary`) back from `/sign-up` to `/#lead-form`.

**Tech Stack:** Next.js App Router, next-intl, Zod, React 19 `useActionState`, Vitest.

## Global Constraints

- Scope is the homepage only. Do not modify `/partners`, `/(dashboard)/billing`, or `/pricing` (the standalone page keeps its own copy of `PricingTable`, untouched).
- `nav.cta` (header) keeps its current text ("Start for free" / "Bepul boshlash" / "Начать бесплатно") and `/sign-up` target — do not revert it.
- Do not restore `partners.formTitle` / `partners.formSubtitle` or `billing.requestInvoice` i18n keys — both are out of scope per the design spec.
- All three locale files (`en`, `ru`, `uz`) must be updated together in every i18n-touching task so the app never ships with a missing translation key in one locale.
- `TELEGRAM_BOT_TOKEN` / `TELEGRAM_LEADS_CHAT_ID` already exist in Vercel's project env vars and in local `.env.local` — no new secrets need sourcing, only the `.env.example` template entries.

---

## Task 1: Restore `src/lib/consultation/` (schema, rate-limit, telegram, actions)

**Files:**
- Create: `src/lib/consultation/schema.ts`
- Create: `src/lib/consultation/schema.test.ts`
- Create: `src/lib/consultation/rate-limit.ts`
- Create: `src/lib/consultation/rate-limit.test.ts`
- Create: `src/lib/consultation/telegram.ts`
- Create: `src/lib/consultation/telegram.test.ts`
- Create: `src/lib/consultation/actions.ts`

**Interfaces:**
- Produces: `parseConsultationInput(input: unknown): ConsultationParseResult` from `schema.ts`, where `ConsultationParseResult = { success: true; data: { name: string; phone: string } } | { success: false; error: string; field: "name" | "phone" | "unknown" }`.
- Produces: `checkRateLimit(key: string): boolean` and `__rateLimitSizeForTests(): number` from `rate-limit.ts`.
- Produces: `sendLeadNotification(lead: { name: string; phone: string }): Promise<{ ok: boolean }>` from `telegram.ts`.
- Produces: `submitConsultationAction(prevState: ConsultationState, formData: FormData): Promise<ConsultationState>` and `type ConsultationState = { status: "idle" | "success" | "error"; message?: "validation" | "invalidPhone" | "rateLimit"; values?: { name: string; phone: string }; attempt?: number }` from `actions.ts` — consumed by Task 2's `LeadForm`.

- [ ] **Step 1: Create `src/lib/consultation/schema.ts`**

```ts
import { z } from "zod";

// Reject control/format characters (newlines in particular): the name is
// interpolated into a multi-line Telegram notification, so a "\n" inside it
// could forge extra lines in that message.
const NO_CONTROL_CHARS = /^[^\p{Cc}\p{Cf}]+$/u;

const consultationSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2)
    .max(100)
    .regex(NO_CONTROL_CHARS, "Name must not contain control characters"),
  phone: z
    .string()
    .trim()
    .regex(/^\+998\d{9}$/, "Phone must match +998XXXXXXXXX"),
});

export type ConsultationInput = z.infer<typeof consultationSchema>;

// `field` tells the caller *which* input failed so the UI can show a specific
// message (e.g. the "+998XXXXXXXXX" hint) instead of one generic error.
export type ConsultationParseResult =
  | { success: true; data: ConsultationInput }
  | { success: false; error: string; field: "name" | "phone" | "unknown" };

export function parseConsultationInput(input: unknown): ConsultationParseResult {
  const result = consultationSchema.safeParse(input);
  if (!result.success) {
    const issue = result.error.issues[0];
    const path = issue?.path[0];
    const field = path === "name" || path === "phone" ? path : "unknown";
    return { success: false, error: issue?.message ?? "Invalid input", field };
  }
  return { success: true, data: result.data };
}
```

- [ ] **Step 2: Create `src/lib/consultation/schema.test.ts`**

```ts
import { describe, expect, it } from "vitest";
import { parseConsultationInput } from "./schema";

describe("parseConsultationInput", () => {
  it("accepts a valid Uzbek phone number and name", () => {
    const result = parseConsultationInput({ name: "Akbarali", phone: "+998901234567" });
    expect(result).toEqual({ success: true, data: { name: "Akbarali", phone: "+998901234567" } });
  });

  it("rejects a name shorter than 2 characters", () => {
    const result = parseConsultationInput({ name: "A", phone: "+998901234567" });
    expect(result.success).toBe(false);
  });

  it("rejects a phone number not matching the +998XXXXXXXXX format", () => {
    const result = parseConsultationInput({ name: "Akbarali", phone: "901234567" });
    expect(result.success).toBe(false);
  });

  it("rejects non-object input", () => {
    const result = parseConsultationInput(null);
    expect(result.success).toBe(false);
  });

  it("reports which field failed so the UI can pick a specific message", () => {
    const badPhone = parseConsultationInput({ name: "Akbarali", phone: "901234567" });
    expect(badPhone.success === false && badPhone.field).toBe("phone");

    const badName = parseConsultationInput({ name: "A", phone: "+998901234567" });
    expect(badName.success === false && badName.field).toBe("name");
  });

  it("rejects a name containing newlines that could forge Telegram lines", () => {
    const result = parseConsultationInput({
      name: "Akbarali\nTelefon: +998900000000",
      phone: "+998901234567",
    });
    expect(result.success).toBe(false);
    expect(result.success === false && result.field).toBe("name");
  });

  it("rejects a name containing a carriage return", () => {
    const result = parseConsultationInput({ name: "Ak\rbarali", phone: "+998901234567" });
    expect(result.success).toBe(false);
  });
});
```

- [ ] **Step 3: Create `src/lib/consultation/rate-limit.ts`**

```ts
// In-memory only — resets on redeploy and is not shared across serverless
// instances. Acceptable for MVP lead-volume; revisit with a durable store
// (e.g. Vercel KV/Upstash) once traffic justifies it.
const lastRequestAt = new Map<string, number>();
const WINDOW_MS = 30_000;

// Entries older than the window can never block anything again, so sweep them
// on every call. This keeps the Map bounded by the number of *currently rate
// limited* keys instead of growing once per unique IP for the lifetime of the
// process. An O(n) pass over a small map is cheaper than the bookkeeping a
// background timer would need at MVP scale.
function evictExpired(now: number): void {
  for (const [key, at] of lastRequestAt) {
    if (now - at >= WINDOW_MS) {
      lastRequestAt.delete(key);
    }
  }
}

export function checkRateLimit(key: string): boolean {
  const now = Date.now();
  evictExpired(now);

  const last = lastRequestAt.get(key);
  if (last !== undefined && now - last < WINDOW_MS) {
    return false;
  }
  lastRequestAt.set(key, now);
  return true;
}

// Test-only introspection so the unit tests can assert that expired entries are
// actually removed from the Map, not merely ignored. Not used by app code.
export function __rateLimitSizeForTests(): number {
  return lastRequestAt.size;
}
```

- [ ] **Step 4: Create `src/lib/consultation/rate-limit.test.ts`**

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { checkRateLimit, __rateLimitSizeForTests } from "./rate-limit";

describe("checkRateLimit", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("allows the first request for a key", () => {
    expect(checkRateLimit("1.2.3.4-a")).toBe(true);
  });

  it("blocks a second request within the window", () => {
    checkRateLimit("1.2.3.4-b");
    expect(checkRateLimit("1.2.3.4-b")).toBe(false);
  });

  it("allows a request again after the window passes", () => {
    checkRateLimit("1.2.3.4-c");
    vi.setSystemTime(new Date("2026-01-01T00:00:31Z"));
    expect(checkRateLimit("1.2.3.4-c")).toBe(true);
  });

  it("evicts entries older than the window instead of growing forever", () => {
    // Start well past every key recorded by the tests above so the first call
    // here sweeps them out and the Map size is deterministic.
    const base = Date.parse("2026-01-01T02:00:00Z");
    vi.setSystemTime(new Date(base));
    for (let i = 0; i < 50; i++) {
      checkRateLimit(`10.0.0.${i}-evict`);
    }
    expect(__rateLimitSizeForTests()).toBe(50);

    // Past the window, a single call for an unrelated key must sweep all 50
    // stale entries out of the Map, leaving only the key just recorded.
    vi.setSystemTime(new Date(base + 31_000));
    expect(checkRateLimit("10.0.0.254-sweeper")).toBe(true);
    expect(__rateLimitSizeForTests()).toBe(1);
  });

  it("keeps rate limiting correct for a key across many windows", () => {
    let t = Date.parse("2026-01-01T03:00:00Z");
    for (let cycle = 0; cycle < 5; cycle++) {
      vi.setSystemTime(new Date(t));
      expect(checkRateLimit("1.2.3.4-cycles")).toBe(true);

      vi.setSystemTime(new Date(t + 1_000));
      expect(checkRateLimit("1.2.3.4-cycles")).toBe(false);

      t += 31_000;
    }
    // Only the single live entry for this key should remain.
    expect(__rateLimitSizeForTests()).toBe(1);
  });
});
```

- [ ] **Step 5: Create `src/lib/consultation/telegram.ts`**

```ts
// Hard-fails the build if this module is ever pulled into a client bundle —
// it reads TELEGRAM_BOT_TOKEN and must stay server-side.
import "server-only";

export async function sendLeadNotification(lead: {
  name: string;
  phone: string;
}): Promise<{ ok: boolean }> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_LEADS_CHAT_ID;

  if (!token || !chatId) {
    console.error("TELEGRAM_BOT_TOKEN or TELEGRAM_LEADS_CHAT_ID is not set");
    return { ok: false };
  }

  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: `Yangi lid — Arioo\nIsm: ${lead.name}\nTelefon: ${lead.phone}`,
      }),
    });
    return { ok: response.ok };
  } catch (error) {
    console.error("Failed to send lead notification to Telegram", error);
    return { ok: false };
  }
}
```

- [ ] **Step 6: Create `src/lib/consultation/telegram.test.ts`**

```ts
import { afterEach, describe, expect, it, vi } from "vitest";
import { sendLeadNotification } from "./telegram";

describe("sendLeadNotification", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("returns ok: true when the Telegram API responds successfully", async () => {
    vi.stubEnv("TELEGRAM_BOT_TOKEN", "test-token");
    vi.stubEnv("TELEGRAM_LEADS_CHAT_ID", "12345");
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);

    const result = await sendLeadNotification({ name: "Akbarali", phone: "+998901234567" });

    expect(result).toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.telegram.org/bottest-token/sendMessage",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("returns ok: false without throwing when the Telegram API errors", async () => {
    vi.stubEnv("TELEGRAM_BOT_TOKEN", "test-token");
    vi.stubEnv("TELEGRAM_LEADS_CHAT_ID", "12345");
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));

    const result = await sendLeadNotification({ name: "Akbarali", phone: "+998901234567" });

    expect(result).toEqual({ ok: false });
  });

  it("returns ok: false when env vars are missing", async () => {
    vi.stubEnv("TELEGRAM_BOT_TOKEN", "");
    vi.stubEnv("TELEGRAM_LEADS_CHAT_ID", "");

    const result = await sendLeadNotification({ name: "Akbarali", phone: "+998901234567" });

    expect(result).toEqual({ ok: false });
  });
});
```

- [ ] **Step 7: Create `src/lib/consultation/actions.ts`**

```ts
"use server";

import { headers } from "next/headers";
import { parseConsultationInput } from "./schema";
import { checkRateLimit } from "./rate-limit";
import { sendLeadNotification } from "./telegram";

export type ConsultationState = {
  status: "idle" | "success" | "error";
  message?: "validation" | "invalidPhone" | "rateLimit";
  // Echoed back on error so the form can re-populate its (uncontrolled) inputs
  // — React 19 resets them once the action resolves, which would otherwise
  // force the visitor to retype everything after a validation failure.
  values?: { name: string; phone: string };
  // Bumped on every error so the form can re-key (and therefore remount with
  // fresh `defaultValue`s) even when the visitor resubmits identical input.
  attempt?: number;
};

export async function submitConsultationAction(
  prevState: ConsultationState,
  formData: FormData,
): Promise<ConsultationState> {
  const attempt = (prevState.attempt ?? 0) + 1;
  const rawName = formData.get("name");
  const rawPhone = formData.get("phone");
  const values = {
    name: typeof rawName === "string" ? rawName : "",
    phone: typeof rawPhone === "string" ? rawPhone : "",
  };

  const parsed = parseConsultationInput({ name: rawName, phone: rawPhone });

  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.field === "phone" ? "invalidPhone" : "validation",
      values,
      attempt,
    };
  }

  const headerList = await headers();
  // Prefer `x-real-ip`: it is set by the trusted edge/proxy layer, whereas the
  // leftmost `x-forwarded-for` entry is client-supplied and therefore trivially
  // spoofable. MVP-level mitigation only — Vercel's actual trusted-IP header
  // conventions should be revisited before real launch.
  const ip = headerList.get("x-real-ip") ?? headerList.get("x-forwarded-for") ?? "unknown";

  if (!checkRateLimit(ip)) {
    return { status: "error", message: "rateLimit", values, attempt };
  }

  // Telegram failures are logged inside sendLeadNotification and never
  // surfaced to the visitor — a lost notification should not look like a
  // broken form.
  await sendLeadNotification(parsed.data);

  return { status: "success" };
}
```

- [ ] **Step 8: Run the restored unit tests**

Run: `npm test -- src/lib/consultation`
Expected: 3 test files, 15 tests total, all PASS.

- [ ] **Step 9: Commit**

```bash
git add src/lib/consultation
git commit -m "feat: restore consultation lead-form backend (schema, rate-limit, telegram, action)"
```

---

## Task 2: Restore `LeadForm` component and its i18n keys

**Files:**
- Create: `src/components/marketing/lead-form.tsx`
- Modify: `messages/en.json`
- Modify: `messages/ru.json`
- Modify: `messages/uz.json`

**Interfaces:**
- Consumes: `submitConsultationAction`, `ConsultationState` from Task 1's `src/lib/consultation/actions.ts`.
- Produces: `LeadForm({ title, subtitle, submitLabel }: { title?: string; subtitle?: string; submitLabel?: string })` — a client component rendering a `<section id="lead-form">`. Consumed by Task 3's homepage.

- [ ] **Step 1: Create `src/components/marketing/lead-form.tsx`**

```tsx
"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { submitConsultationAction, type ConsultationState } from "@/lib/consultation/actions";

const initialState: ConsultationState = { status: "idle" };

export function LeadForm({
  title,
  subtitle,
  submitLabel,
}: {
  title?: string;
  subtitle?: string;
  submitLabel?: string;
}) {
  const t = useTranslations("leadForm");
  const [state, formAction, isPending] = useActionState(submitConsultationAction, initialState);

  return (
    <section id="lead-form" className="mx-auto max-w-lg px-6 py-20">
      <div className="rounded-2xl border border-brand/20 bg-gradient-to-b from-brand/10 to-transparent p-8 sm:p-10">
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight">{title ?? t("title")}</h2>
          <p className="mt-4 text-muted-foreground">{subtitle ?? t("subtitle")}</p>
        </div>

        {state.status === "success" ? (
          <p
            role="alert"
            className="mt-8 rounded-lg border border-green-600/40 bg-green-600/10 p-4 text-center text-green-700 dark:text-green-400"
          >
            {t("success")}
          </p>
        ) : (
          <form
            action={formAction}
            // React only applies `defaultValue` on mount, and React 19 resets an
            // uncontrolled form once its action settles. Keying on a server-
            // incremented attempt counter (rather than the echoed values
            // themselves) forces a remount on every submit, including an
            // identical resubmit that wouldn't change a value-derived key — so
            // the user's typing (echoed back via defaultValue) survives a
            // server-side validation error instead of being wiped.
            key={state.attempt ?? 0}
            className="mt-8 space-y-4"
          >
            <div>
              <Label htmlFor="name">{t("name")}</Label>
              <Input
                id="name"
                name="name"
                required
                minLength={2}
                maxLength={100}
                defaultValue={state.values?.name}
              />
            </div>
            <div>
              <Label htmlFor="phone">{t("phone")}</Label>
              <Input
                id="phone"
                name="phone"
                type="tel"
                pattern="\+998[0-9]{9}"
                placeholder="+998901234567"
                required
                defaultValue={state.values?.phone}
              />
            </div>
            {state.status === "error" && (
              <p role="alert" className="text-sm text-red-600 dark:text-red-400">
                {state.message === "rateLimit"
                  ? t("errorRateLimit")
                  : state.message === "invalidPhone"
                    ? t("errorPhone")
                    : t("errorValidation")}
              </p>
            )}
            <Button
              type="submit"
              disabled={isPending}
              className="w-full bg-brand text-brand-foreground hover:opacity-90"
            >
              {isPending ? t("submitPending") : (submitLabel ?? t("submit"))}
            </Button>
            <p className="text-center text-xs text-muted-foreground">{t("freeNote")}</p>
            <p className="text-center text-xs text-muted-foreground">
              {t("alreadyAccount")}{" "}
              <Link href="/sign-in" className="font-medium text-brand hover:underline">
                {t("alreadyAccountCta")}
              </Link>
            </p>
          </form>
        )}
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Add the `leadForm` i18n block to `messages/en.json`**

In `messages/en.json`, the `partners` object currently ends at line 181-182 like this:

```json
      ]
    }
  },
  "notFound": {
```

Change it to insert a new top-level `leadForm` key between `partners` and `notFound`:

```json
      ]
    }
  },
  "leadForm": {
    "title": "We'll show you how AI can get to work",
    "subtitle": "We'll review your channels, scenarios, and integrations and show what can be handed off to AI in the very first launch.",
    "name": "Name",
    "phone": "Phone number",
    "submit": "Get Consultation",
    "submitPending": "Sending...",
    "freeNote": "Free",
    "alreadyAccount": "Already have an account?",
    "alreadyAccountCta": "Log in",
    "success": "Thank you! We'll get in touch with you shortly.",
    "errorValidation": "Please check your details and try again.",
    "errorRateLimit": "Too many attempts. Please wait a moment and try again.",
    "errorPhone": "Phone number must be in the format +998XXXXXXXXX."
  },
  "notFound": {
```

- [ ] **Step 3: Add the `leadForm` i18n block to `messages/ru.json`**

Same insertion point (`partners` block ends, `notFound` begins):

```json
      ]
    }
  },
  "leadForm": {
    "title": "Покажем, как запустить AI в работу",
    "subtitle": "Рассмотрим ваши каналы, сценарии и интеграции и покажем, что можно передать AI уже при первом запуске.",
    "name": "Имя",
    "phone": "Номер телефона",
    "submit": "Получить консультацию",
    "submitPending": "Отправка...",
    "freeNote": "Бесплатно",
    "alreadyAccount": "Уже есть аккаунт?",
    "alreadyAccountCta": "Войти",
    "success": "Спасибо! Мы свяжемся с вами в ближайшее время.",
    "errorValidation": "Пожалуйста, проверьте введённые данные.",
    "errorRateLimit": "Слишком много попыток. Подождите немного и попробуйте снова.",
    "errorPhone": "Номер телефона должен быть в формате +998XXXXXXXXX."
  },
  "notFound": {
```

- [ ] **Step 4: Add the `leadForm` i18n block to `messages/uz.json`**

Same insertion point:

```json
      ]
    }
  },
  "leadForm": {
    "title": "AI qanday ishga tushirilishini ko'rsatamiz",
    "subtitle": "Kanallaringiz, ssenariylaringiz va integratsiyalaringizni ko'rib chiqamiz va birinchi ishga tushirishdayoq nimani AI'ga topshirish mumkinligini ko'rsatamiz.",
    "name": "Ism",
    "phone": "Telefon raqami",
    "submit": "Konsultatsiya olish",
    "submitPending": "Yuborilmoqda...",
    "freeNote": "Bepul",
    "alreadyAccount": "Hisobingiz bormi?",
    "alreadyAccountCta": "Kirish",
    "success": "Rahmat! Tez orada siz bilan bog'lanamiz.",
    "errorValidation": "Iltimos, ma'lumotlarni to'g'ri kiriting.",
    "errorRateLimit": "Juda ko'p urinish. Biroz kuting va qayta urinib ko'ring.",
    "errorPhone": "Telefon raqami +998XXXXXXXXX formatida bo'lishi kerak."
  },
  "notFound": {
```

- [ ] **Step 5: Validate all three JSON files parse**

Run: `node -e "['en','ru','uz'].forEach(l => JSON.parse(require('fs').readFileSync('messages/'+l+'.json','utf8')) && console.log(l+' OK'))"`
Expected: `en OK`, `ru OK`, `uz OK` — no `SyntaxError`.

- [ ] **Step 6: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors (this catches a missing/renamed i18n key used by `LeadForm` if next-intl's typed messages are wired up, and any TS error in the new component).

- [ ] **Step 7: Commit**

```bash
git add src/components/marketing/lead-form.tsx messages/en.json messages/ru.json messages/uz.json
git commit -m "feat: restore LeadForm component and its i18n strings"
```

---

## Task 3: Restore `.env.example` Telegram entries

**Files:**
- Modify: `.env.example`

- [ ] **Step 1: Add the two Telegram lines back to the top of `.env.example`**

Current content:

```
DATABASE_URL=
CLERK_SECRET_KEY=
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
BLOB_READ_WRITE_TOKEN=
```

New content:

```
TELEGRAM_BOT_TOKEN=
TELEGRAM_LEADS_CHAT_ID=
DATABASE_URL=
CLERK_SECRET_KEY=
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
BLOB_READ_WRITE_TOKEN=
```

- [ ] **Step 2: Commit**

```bash
git add .env.example
git commit -m "docs: list TELEGRAM_BOT_TOKEN/TELEGRAM_LEADS_CHAT_ID in .env.example again"
```

---

## Task 4: Repoint Hero and PricingTable CTAs to `/#lead-form`

**Files:**
- Modify: `src/components/marketing/hero.tsx:25`
- Modify: `src/components/marketing/pricing-table.tsx:69`
- Modify: `messages/en.json` (`hero.ctaPrimary`, line 20)
- Modify: `messages/ru.json` (`hero.ctaPrimary`)
- Modify: `messages/uz.json` (`hero.ctaPrimary`)

**Interfaces:**
- Consumes: the `#lead-form` anchor produced by Task 2's `LeadForm` (only meaningful once Task 5 actually renders `LeadForm` on the homepage — but the `href` change is safe to land now since `/#lead-form` degrades to a normal same-page anchor no-op until then).

- [ ] **Step 1: Change the Hero primary button's `href` in `src/components/marketing/hero.tsx`**

Change:

```tsx
            render={<Link href="/sign-up">{t("ctaPrimary")}</Link>}
```

To:

```tsx
            render={<Link href="/#lead-form">{t("ctaPrimary")}</Link>}
```

- [ ] **Step 2: Change the pricing tier button's `href` in `src/components/marketing/pricing-table.tsx`**

Change:

```tsx
                  render={<Link href="/sign-up">{t("cta")}</Link>}
```

To:

```tsx
                  render={<Link href="/#lead-form">{t("cta")}</Link>}
```

- [ ] **Step 3: Revert `hero.ctaPrimary` text in `messages/en.json`**

Change:

```json
    "ctaPrimary": "Start for free",
```

To:

```json
    "ctaPrimary": "Get Consultation",
```

- [ ] **Step 4: Revert `hero.ctaPrimary` text in `messages/ru.json`**

Change:

```json
    "ctaPrimary": "Начать бесплатно",
```

To:

```json
    "ctaPrimary": "Получить консультацию",
```

- [ ] **Step 5: Revert `hero.ctaPrimary` text in `messages/uz.json`**

Change:

```json
    "ctaPrimary": "Bepul boshlash",
```

To:

```json
    "ctaPrimary": "Konsultatsiya olish",
```

Do **not** touch `nav.cta` in any of the three files — it keeps "Start for free" / "Начать бесплатно" / "Bepul boshlash" and its `/sign-up` target in `header.tsx`.

- [ ] **Step 6: Commit**

```bash
git add src/components/marketing/hero.tsx src/components/marketing/pricing-table.tsx messages/en.json messages/ru.json messages/uz.json
git commit -m "feat: point Hero and pricing CTAs back to the consultation form"
```

---

## Task 5: Wire the homepage to render Pricing and LeadForm

**Files:**
- Modify: `src/app/[locale]/page.tsx`

**Interfaces:**
- Consumes: `Hero` (existing), `WorkZonesSection` (existing), `PricingTable` from `@/components/marketing/pricing-table` (existing, already used by `/pricing`), `LeadForm` from Task 2.

- [ ] **Step 1: Rewrite `src/app/[locale]/page.tsx`**

```tsx
import { useTranslations } from "next-intl";
import { Hero } from "@/components/marketing/hero";
import { WorkZonesSection } from "@/components/marketing/work-zones-section";
import { PricingTable } from "@/components/marketing/pricing-table";
import { LeadForm } from "@/components/marketing/lead-form";

export default function HomePage() {
  const t = useTranslations("pricing");

  return (
    <>
      <Hero />
      <WorkZonesSection />
      <section className="mx-auto max-w-6xl px-6 py-20">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight">{t("title")}</h2>
          <p className="mt-4 text-muted-foreground">{t("subtitle")}</p>
        </div>
        <div className="mt-12">
          <PricingTable />
        </div>
      </section>
      <LeadForm />
    </>
  );
}
```

Note: `HomePage` was previously a plain function component with no hooks. Adding `useTranslations` requires this file to run on the client for that hook call — but `next-intl`'s `useTranslations` works in Server Components too (it's the same App Router pattern already used by `src/app/[locale]/pricing/page.tsx`, which is not marked `"use client"`). No directive needed; follow that existing file's pattern exactly.

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Build**

Run: `npm run build`
Expected: build succeeds; `/[locale]` route still lists in the route table (dynamic, same as before).

- [ ] **Step 4: Commit**

```bash
git add "src/app/[locale]/page.tsx"
git commit -m "feat: embed pricing table and lead-form on the homepage"
```

---

## Task 6: Restore the e2e smoke test for the lead form

**Files:**
- Modify: `tests/e2e/marketing.spec.ts`

**Interfaces:**
- Consumes: the rendered homepage from Task 5 (button text "Konsultatsiya olish", `#lead-form` anchor, `Ism`/`Telefon raqami` labels from Task 2's `leadForm` i18n block).

- [ ] **Step 1: Re-add the lead-form e2e test**

In `tests/e2e/marketing.spec.ts`, after the `"unknown legal document returns a localized 404 page"` test and before the `"mobile menu exposes the pricing and partners links"` test, add:

```ts
test("home page CTA scrolls to the lead form and it is fillable", async ({ page }) => {
  await page.goto("/uz");
  await page.getByRole("button", { name: "Konsultatsiya olish" }).first().click();
  await expect(page.locator("#lead-form")).toBeInViewport();
  await page.getByLabel("Ism").fill("Test Foydalanuvchi");
  await page.getByLabel("Telefon raqami").fill("+998901234567");
});
```

- [ ] **Step 2: Run the e2e test**

Run: `npm run test:e2e -- -g "scrolls to the lead form"`
Expected: PASS. (This requires a dev server; if the script doesn't auto-start one, run `npm run dev` in another terminal first, matching how the rest of the e2e suite is normally exercised in this repo.)

- [ ] **Step 3: Commit**

```bash
git add tests/e2e/marketing.spec.ts
git commit -m "test(e2e): restore lead-form smoke test on the homepage"
```

---

## Task 7: Full regression pass

**Files:** none (verification only)

- [ ] **Step 1: Run the full unit test suite**

Run: `npm test`
Expected: all test files pass, including the 3 restored in Task 1.

- [ ] **Step 2: Run the full production build**

Run: `npm run build`
Expected: succeeds, no type or lint errors.

- [ ] **Step 3: Manually verify all three locales render the new homepage sections in order**

Run: `npm run dev`, then in a browser visit `/uz`, `/ru`, `/en` and confirm each shows, top to bottom: Hero → "How it works" 4-card grid → Pricing table (with monthly/annual toggle) → the consultation form → Footer. Confirm the Hero's primary button and each pricing tier's button scroll to the form, and the header's own CTA still goes to `/sign-up`.

- [ ] **Step 4: No commit needed** — this task is verification-only; if any check fails, fix the offending task and re-run from Step 1.
