# TayanchAI Foundation + Marketing Site Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up the Next.js foundation and a complete, trilingual marketing site for TayanchAI (landing, pricing, partners, legal pages, lead-capture form) — no auth, no database, no AI functionality yet.

**Architecture:** Single Next.js 16 App Router project, TypeScript, Tailwind CSS v4, shadcn/ui primitives. Locale-prefixed routes (`/uz`, `/ru`, `/en`) via next-intl, `uz` as default. The only server-side mutation (the consultation lead form) is a React Server Action that validates input, rate-limits by IP, and forwards the lead to a Telegram chat — no database in this phase.

**Tech Stack:** Next.js 16 (App Router, `src/` dir, Turbopack), TypeScript, Tailwind CSS v4, shadcn/ui, next-intl, next-themes, Zod, Vitest (unit), Playwright (e2e smoke).

## Global Constraints

- All user-facing text ships in 3 locales: `uz` (default), `ru`, `en` — verbatim strings are defined in Task 4, later tasks must not hardcode UI text.
- Prices are shown primarily in UZS, with an approximate USD amount as secondary text (never the reverse).
- No database and no `/api/*` route handlers in this phase — the one mutation (lead form) is a Server Action per Next.js best practice (mutations from UI → Server Actions, not Route Handlers).
- TypeScript strict mode and ESLint must pass with zero errors before any commit.
- Middleware uses the Next.js 16 proxy convention, not the legacy `middleware.ts` — **as actually implemented: `src/proxy.ts` (not repo-root `proxy.ts`) exporting `proxy()` and `export const config` (not `proxyConfig`).** Verified via a live, fresh-cache A/B test (`rm -rf .next` both ways) in this project's Next 16.3.0 + Turbopack + `src/` layout: repo-root placement reproducibly 404s with an empty middleware manifest; `src/proxy.ts` reproducibly works. The `config` (not `proxyConfig`) export name is hardcoded in Next's static analysis (`node_modules/next/dist/build/analysis/get-page-static-info.js`). See Task 4's ledger entries for the full investigation.
- Legal page content is explicitly marked as an unapproved draft (see Task 10) — never presented as a final legal document.
- If a Telegram notification fails, the user must still see success in the UI (failure is logged server-side only, never surfaced to the visitor).

### Settled deviations from this plan's literal code samples

Two more places below still show code that was superseded during implementation — left as-is in the task bodies since editing every occurrence would be extensive, but recorded here so a future reader doesn't have to re-derive them:

- **`<Button asChild>` (Tasks 6, 7, 9) does not work.** Task 2's actual shadcn CLI output uses `@base-ui/react` primitives, not Radix — `Button` has no `asChild` prop. Everywhere the code samples below show `<Button asChild><Link href="...">...</Link></Button>`, the shipped code instead uses `<Button render={<Link href="...">...</Link>} nativeButton={false}>` (confirmed against Base UI's own docs/types in Task 6's review). See `src/components/marketing/header.tsx` for the canonical example.
- **`Intl.NumberFormat("uz-UZ")` (Task 8) causes a real hydration mismatch.** Node's ICU and Chromium's ICU disagree on `uz-UZ` digit grouping, so this literal code produces a different string server-side vs. client-side. The shipped `formatUZS` in `src/lib/pricing-data.ts` instead formats with `"en-US"` grouping and replaces commas with spaces, which is stable across engines. Also note: the shipped version takes a `currency` parameter (a later fix localized the hardcoded `" so'm"` suffix) rather than the single-argument signature shown below.

---

### Task 1: Scaffold the Next.js project

**Files:**
- Create: entire project scaffold (`package.json`, `tsconfig.json`, `next.config.ts`, `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/globals.css`, `.eslintrc`/`eslint.config.mjs`, `.gitignore`)

**Interfaces:**
- Produces: a runnable Next.js dev server on `http://localhost:3000`, `npm run dev` / `npm run build` / `npm run lint` scripts.

- [ ] **Step 1: Run create-next-app in the project root**

```bash
cd "/home/akbarali-sheronov/My projects/Worken Uz"
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --turbopack --use-npm --yes
```

- [ ] **Step 2: Verify the dev server boots**

Run: `npm run dev` (in background or a separate terminal), then `curl -s -o /dev/null -w "%{http_code}" http://localhost:3000`
Expected: `200`. Stop the dev server after confirming.

- [ ] **Step 3: Verify lint and typecheck pass on the fresh scaffold**

Run: `npm run lint && npx tsc --noEmit`
Expected: both exit with code 0, no errors.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore: scaffold Next.js 16 project with TypeScript and Tailwind"
```

---

### Task 2: Install and configure shadcn/ui

**Files:**
- Create: `components.json`, `src/lib/utils.ts`, `src/components/ui/button.tsx`, `src/components/ui/input.tsx`, `src/components/ui/card.tsx`, `src/components/ui/tabs.tsx`, `src/components/ui/badge.tsx`, `src/components/ui/label.tsx`

**Interfaces:**
- Produces: `Button`, `Input`, `Card`/`CardHeader`/`CardTitle`/`CardDescription`/`CardContent`, `Tabs`/`TabsList`/`TabsTrigger`/`TabsContent`, `Badge`, `Label` — all imported later from `@/components/ui/*`.

- [ ] **Step 1: Initialize shadcn/ui**

```bash
npx shadcn@latest init --yes --base-color neutral
```

- [ ] **Step 2: Add the primitives this project needs**

```bash
npx shadcn@latest add button input card tabs badge label --yes
```

- [ ] **Step 3: Verify the build still compiles**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore: install shadcn/ui primitives"
```

---

### Task 3: Brand theme tokens and font

**Files:**
- Modify: `src/app/globals.css`
- Modify: `src/app/layout.tsx` (font wiring)

**Interfaces:**
- Produces: CSS variables `--brand`, `--brand-foreground`, `--background`, `--foreground` (light + dark) usable via Tailwind's `bg-brand`, `text-brand` utility classes (mapped through `@theme` in Tailwind v4).

**Design direction:** TayanchAI uses a deep charcoal/near-black background with a teal-emerald brand accent (`#14b8a6` light-mode buttons/links, `#2dd4bf` dark-mode) — deliberately distinct from worken.ru's amber-on-black palette. Font: Geist Sans (already bundled with `create-next-app`), no extra font install needed.

- [ ] **Step 1: Add brand CSS variables to `globals.css`**

Open `src/app/globals.css`. Inside the existing `:root { ... }` block (light mode) add:

```css
--brand: oklch(0.6 0.11 175);
--brand-foreground: oklch(0.98 0 0);
```

Inside the existing `.dark { ... }` block (dark mode) add:

```css
--brand: oklch(0.72 0.13 175);
--brand-foreground: oklch(0.15 0 0);
```

In the `@theme inline { ... }` block (registers CSS vars as Tailwind tokens) add:

```css
--color-brand: var(--brand);
--color-brand-foreground: var(--brand-foreground);
```

- [ ] **Step 2: Verify Tailwind picks up the token**

Temporarily add `className="bg-brand text-brand-foreground p-4"` to the root `<h1>` in `src/app/page.tsx`, run `npm run dev`, open `http://localhost:3000`, confirm the element renders with a teal background. Then revert this temporary edit (Task 7 will build the real homepage).

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: add TayanchAI brand color tokens"
```

---

### Task 4: next-intl setup (routing, messages, proxy)

**Files:**
- Create: `src/i18n/routing.ts`, `src/i18n/navigation.ts`, `src/i18n/request.ts`
- Create: `proxy.ts` (project root)
- Create: `messages/uz.json`, `messages/ru.json`, `messages/en.json`
- Modify: `next.config.ts`

**Interfaces:**
- Produces: `routing` (locales `['uz','ru','en']`, `defaultLocale: 'uz'`), `{Link, useRouter, usePathname, redirect}` from `@/i18n/navigation`, message keys consumed by every later component via `useTranslations()` / `getTranslations()`.

- [ ] **Step 1: Install next-intl**

```bash
npm install next-intl
```

- [ ] **Step 2: Create the routing config**

Create `src/i18n/routing.ts`:

```ts
import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["uz", "ru", "en"],
  defaultLocale: "uz",
  localePrefix: "always",
});
```

- [ ] **Step 3: Create the typed navigation helpers**

Create `src/i18n/navigation.ts`:

```ts
import { createNavigation } from "next-intl/navigation";
import { routing } from "./routing";

export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing);
```

- [ ] **Step 4: Create the request config**

Create `src/i18n/request.ts`:

```ts
import { getRequestConfig } from "next-intl/server";
import { hasLocale } from "next-intl";
import { routing } from "./routing";

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested)
    ? requested
    : routing.defaultLocale;

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
```

- [ ] **Step 5: Wrap `next.config.ts` with the next-intl plugin**

```ts
import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {};

export default withNextIntl(nextConfig);
```

- [ ] **Step 6: Create the root proxy (Next.js 16 middleware convention)**

Create `proxy.ts` at the project root:

```ts
import createMiddleware from "next-intl/middleware";
import type { NextRequest } from "next/server";
import { routing } from "./src/i18n/routing";

const handleI18nRouting = createMiddleware(routing);

export function proxy(request: NextRequest) {
  return handleI18nRouting(request);
}

export const proxyConfig = {
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
```

- [ ] **Step 7: Write the message files**

Create `messages/uz.json`:

```json
{
  "nav": {
    "pricing": "Narxlash",
    "partners": "Hamkorlik dasturi",
    "login": "Kirish",
    "cta": "Konsultatsiya olish"
  },
  "hero": {
    "badge": "AI XODIMLAR",
    "title": "Biznesingiz uchun AI xodimni ishga oling",
    "subtitle": "TayanchAI yordamida sotuv, qo'llab-quvvatlash, HR va marketing bo'limlariga jamoa a'zosi sifatida AI qo'shing. U kompaniyangiz tizimlariga ulanadi, tarixiy ma'lumotlardan o'rganadi va mustaqil ishlaydi.",
    "ctaPrimary": "Konsultatsiya olish",
    "ctaSecondary": "Narxlarni ko'rish"
  },
  "workZones": {
    "title": "AI xodim biznesda qanday ishlaydi",
    "subtitle": "AI'ni jamoa roliga ishga olasiz, uni kanallar, ma'lumotlar va tizimlarga ulaysiz — u kompaniya tarixidan o'rganadi.",
    "sales": {
      "title": "Sotuv va mijozlarga xizmat",
      "description": "Lidlarni malakalashtiradi, savollarga javob beradi, uchrashuv belgilaydi va CRM'ga qo'lda ishlarsiz yozadi."
    },
    "hr": {
      "title": "HR va recruiting",
      "description": "Arizalarni qayta ishlaydi, nomzodlarga javob beradi, birlamchi skrining o'tkazadi va suhbatlarni rejalashtiradi."
    },
    "marketing": {
      "title": "Marketing va kontent",
      "description": "Brif va kampaniya lidlarini yig'adi, xabar matnlariga yordam beradi, so'rovlarni segmentlaydi."
    },
    "systems": {
      "title": "Tizimlar, bilim va harakatlar",
      "description": "CRM, kalendar va bilim bazasi orqali ishlaydi — shunchaki javob bermaydi, ishni bajaradi."
    }
  },
  "pricing": {
    "title": "Narxlash",
    "subtitle": "Jamoangiz o'lchamiga mos tarifni tanlang",
    "monthly": "Oylik",
    "annual": "Yillik",
    "annualBadge": "33% tejash",
    "perMonth": "/oy",
    "perYear": "/yil",
    "cta": "Tanlash",
    "tiers": {
      "freemium": {
        "name": "FREEMIUM",
        "description": "Mustaqil foydalanuvchilar va AI bilan yangi tanishayotganlar uchun",
        "employees": "1 AI xodim",
        "feature2": "Test qilish uchun ideal",
        "price": "Bepul",
        "priceNote": "Vaqt chegarasisiz"
      },
      "businessS": {
        "name": "Business S",
        "description": "Tadbirkorlar va kichik jamoalar uchun",
        "employees": "5 AI xodim",
        "feature2": "10% token chegirmasi"
      },
      "businessM": {
        "name": "Business M",
        "description": "AI'ni kundalik ishga joriy qilayotgan o'sayotgan jamoalar uchun",
        "employees": "20 AI xodim",
        "feature2": "25% token chegirmasi",
        "popular": "Eng mashhur"
      },
      "businessL": {
        "name": "Business L",
        "description": "Biznes-jarayonlarga AI'ni integratsiya qilayotgan yirik bizneslar uchun",
        "employees": "75 AI xodim",
        "feature2": "50% token chegirmasi"
      },
      "enterprise": {
        "name": "Enterprise",
        "description": "Biznes-jarayonlarga AI'ni joriy qilayotgan korporatsiyalar uchun",
        "employees": "200 AI xodim",
        "feature2": "Enterprise use case'lar",
        "price": "So'rov bo'yicha",
        "priceNote": "Individual shartlar"
      }
    }
  },
  "partners": {
    "badge": "TAYANCHAI HAMKORLIK DASTURI",
    "title": "AI xodimlarni joriy qilib daromad oling",
    "subtitle": "Mijozlarga AI xodim yollashda yordam bering va har bir joriy etishdan daromad oling.",
    "cta": "Ariza qoldirish",
    "stats": {
      "discount": { "value": "50%gacha", "label": "Har bir mijoz obunasidan chegirma" },
      "referral": { "value": "10%gacha", "label": "Hisobni to'ldirishdan referal to'lovlar" },
      "launch": { "value": "5 kun", "label": "Birinchi qo'ng'iroqdan obuna to'lovigacha" },
      "levels": { "value": "3", "label": "Hamkorlik ishtirok darajasi" }
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
    "success": "Rahmat! Tez orada siz bilan bog'lanamiz.",
    "errorValidation": "Iltimos, ma'lumotlarni to'g'ri kiriting.",
    "errorRateLimit": "Juda ko'p urinish. Biroz kuting va qayta urinib ko'ring.",
    "errorPhone": "Telefon raqami +998XXXXXXXXX formatida bo'lishi kerak."
  },
  "footer": {
    "tagline": "Sotuv, xizmat va murojaatlarni qayta ishlash uchun AI agentlar.",
    "legalTitle": "Hujjatlar",
    "copyright": "TayanchAI · barcha huquqlar himoyalangan"
  },
  "legal": {
    "disclaimer": "Ushbu hujjat loyihaning dastlabki qoralamasi bo'lib, yuridik maslahatchi tomonidan ko'rib chiqilishi va tasdiqlanishi lozim. Rasmiy ishga tushirishdan oldin almashtirilishi shart.",
    "offer": { "title": "Ommaviy oferta" },
    "privacy": { "title": "Maxfiylik siyosati" },
    "terms": { "title": "Foydalanuvchi shartnomasi" },
    "cookies": { "title": "Cookie siyosati" },
    "consent": { "title": "Shaxsiy ma'lumotlarni qayta ishlashga rozilik" }
  }
}
```

Create `messages/ru.json`:

```json
{
  "nav": {
    "pricing": "Тарифы",
    "partners": "Партнёрская программа",
    "login": "Войти",
    "cta": "Получить консультацию"
  },
  "hero": {
    "badge": "AI-СОТРУДНИКИ",
    "title": "Наймите AI-сотрудника для своего бизнеса",
    "subtitle": "С TayanchAI бизнес может нанять AI в отдел продаж, поддержки, HR и маркетинга как полноценного члена команды. AI подключается к вашим системам и учится на истории компании.",
    "ctaPrimary": "Получить консультацию",
    "ctaSecondary": "Смотреть тарифы"
  },
  "workZones": {
    "title": "Как AI-сотрудник работает в бизнесе",
    "subtitle": "Вы нанимаете AI на роль в команде, подключаете его к каналам, данным и системам — он учится на истории компании.",
    "sales": {
      "title": "Продажи и обслуживание клиентов",
      "description": "Квалифицирует лиды, отвечает на вопросы, назначает встречи и записывает всё в CRM без ручной работы."
    },
    "hr": {
      "title": "HR и рекрутинг",
      "description": "Обрабатывает заявки, отвечает кандидатам, проводит первичный скрининг и планирует собеседования."
    },
    "marketing": {
      "title": "Маркетинг и контент",
      "description": "Собирает брифы и лиды кампаний, помогает с текстами, сегментирует запросы."
    },
    "systems": {
      "title": "Системы, знания и действия",
      "description": "Работает через CRM, календарь и базу знаний — не просто отвечает, а выполняет работу."
    }
  },
  "pricing": {
    "title": "Тарифы",
    "subtitle": "Выберите тариф под размер вашей команды",
    "monthly": "Помесячно",
    "annual": "Ежегодно",
    "annualBadge": "Экономия 33%",
    "perMonth": "/мес",
    "perYear": "/год",
    "cta": "Выбрать",
    "tiers": {
      "freemium": {
        "name": "FREEMIUM",
        "description": "Для независимых пользователей и новичков в AI",
        "employees": "1 AI-сотрудник",
        "feature2": "Идеально для тестирования",
        "price": "Бесплатно",
        "priceNote": "Без ограничений по времени"
      },
      "businessS": {
        "name": "Business S",
        "description": "Для предпринимателей и небольших команд",
        "employees": "5 AI-сотрудников",
        "feature2": "Скидка на токены 10%"
      },
      "businessM": {
        "name": "Business M",
        "description": "Для растущих команд, внедряющих AI в рутину",
        "employees": "20 AI-сотрудников",
        "feature2": "Скидка на токены 25%",
        "popular": "Популярный"
      },
      "businessL": {
        "name": "Business L",
        "description": "Для крупного бизнеса, интегрирующего AI в процессы",
        "employees": "75 AI-сотрудников",
        "feature2": "Скидка на токены 50%"
      },
      "enterprise": {
        "name": "Enterprise",
        "description": "Для корпораций, внедряющих AI в бизнес-процессы",
        "employees": "200 AI-сотрудников",
        "feature2": "Enterprise-сценарии",
        "price": "По запросу",
        "priceNote": "Индивидуальные условия"
      }
    }
  },
  "partners": {
    "badge": "ПАРТНЁРСКАЯ ПРОГРАММА TAYANCHAI",
    "title": "Зарабатывайте на внедрении AI-сотрудников",
    "subtitle": "Помогайте клиентам нанимать AI-сотрудников и получайте доход с каждого внедрения.",
    "cta": "Оставить заявку",
    "stats": {
      "discount": { "value": "до 50%", "label": "скидка с подписки каждого клиента" },
      "referral": { "value": "до 10%", "label": "реферальные выплаты с пополнений" },
      "launch": { "value": "5 дней", "label": "от первого звонка до оплаты подписки" },
      "levels": { "value": "3", "label": "уровня партнёрского участия" }
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
    "success": "Спасибо! Мы свяжемся с вами в ближайшее время.",
    "errorValidation": "Пожалуйста, проверьте введённые данные.",
    "errorRateLimit": "Слишком много попыток. Подождите немного и попробуйте снова.",
    "errorPhone": "Номер телефона должен быть в формате +998XXXXXXXXX."
  },
  "footer": {
    "tagline": "AI-агенты для продаж, сервиса и обработки обращений.",
    "legalTitle": "Документы",
    "copyright": "TayanchAI · все права защищены"
  },
  "legal": {
    "disclaimer": "Этот документ является предварительным черновиком проекта и должен быть проверен и утверждён юридическим консультантом. Перед официальным запуском обязательно подлежит замене.",
    "offer": { "title": "Публичная оферта" },
    "privacy": { "title": "Политика конфиденциальности" },
    "terms": { "title": "Пользовательское соглашение" },
    "cookies": { "title": "Политика использования cookie" },
    "consent": { "title": "Согласие на обработку персональных данных" }
  }
}
```

Create `messages/en.json`:

```json
{
  "nav": {
    "pricing": "Pricing",
    "partners": "Partner Program",
    "login": "Log In",
    "cta": "Get Consultation"
  },
  "hero": {
    "badge": "AI EMPLOYEES",
    "title": "Hire an AI employee for your business",
    "subtitle": "With TayanchAI, a business can hire AI into sales, support, HR, and marketing as a full team member. It connects to your systems and learns from company history.",
    "ctaPrimary": "Get Consultation",
    "ctaSecondary": "See Pricing"
  },
  "workZones": {
    "title": "How an AI employee works in business",
    "subtitle": "You hire AI into a team role, connect it to channels, data, and systems — it learns from company history.",
    "sales": {
      "title": "Sales and customer service",
      "description": "Qualifies leads, answers questions, books meetings, and writes everything to the CRM without manual work."
    },
    "hr": {
      "title": "HR and recruiting",
      "description": "Processes applications, replies to candidates, runs first-pass screening, and schedules interviews."
    },
    "marketing": {
      "title": "Marketing and content",
      "description": "Collects briefs and campaign leads, helps with messaging, segments requests."
    },
    "systems": {
      "title": "Systems, knowledge, and actions",
      "description": "Works through CRM, calendar, and the knowledge base — it doesn't just reply, it gets work done."
    }
  },
  "pricing": {
    "title": "Pricing",
    "subtitle": "Choose the plan that fits your team size",
    "monthly": "Monthly",
    "annual": "Annual",
    "annualBadge": "33% savings",
    "perMonth": "/mo",
    "perYear": "/yr",
    "cta": "Choose",
    "tiers": {
      "freemium": {
        "name": "FREEMIUM",
        "description": "For independent users and AI beginners",
        "employees": "1 AI employee",
        "feature2": "Ideal for testing",
        "price": "Free",
        "priceNote": "No time limits"
      },
      "businessS": {
        "name": "Business S",
        "description": "For entrepreneurs and small teams",
        "employees": "5 AI employees",
        "feature2": "10% token discount"
      },
      "businessM": {
        "name": "Business M",
        "description": "For growing teams bringing AI into routine work",
        "employees": "20 AI employees",
        "feature2": "25% token discount",
        "popular": "Most Popular"
      },
      "businessL": {
        "name": "Business L",
        "description": "For ambitious businesses integrating AI into processes",
        "employees": "75 AI employees",
        "feature2": "50% token discount"
      },
      "enterprise": {
        "name": "Enterprise",
        "description": "For corporations integrating AI into business processes",
        "employees": "200 AI employees",
        "feature2": "Enterprise use cases",
        "price": "On request",
        "priceNote": "Custom terms"
      }
    }
  },
  "partners": {
    "badge": "TAYANCHAI PARTNER PROGRAM",
    "title": "Earn by rolling out AI employees",
    "subtitle": "Help clients hire AI employees and earn from every implementation.",
    "cta": "Submit request",
    "stats": {
      "discount": { "value": "up to 50%", "label": "discount on every client subscription" },
      "referral": { "value": "up to 10%", "label": "referral payouts from top-ups" },
      "launch": { "value": "5 days", "label": "from first call to subscription payment" },
      "levels": { "value": "3", "label": "levels of partner participation" }
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
    "success": "Thank you! We'll get in touch with you shortly.",
    "errorValidation": "Please check your details and try again.",
    "errorRateLimit": "Too many attempts. Please wait a moment and try again.",
    "errorPhone": "Phone number must be in the format +998XXXXXXXXX."
  },
  "footer": {
    "tagline": "AI agents for sales, service, and inbound request handling.",
    "legalTitle": "Documents",
    "copyright": "TayanchAI · all rights reserved"
  },
  "legal": {
    "disclaimer": "This document is an early project draft and must be reviewed and approved by legal counsel before official launch — it is a placeholder, not a binding agreement.",
    "offer": { "title": "Public Offer" },
    "privacy": { "title": "Privacy Policy" },
    "terms": { "title": "User Agreement" },
    "cookies": { "title": "Cookie Policy" },
    "consent": { "title": "Consent to Personal Data Processing" }
  }
}
```

- [ ] **Step 8: Move the home page under `[locale]` and verify routing**

```bash
mkdir -p "src/app/[locale]"
git mv src/app/page.tsx "src/app/[locale]/page.tsx" 2>/dev/null || mv src/app/page.tsx "src/app/[locale]/page.tsx"
```

Replace the root `src/app/layout.tsx` with a minimal passthrough (locale layout is added in Task 5):

```tsx
import type { ReactNode } from "react";

export default function RootLayout({ children }: { children: ReactNode }) {
  return children;
}
```

Create a placeholder `src/app/[locale]/layout.tsx` (Task 5 replaces this with the full header/footer shell):

```tsx
import type { ReactNode } from "react";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import { hasLocale } from "next-intl";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";

type Props = {
  children: ReactNode;
  params: Promise<{ locale: string }>;
};

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params;
  // Defensive fallback only: proxy.ts (Task 4 Step 6) already redirects any
  // unrecognized locale segment to the default locale before a request ever
  // reaches this layout, so this branch should not trigger for real traffic.
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }
  setRequestLocale(locale);
  const messages = await getMessages();

  return (
    <html lang={locale}>
      <body>
        <NextIntlClientProvider messages={messages}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}
```

Run: `npm run dev`, then `curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000` (expect `307`/`308` redirect to `/uz`) and `curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/uz` (expect `200`).

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat: add next-intl locale routing with uz/ru/en messages"
```

---

### Task 5: Dark/light theme toggle

**Files:**
- Create: `src/components/theme-provider.tsx`
- Modify: `src/app/[locale]/layout.tsx`

**Interfaces:**
- Produces: `ThemeProvider` (wraps `next-themes`' provider), consumed by `ThemeToggle` in Task 6 via `useTheme()` from `next-themes`.

- [ ] **Step 1: Install next-themes**

```bash
npm install next-themes
```

- [ ] **Step 2: Create the provider wrapper**

Create `src/components/theme-provider.tsx`:

```tsx
"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import type { ReactNode } from "react";

export function ThemeProvider({ children }: { children: ReactNode }) {
  return (
    <NextThemesProvider attribute="class" defaultTheme="dark" enableSystem>
      {children}
    </NextThemesProvider>
  );
}
```

- [ ] **Step 3: Wrap the locale layout's body content**

In `src/app/[locale]/layout.tsx`, import `ThemeProvider` from `@/components/theme-provider` and wrap the children inside `NextIntlClientProvider`:

```tsx
<html lang={locale} suppressHydrationWarning>
  <body>
    <NextIntlClientProvider messages={messages}>
      <ThemeProvider>{children}</ThemeProvider>
    </NextIntlClientProvider>
  </body>
</html>
```

(Add `suppressHydrationWarning` to `<html>` — required by next-themes since the `class` attribute is set client-side after hydration.)

- [ ] **Step 4: Verify no hydration warnings**

Run: `npm run dev`, open `http://localhost:3000/uz` in a browser, check the browser console — expect no hydration mismatch warnings.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add dark/light theme provider"
```

---

### Task 6: Header and Footer components

**Files:**
- Create: `src/components/marketing/header.tsx`, `src/components/marketing/footer.tsx`, `src/components/marketing/language-switcher.tsx`, `src/components/marketing/theme-toggle.tsx`
- Modify: `src/app/[locale]/layout.tsx`

**Interfaces:**
- Consumes: `Link`, `usePathname`, `useRouter` from `@/i18n/navigation` (Task 4); `useTheme` from `next-themes` (Task 5); `Button` from `@/components/ui/button` (Task 2).
- Produces: `<Header />`, `<Footer />` rendered in every page via the locale layout.

- [ ] **Step 1: Build the language switcher**

Create `src/components/marketing/language-switcher.tsx`:

```tsx
"use client";

import { useLocale } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";

const LABELS: Record<string, string> = { uz: "UZ", ru: "RU", en: "EN" };

export function LanguageSwitcher() {
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();

  return (
    <div className="flex items-center gap-1 rounded-full border border-border p-1 text-xs">
      {routing.locales.map((loc) => (
        <button
          key={loc}
          onClick={() => router.replace(pathname, { locale: loc })}
          className={`rounded-full px-2 py-1 transition-colors ${
            loc === locale
              ? "bg-brand text-brand-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
          aria-current={loc === locale ? "true" : undefined}
        >
          {LABELS[loc]}
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Build the theme toggle**

Create `src/components/marketing/theme-toggle.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return <Button variant="ghost" size="icon" aria-hidden />;
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      aria-label="Toggle theme"
    >
      {theme === "dark" ? "☀" : "☽"}
    </Button>
  );
}
```

- [ ] **Step 3: Build the header**

Create `src/components/marketing/header.tsx`:

```tsx
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { LanguageSwitcher } from "./language-switcher";
import { ThemeToggle } from "./theme-toggle";

export function Header() {
  const t = useTranslations("nav");

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="text-lg font-semibold">
          TayanchAI
        </Link>
        <nav className="hidden items-center gap-6 text-sm text-muted-foreground md:flex">
          <Link href="/pricing" className="hover:text-foreground">
            {t("pricing")}
          </Link>
          <Link href="/partners" className="hover:text-foreground">
            {t("partners")}
          </Link>
        </nav>
        <div className="flex items-center gap-2">
          <LanguageSwitcher />
          <ThemeToggle />
          <Button asChild size="sm" className="bg-brand text-brand-foreground hover:opacity-90">
            <Link href="/#lead-form">{t("cta")}</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
```

- [ ] **Step 4: Build the footer**

Create `src/components/marketing/footer.tsx`:

```tsx
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

const LEGAL_DOCS = ["offer", "privacy", "terms", "cookies", "consent"] as const;

export function Footer() {
  const t = useTranslations("footer");
  const tLegal = useTranslations("legal");

  return (
    <footer className="border-t border-border">
      <div className="mx-auto max-w-6xl px-6 py-10 text-sm text-muted-foreground">
        <p className="font-semibold text-foreground">TayanchAI</p>
        <p className="mt-1 max-w-md">{t("tagline")}</p>
        <div className="mt-6">
          <p className="mb-2 font-medium text-foreground">{t("legalTitle")}</p>
          <ul className="flex flex-wrap gap-x-4 gap-y-2">
            {LEGAL_DOCS.map((doc) => (
              <li key={doc}>
                <Link href={`/legal/${doc}`} className="hover:text-foreground">
                  {tLegal(`${doc}.title`)}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <p className="mt-8 text-xs">{t("copyright")}</p>
      </div>
    </footer>
  );
}
```

- [ ] **Step 5: Wire header/footer into the locale layout**

In `src/app/[locale]/layout.tsx`, import `Header` and `Footer`, and render them around `{children}` inside `ThemeProvider`:

```tsx
<ThemeProvider>
  <Header />
  <main>{children}</main>
  <Footer />
</ThemeProvider>
```

- [ ] **Step 6: Verify manually**

Run: `npm run dev`, open `http://localhost:3000/uz`. Confirm the header/footer render, click each language button and confirm the URL prefix changes (`/uz` → `/ru` → `/en`) while staying on the same page, and click the theme toggle to confirm dark/light switching.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: add header, footer, language switcher, and theme toggle"
```

---

### Task 7: Hero and Work Zones sections (home page)

**Files:**
- Create: `src/components/marketing/hero.tsx`, `src/components/marketing/work-zone-card.tsx`, `src/components/marketing/work-zones-section.tsx`
- Modify: `src/app/[locale]/page.tsx`

**Interfaces:**
- Consumes: `Card`/`CardHeader`/`CardTitle`/`CardContent` (Task 2), `Badge` (Task 2), `Link` (Task 4).
- Produces: `<Hero />`, `<WorkZonesSection />` composed into the home page; `LeadForm` (Task 12) is rendered directly after these on the same page under an `id="lead-form"` anchor matching the header CTA link from Task 6.

- [ ] **Step 1: Build the Hero**

Create `src/components/marketing/hero.tsx`:

```tsx
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export function Hero() {
  const t = useTranslations("hero");

  return (
    <section className="mx-auto max-w-6xl px-6 py-20 text-center">
      <Badge variant="outline" className="mb-6">
        {t("badge")}
      </Badge>
      <h1 className="mx-auto max-w-3xl text-4xl font-bold tracking-tight sm:text-6xl">
        {t("title")}
      </h1>
      <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
        {t("subtitle")}
      </p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
        <Button asChild size="lg" className="bg-brand text-brand-foreground hover:opacity-90">
          <Link href="/#lead-form">{t("ctaPrimary")}</Link>
        </Button>
        <Button asChild size="lg" variant="outline">
          <Link href="/pricing">{t("ctaSecondary")}</Link>
        </Button>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Build the work zone card**

Create `src/components/marketing/work-zone-card.tsx`:

```tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function WorkZoneCard({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="text-sm text-muted-foreground">
        {description}
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 3: Build the work zones section**

Create `src/components/marketing/work-zones-section.tsx`:

```tsx
import { useTranslations } from "next-intl";
import { WorkZoneCard } from "./work-zone-card";

const ZONES = ["sales", "hr", "marketing", "systems"] as const;

export function WorkZonesSection() {
  const t = useTranslations("workZones");

  return (
    <section className="mx-auto max-w-6xl px-6 py-16">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="text-3xl font-bold tracking-tight">{t("title")}</h2>
        <p className="mt-4 text-muted-foreground">{t("subtitle")}</p>
      </div>
      <div className="mt-12 grid gap-6 sm:grid-cols-2">
        {ZONES.map((zone) => (
          <WorkZoneCard
            key={zone}
            title={t(`${zone}.title`)}
            description={t(`${zone}.description`)}
          />
        ))}
      </div>
    </section>
  );
}
```

- [ ] **Step 4: Compose the home page**

Replace `src/app/[locale]/page.tsx`:

```tsx
import { Hero } from "@/components/marketing/hero";
import { WorkZonesSection } from "@/components/marketing/work-zones-section";

export default function HomePage() {
  return (
    <>
      <Hero />
      <WorkZonesSection />
    </>
  );
}
```

- [ ] **Step 5: Verify manually**

Run: `npm run dev`, open `http://localhost:3000/uz`, `/ru`, `/en` — confirm hero and 4 work-zone cards render with correct translated text in each locale.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: build home page hero and work zones section"
```

---

### Task 8: Pricing page and PricingTable

**Files:**
- Create: `src/lib/pricing-data.ts`
- Create: `src/components/marketing/pricing-table.tsx`
- Create: `src/app/[locale]/pricing/page.tsx`

**Interfaces:**
- Produces: `PRICING_TIERS: PricingTier[]` (exported from `src/lib/pricing-data.ts`), `<PricingTable />`.

- [ ] **Step 1: Define the pricing data**

Create `src/lib/pricing-data.ts`. Prices below are MVP placeholders for local launch pricing — flag to the project owner for review before charging real customers, not final commercial terms.

```ts
export type PricingTier = {
  id: "freemium" | "businessS" | "businessM" | "businessL" | "enterprise";
  priceUZSMonthly: number | null;
  priceUZSAnnual: number | null;
  priceUSDApprox: number | null;
  isPopular: boolean;
  isCustom: boolean;
};

// MVP placeholder pricing — review with the project owner before real billing goes live.
export const PRICING_TIERS: PricingTier[] = [
  { id: "freemium", priceUZSMonthly: 0, priceUZSAnnual: 0, priceUSDApprox: 0, isPopular: false, isCustom: false },
  { id: "businessS", priceUZSMonthly: 190000, priceUZSAnnual: 1900000, priceUSDApprox: 150, isPopular: false, isCustom: false },
  { id: "businessM", priceUZSMonthly: 390000, priceUZSAnnual: 3900000, priceUSDApprox: 310, isPopular: true, isCustom: false },
  { id: "businessL", priceUZSMonthly: 990000, priceUZSAnnual: 9900000, priceUSDApprox: 790, isPopular: false, isCustom: false },
  { id: "enterprise", priceUZSMonthly: null, priceUZSAnnual: null, priceUSDApprox: null, isPopular: false, isCustom: true },
];

export function formatUZS(amount: number): string {
  return new Intl.NumberFormat("uz-UZ").format(amount) + " so'm";
}
```

- [ ] **Step 2: Build the PricingTable**

Create `src/components/marketing/pricing-table.tsx`:

```tsx
"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PRICING_TIERS, formatUZS } from "@/lib/pricing-data";

export function PricingTable() {
  const t = useTranslations("pricing");
  const [period, setPeriod] = useState<"monthly" | "annual">("annual");

  return (
    <div>
      <Tabs value={period} onValueChange={(v) => setPeriod(v as "monthly" | "annual")}>
        <TabsList className="mx-auto">
          <TabsTrigger value="monthly">{t("monthly")}</TabsTrigger>
          <TabsTrigger value="annual">
            {t("annual")} <Badge className="ml-2">{t("annualBadge")}</Badge>
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="mt-10 grid gap-6 lg:grid-cols-5">
        {PRICING_TIERS.map((tier) => {
          const price = period === "monthly" ? tier.priceUZSMonthly : tier.priceUZSAnnual;
          return (
            <Card
              key={tier.id}
              className={tier.isPopular ? "border-brand shadow-lg shadow-brand/10" : ""}
            >
              <CardHeader>
                {tier.isPopular && (
                  <Badge className="mb-2 w-fit bg-brand text-brand-foreground">
                    {t(`tiers.${tier.id}.popular`)}
                  </Badge>
                )}
                <CardTitle>{t(`tiers.${tier.id}.name`)}</CardTitle>
                <CardDescription>{t(`tiers.${tier.id}.description`)}</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="mb-6 space-y-2 text-sm text-muted-foreground">
                  <li>{t(`tiers.${tier.id}.employees`)}</li>
                  <li>{t(`tiers.${tier.id}.feature2`)}</li>
                </ul>
                {tier.isCustom ? (
                  <p className="text-2xl font-bold">{t(`tiers.${tier.id}.price`)}</p>
                ) : price === 0 ? (
                  <p className="text-2xl font-bold">{t(`tiers.${tier.id}.price`)}</p>
                ) : (
                  <div>
                    <p className="text-2xl font-bold">
                      {formatUZS(price ?? 0)}
                      <span className="text-sm font-normal text-muted-foreground">
                        {period === "monthly" ? t("perMonth") : t("perYear")}
                      </span>
                    </p>
                    {tier.priceUSDApprox ? (
                      <p className="text-xs text-muted-foreground">≈ ${tier.priceUSDApprox}</p>
                    ) : null}
                  </div>
                )}
                <Button className="mt-6 w-full bg-brand text-brand-foreground hover:opacity-90">
                  {t("cta")}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Build the pricing page**

Create `src/app/[locale]/pricing/page.tsx`:

```tsx
import { useTranslations } from "next-intl";
import { PricingTable } from "@/components/marketing/pricing-table";

export default function PricingPage() {
  const t = useTranslations("pricing");

  return (
    <section className="mx-auto max-w-6xl px-6 py-20">
      <div className="mx-auto max-w-2xl text-center">
        <h1 className="text-4xl font-bold tracking-tight">{t("title")}</h1>
        <p className="mt-4 text-muted-foreground">{t("subtitle")}</p>
      </div>
      <div className="mt-12">
        <PricingTable />
      </div>
    </section>
  );
}
```

- [ ] **Step 4: Verify manually**

Run: `npm run dev`, open `http://localhost:3000/uz/pricing`. Confirm 5 tiers render, "Business M" shows the popular badge, switching Monthly/Annual changes displayed prices, and Enterprise shows "So'rov bo'yicha" instead of a number.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: build pricing page with monthly/annual toggle"
```

---

### Task 9: Partners page

**Files:**
- Create: `src/components/marketing/partner-stats.tsx`
- Create: `src/app/[locale]/partners/page.tsx`

**Interfaces:**
- Consumes: `Card` (Task 2).
- Produces: `<PartnerStats />`.

- [ ] **Step 1: Build the PartnerStats component**

Create `src/components/marketing/partner-stats.tsx`:

```tsx
import { useTranslations } from "next-intl";
import { Card, CardContent } from "@/components/ui/card";

const STATS = ["discount", "referral", "launch", "levels"] as const;

export function PartnerStats() {
  const t = useTranslations("partners.stats");

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {STATS.map((stat) => (
        <Card key={stat}>
          <CardContent className="pt-6">
            <p className="text-3xl font-bold text-brand">{t(`${stat}.value`)}</p>
            <p className="mt-1 text-sm text-muted-foreground">{t(`${stat}.label`)}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Build the partners page**

Create `src/app/[locale]/partners/page.tsx`:

```tsx
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PartnerStats } from "@/components/marketing/partner-stats";

export default function PartnersPage() {
  const t = useTranslations("partners");

  return (
    <section className="mx-auto max-w-6xl px-6 py-20">
      <Badge variant="outline" className="mb-6">
        {t("badge")}
      </Badge>
      <h1 className="max-w-2xl text-4xl font-bold tracking-tight">{t("title")}</h1>
      <p className="mt-4 max-w-xl text-muted-foreground">{t("subtitle")}</p>
      <Button asChild size="lg" className="mt-8 bg-brand text-brand-foreground hover:opacity-90">
        <Link href="/#lead-form">{t("cta")}</Link>
      </Button>
      <div className="mt-16">
        <PartnerStats />
      </div>
    </section>
  );
}
```

- [ ] **Step 3: Verify manually**

Run: `npm run dev`, open `http://localhost:3000/uz/partners`, `/ru/partners`, `/en/partners` — confirm the 4 stat cards and CTA render translated correctly in each locale.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: build partners page with partner stats"
```

---

### Task 10: Legal pages

**Files:**
- Create: `src/app/[locale]/legal/[doc]/page.tsx`

**Interfaces:**
- Consumes: `legal.*` message keys (Task 4).
- Produces: routes `/uz/legal/offer`, `/uz/legal/privacy`, `/uz/legal/terms`, `/uz/legal/cookies`, `/uz/legal/consent` (and `ru`/`en` equivalents).

- [ ] **Step 1: Build the dynamic legal page**

Create `src/app/[locale]/legal/[doc]/page.tsx`:

```tsx
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

const VALID_DOCS = ["offer", "privacy", "terms", "cookies", "consent"] as const;
type LegalDoc = (typeof VALID_DOCS)[number];

function isValidDoc(doc: string): doc is LegalDoc {
  return (VALID_DOCS as readonly string[]).includes(doc);
}

type Props = { params: Promise<{ doc: string }> };

export default async function LegalDocPage({ params }: Props) {
  const { doc } = await params;
  if (!isValidDoc(doc)) {
    notFound();
  }

  const t = await getTranslations("legal");

  return (
    <article className="mx-auto max-w-2xl px-6 py-20">
      <h1 className="text-3xl font-bold tracking-tight">{t(`${doc}.title`)}</h1>
      <p className="mt-6 rounded-lg border border-yellow-600/40 bg-yellow-600/10 p-4 text-sm text-yellow-700 dark:text-yellow-400">
        {t("disclaimer")}
      </p>
    </article>
  );
}

export function generateStaticParams() {
  return VALID_DOCS.map((doc) => ({ doc }));
}
```

- [ ] **Step 2: Verify manually**

Run: `npm run dev`, open `http://localhost:3000/uz/legal/offer` and `http://localhost:3000/uz/legal/does-not-exist` — expect the first to render the disclaimer, the second to render Next.js's 404 page.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: add legal document pages with draft disclaimer"
```

---

### Task 11: Consultation validation, rate-limit, and Telegram lib functions (TDD)

**Files:**
- Create: `src/lib/consultation/schema.ts`
- Create: `src/lib/consultation/rate-limit.ts`
- Create: `src/lib/consultation/telegram.ts`
- Test: `src/lib/consultation/schema.test.ts`, `src/lib/consultation/rate-limit.test.ts`, `src/lib/consultation/telegram.test.ts`

**Interfaces:**
- Produces: `parseConsultationInput(input: unknown): { success: true; data: { name: string; phone: string } } | { success: false; error: string }`; `checkRateLimit(key: string): boolean` (true = allowed); `sendLeadNotification(lead: { name: string; phone: string }): Promise<{ ok: boolean }>`.
- Consumed by: the Server Action in Task 12.

- [ ] **Step 1: Install Zod and Vitest**

```bash
npm install zod
npm install -D vitest
```

Add to `package.json` `"scripts"`: `"test": "vitest run"`.

- [ ] **Step 2: Write the failing schema test**

Create `src/lib/consultation/schema.test.ts`:

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
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `npx vitest run src/lib/consultation/schema.test.ts`
Expected: FAIL — `Cannot find module './schema'`.

- [ ] **Step 4: Implement the schema**

Create `src/lib/consultation/schema.ts`:

```ts
import { z } from "zod";

const consultationSchema = z.object({
  name: z.string().trim().min(2).max(100),
  phone: z
    .string()
    .trim()
    .regex(/^\+998\d{9}$/, "Phone must match +998XXXXXXXXX"),
});

export type ConsultationInput = z.infer<typeof consultationSchema>;

export function parseConsultationInput(
  input: unknown,
):
  | { success: true; data: ConsultationInput }
  | { success: false; error: string } {
  const result = consultationSchema.safeParse(input);
  if (!result.success) {
    return { success: false, error: result.error.issues[0]?.message ?? "Invalid input" };
  }
  return { success: true, data: result.data };
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npx vitest run src/lib/consultation/schema.test.ts`
Expected: PASS, 4/4 tests.

- [ ] **Step 6: Write the failing rate-limit test**

Create `src/lib/consultation/rate-limit.test.ts`:

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { checkRateLimit } from "./rate-limit";

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
});
```

- [ ] **Step 7: Run the test to verify it fails**

Run: `npx vitest run src/lib/consultation/rate-limit.test.ts`
Expected: FAIL — `Cannot find module './rate-limit'`.

- [ ] **Step 8: Implement the rate limiter**

Create `src/lib/consultation/rate-limit.ts`:

```ts
// In-memory only — resets on redeploy and is not shared across serverless
// instances. Acceptable for MVP lead-volume; revisit with a durable store
// (e.g. Vercel KV/Upstash) once traffic justifies it.
const lastRequestAt = new Map<string, number>();
const WINDOW_MS = 30_000;

export function checkRateLimit(key: string): boolean {
  const now = Date.now();
  const last = lastRequestAt.get(key);
  if (last !== undefined && now - last < WINDOW_MS) {
    return false;
  }
  lastRequestAt.set(key, now);
  return true;
}
```

- [ ] **Step 9: Run the test to verify it passes**

Run: `npx vitest run src/lib/consultation/rate-limit.test.ts`
Expected: PASS, 3/3 tests.

- [ ] **Step 10: Write the failing Telegram test**

Create `src/lib/consultation/telegram.test.ts`:

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

- [ ] **Step 11: Run the test to verify it fails**

Run: `npx vitest run src/lib/consultation/telegram.test.ts`
Expected: FAIL — `Cannot find module './telegram'`.

- [ ] **Step 12: Implement the Telegram helper**

Create `src/lib/consultation/telegram.ts`:

```ts
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
        text: `Yangi lid — TayanchAI\nIsm: ${lead.name}\nTelefon: ${lead.phone}`,
      }),
    });
    return { ok: response.ok };
  } catch (error) {
    console.error("Failed to send lead notification to Telegram", error);
    return { ok: false };
  }
}
```

- [ ] **Step 13: Run the test to verify it passes**

Run: `npx vitest run src/lib/consultation/telegram.test.ts`
Expected: PASS, 3/3 tests.

- [ ] **Step 14: Run the full unit test suite**

Run: `npm test`
Expected: all 10 tests across the 3 files pass.

- [ ] **Step 15: Commit**

```bash
git add -A
git commit -m "feat: add consultation validation, rate-limit, and Telegram lib functions"
```

---

### Task 12: Consultation Server Action and LeadForm component

**Files:**
- Create: `src/lib/consultation/actions.ts`
- Create: `src/components/marketing/lead-form.tsx`
- Modify: `src/app/[locale]/page.tsx`

**Interfaces:**
- Consumes: `parseConsultationInput`, `checkRateLimit`, `sendLeadNotification` (Task 11).
- Produces: `submitConsultationAction(prevState: ConsultationState, formData: FormData): Promise<ConsultationState>` where `ConsultationState = { status: "idle" | "success" | "error"; message?: string }`; `<LeadForm />` rendered on the home page under `id="lead-form"`.

- [ ] **Step 1: Write the Server Action**

Create `src/lib/consultation/actions.ts`:

```ts
"use server";

import { headers } from "next/headers";
import { parseConsultationInput } from "./schema";
import { checkRateLimit } from "./rate-limit";
import { sendLeadNotification } from "./telegram";

export type ConsultationState = {
  status: "idle" | "success" | "error";
  message?: string;
};

export async function submitConsultationAction(
  _prevState: ConsultationState,
  formData: FormData,
): Promise<ConsultationState> {
  const parsed = parseConsultationInput({
    name: formData.get("name"),
    phone: formData.get("phone"),
  });

  if (!parsed.success) {
    return { status: "error", message: "validation" };
  }

  const headerList = await headers();
  const ip = headerList.get("x-forwarded-for") ?? "unknown";

  if (!checkRateLimit(ip)) {
    return { status: "error", message: "rateLimit" };
  }

  // Telegram failures are logged inside sendLeadNotification and never
  // surfaced to the visitor — a lost notification should not look like a
  // broken form.
  await sendLeadNotification(parsed.data);

  return { status: "success" };
}
```

- [ ] **Step 2: Build the LeadForm component**

Create `src/components/marketing/lead-form.tsx`:

```tsx
"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { submitConsultationAction, type ConsultationState } from "@/lib/consultation/actions";

const initialState: ConsultationState = { status: "idle" };

export function LeadForm() {
  const t = useTranslations("leadForm");
  const [state, formAction, isPending] = useActionState(submitConsultationAction, initialState);

  return (
    <section id="lead-form" className="mx-auto max-w-lg px-6 py-20">
      <div className="text-center">
        <h2 className="text-3xl font-bold tracking-tight">{t("title")}</h2>
        <p className="mt-4 text-muted-foreground">{t("subtitle")}</p>
      </div>

      {state.status === "success" ? (
        <p className="mt-8 rounded-lg border border-green-600/40 bg-green-600/10 p-4 text-center text-green-700 dark:text-green-400">
          {t("success")}
        </p>
      ) : (
        <form action={formAction} className="mt-8 space-y-4">
          <div>
            <Label htmlFor="name">{t("name")}</Label>
            <Input id="name" name="name" required minLength={2} maxLength={100} />
          </div>
          <div>
            <Label htmlFor="phone">{t("phone")}</Label>
            <Input id="phone" name="phone" placeholder="+998901234567" required />
          </div>
          {state.status === "error" && (
            <p className="text-sm text-red-600 dark:text-red-400">
              {state.message === "rateLimit" ? t("errorRateLimit") : t("errorValidation")}
            </p>
          )}
          <Button
            type="submit"
            disabled={isPending}
            className="w-full bg-brand text-brand-foreground hover:opacity-90"
          >
            {isPending ? t("submitPending") : t("submit")}
          </Button>
          <p className="text-center text-xs text-muted-foreground">{t("freeNote")}</p>
        </form>
      )}
    </section>
  );
}
```

- [ ] **Step 3: Render the LeadForm on the home page**

In `src/app/[locale]/page.tsx`, import `LeadForm` and add it after `WorkZonesSection`:

```tsx
import { Hero } from "@/components/marketing/hero";
import { WorkZonesSection } from "@/components/marketing/work-zones-section";
import { LeadForm } from "@/components/marketing/lead-form";

export default function HomePage() {
  return (
    <>
      <Hero />
      <WorkZonesSection />
      <LeadForm />
    </>
  );
}
```

- [ ] **Step 4: Create the env var template**

Create `.env.example` at the project root:

```
TELEGRAM_BOT_TOKEN=
TELEGRAM_LEADS_CHAT_ID=
```

- [ ] **Step 5: Verify manually with a real (or throwaway) Telegram bot**

Run: `npm run dev`. If `.env.local` has valid `TELEGRAM_BOT_TOKEN`/`TELEGRAM_LEADS_CHAT_ID`, submit the form at `http://localhost:3000/uz#lead-form` with a valid name and `+998` phone number, and confirm a message arrives in the target Telegram chat. Without valid env vars, confirm the UI still shows the success message (per Global Constraints) while the server console logs the missing-env error.
Also verify: submitting an invalid phone shows `errorValidation`, and submitting twice within 30 seconds shows `errorRateLimit`.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: wire consultation lead form to Server Action"
```

---

### Task 13: Playwright smoke tests

**Files:**
- Create: `playwright.config.ts`
- Create: `tests/e2e/marketing.spec.ts`

**Interfaces:**
- Produces: `npm run test:e2e` script.

- [ ] **Step 1: Install Playwright**

```bash
npm install -D @playwright/test
npx playwright install --with-deps chromium
```

- [ ] **Step 2: Create the Playwright config**

Create `playwright.config.ts`:

```ts
import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: true,
    timeout: 60_000,
  },
  use: {
    baseURL: "http://localhost:3000",
  },
});
```

- [ ] **Step 3: Write the smoke test**

Create `tests/e2e/marketing.spec.ts`:

```ts
import { test, expect } from "@playwright/test";

const LOCALES = ["uz", "ru", "en"] as const;
const PAGES = ["", "/pricing", "/partners", "/legal/offer"];

for (const locale of LOCALES) {
  for (const page of PAGES) {
    test(`${locale}${page || "/"} renders without error`, async ({ page: browserPage }) => {
      const response = await browserPage.goto(`/${locale}${page}`);
      expect(response?.status()).toBeLessThan(400);
    });
  }
}

test("home page CTA scrolls to the lead form and it is fillable", async ({ page }) => {
  await page.goto("/uz");
  await page.getByRole("link", { name: "Konsultatsiya olish" }).first().click();
  await expect(page.locator("#lead-form")).toBeInViewport();
  await page.getByLabel("Ism").fill("Test Foydalanuvchi");
  await page.getByLabel("Telefon raqami").fill("+998901234567");
});

test("language switcher changes the URL prefix", async ({ page }) => {
  await page.goto("/uz/pricing");
  await page.getByRole("button", { name: "RU" }).click();
  await expect(page).toHaveURL(/\/ru\/pricing/);
});
```

- [ ] **Step 4: Add the e2e script and run it**

Add to `package.json` `"scripts"`: `"test:e2e": "playwright test"`.

Run: `npm run test:e2e`
Expected: all tests pass (15 page-render checks + 2 interaction tests = 17 total).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "test: add Playwright smoke tests for all marketing pages and locales"
```

---

### Task 14: CI workflow

**Files:**
- Create: `.github/workflows/ci.yml`

**Interfaces:**
- Produces: a GitHub Actions workflow that runs on every push/PR.

- [ ] **Step 1: Write the workflow**

Create `.github/workflows/ci.yml`:

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:

jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 24
          cache: npm
      - run: npm ci
      - run: npm run lint
      - run: npx tsc --noEmit
      - run: npm test
      - run: npx playwright install --with-deps chromium
      - run: npm run test:e2e
```

- [ ] **Step 2: Verify locally that every command the workflow runs succeeds**

Run in sequence: `npm run lint`, `npx tsc --noEmit`, `npm test`, `npm run test:e2e`
Expected: all exit with code 0.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "ci: add lint, typecheck, unit test, and e2e workflow"
```

---

### Task 15: Manual browser verification pass

No files change in this task — this is the final human-facing QA pass required before calling Phase 0-1 done. Use the `claude-in-chrome` tools, not just `curl`.

- [ ] **Step 1: Start the dev server**

Run: `npm run dev` (background)

- [ ] **Step 2: Walk every page in every locale**

In the browser, visit `/uz`, `/ru`, `/en` and for each locale visit `/`, `/pricing`, `/partners`, `/legal/offer`, `/legal/privacy`, `/legal/terms`, `/legal/cookies`, `/legal/consent`. Confirm: no untranslated keys (no raw `hero.title`-style strings visible), no layout breakage, no console errors.

- [ ] **Step 3: Exercise the interactive elements**

Toggle dark/light theme on at least 2 pages. Switch language via the header switcher from each of the 3 locales. Toggle the Pricing page's Monthly/Annual tabs and confirm all 5 tiers update. Submit the lead form once with valid data and confirm the success message replaces the form.

- [ ] **Step 4: Check responsive layout**

Resize the browser to a mobile width (~375px) and re-check the home, pricing, and partners pages for broken layout or overflow.

- [ ] **Step 5: Stop the dev server and report results**

Report any defects found; fix before considering Phase 0-1 complete.

---

## Post-plan note

This plan intentionally ships MVP-placeholder pricing (Task 8) and draft-only legal text (Task 10) — both are flagged inline for the project owner to replace with real commercial and legal decisions before public launch. Phase 2 (auth + billing) is the next plan to write, per the roadmap in `CLAUDE.md`.
