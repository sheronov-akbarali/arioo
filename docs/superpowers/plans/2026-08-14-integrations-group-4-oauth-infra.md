# Integrations Guruh 4: OAuth infratuzilmasi (Implementation Plan)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** amoCRM, Bitrix24, Google, GitHub, HeadHunter uchun umumiy OAuth
start/callback route'larini va har biriga xos token-almashish logikasini
qurish; kalitlar sozlanmagan bo'lsa aniq "Sozlash kerak" holatini ko'rsatish.

**Architecture:** Bitta umumiy `/api/integrations/[provider]/oauth/start` va
`/api/integrations/[provider]/oauth/callback` route, har bir provayder uchun
`src/lib/integrations/oauth/{provider}.ts` faylida `authUrl`/token-almashish
funksiyasi. State CSRF himoyasi uchun imzolangan token ishlatiladi.

**Tech Stack:** Next.js Route Handlers, `node:crypto` (HMAC state imzolash), Drizzle ORM.

**Spec:** `docs/superpowers/specs/2026-08-14-integrations-overhaul-design.md` (6-bo'lim)

**Depends on:** `2026-08-14-integrations-group-1-data-model.md`, `2026-08-14-integrations-group-2-status-dashboard.md`

## Global Constraints

- Real OAuth endpointlar (2026-08-14'da tekshirilgan):
  - Google: `https://accounts.google.com/o/oauth2/v2/auth` / token: `https://oauth2.googleapis.com/token`
  - GitHub: `https://github.com/login/oauth/authorize` / token: `https://github.com/login/oauth/access_token`
  - Bitrix24: `https://auth2.bitrix24.net/oauth/authorize/` (portal-mustaqil, foydalanuvchi o'z portalini keyingi qadamda tanlaydi) / token: `https://oauth.bitrix.info/oauth/token/`
  - amoCRM: `https://www.amocrm.ru/oauth` / token: `https://{subdomain}.amocrm.ru/oauth2/access_token` — `{subdomain}` callback'da qaytadigan `referer` parametridan olinadi
  - HeadHunter: `https://hh.ru/oauth/authorize` / token: `https://hh.ru/oauth/token`
  - Bu URL'lar implementatsiya vaqtida har bir provayderning rasmiy developer hujjatiga qarab tasdiqlanishi kerak (ayniqsa amoCRM/Bitrix24 — ular vaqti-vaqti bilan portal-based oqimlarni yangilaydi)
- Redirect URI shabloni: `${NEXT_PUBLIC_APP_URL}/api/integrations/{provider}/oauth/callback`
- `NEXT_PUBLIC_APP_URL` env o'zgaruvchisi mavjud emas — bu guruhda qo'shiladi (Task 1)

---

### Task 1: `NEXT_PUBLIC_APP_URL` va OAuth env o'zgaruvchilarini loyihaga qo'shish

**Files:**
- Modify: `.env.example`
- Modify: `.env.local`

**Interfaces:** yo'q (faqat konfiguratsiya)

- [ ] `.env.example` fayliga qo'shish:

```
NEXT_PUBLIC_APP_URL=http://localhost:3000
OAUTH_STATE_SIGNING_SECRET=

AMOCRM_CLIENT_ID=
AMOCRM_CLIENT_SECRET=
BITRIX24_CLIENT_ID=
BITRIX24_CLIENT_SECRET=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
HEADHUNTER_CLIENT_ID=
HEADHUNTER_CLIENT_SECRET=
```

- [ ] `.env.local` fayliga xuddi shu qatorlarni qo'shish: `NEXT_PUBLIC_APP_URL=http://localhost:3000` va `OAUTH_STATE_SIGNING_SECRET=` (qiymatini `openssl rand -base64 32` bilan generatsiya qilib to'ldirish). Provayder client_id/secret qatorlari bo'sh qoladi — ular foydalanuvchi tomonidan tashqi developer-akkauntlar orqali olinadi (spec 12-bo'lim); shu bo'sh holatida ham kod ishlashi kerak (Task 4'dagi "Sozlash kerak" holati orqali).
- [ ] Commit:

```bash
git add .env.example
git commit -m "chore(integrations): add OAuth env variable placeholders"
```

(`.env.local` `.gitignore`'da bo'lgani uchun commit qilinmaydi.)

---

### Task 2: State imzolash moduli

**Files:**
- Create: `src/lib/integrations/oauth/state.ts`
- Test: `src/lib/integrations/oauth/state.test.ts`

**Interfaces:**
- Produces: `signOAuthState(payload: { organizationId: string; provider: string }): string`, `verifyOAuthState(token: string): { organizationId: string; provider: string } | null`

- [ ] `src/lib/integrations/oauth/state.test.ts` yozish:

```ts
import { describe, it, expect, beforeAll } from "vitest";
import { signOAuthState, verifyOAuthState } from "./state";

beforeAll(() => {
  process.env.OAUTH_STATE_SIGNING_SECRET = "test-secret-value-for-hmac-signing";
});

describe("OAuth state signing", () => {
  it("round-trips a signed payload", () => {
    const token = signOAuthState({ organizationId: "org_123", provider: "amocrm" });
    const verified = verifyOAuthState(token);
    expect(verified).toEqual({ organizationId: "org_123", provider: "amocrm" });
  });

  it("rejects a tampered token", () => {
    const token = signOAuthState({ organizationId: "org_123", provider: "amocrm" });
    const tampered = token.slice(0, -2) + "xx";
    expect(verifyOAuthState(tampered)).toBeNull();
  });

  it("rejects a malformed token", () => {
    expect(verifyOAuthState("not-a-valid-token")).toBeNull();
  });
});
```

- [ ] Testni ishga tushirish: `npx vitest run src/lib/integrations/oauth/state.test.ts` — FAIL (`Cannot find module './state'`).

- [ ] `src/lib/integrations/oauth/state.ts` yaratish:

```ts
import "server-only";
import { createHmac, timingSafeEqual, randomBytes } from "node:crypto";

type StatePayload = { organizationId: string; provider: string };

function getSecret(): string {
  const secret = process.env.OAUTH_STATE_SIGNING_SECRET;
  if (!secret) throw new Error("OAUTH_STATE_SIGNING_SECRET is not set");
  return secret;
}

export function signOAuthState(payload: StatePayload): string {
  const nonce = randomBytes(8).toString("hex");
  const body = JSON.stringify({ ...payload, nonce });
  const bodyBase64 = Buffer.from(body).toString("base64url");
  const signature = createHmac("sha256", getSecret()).update(bodyBase64).digest("base64url");
  return `${bodyBase64}.${signature}`;
}

export function verifyOAuthState(token: string): StatePayload | null {
  const [bodyBase64, signature] = token.split(".");
  if (!bodyBase64 || !signature) return null;

  const expectedSignature = createHmac("sha256", getSecret()).update(bodyBase64).digest("base64url");
  const a = Buffer.from(signature);
  const b = Buffer.from(expectedSignature);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  try {
    const parsed = JSON.parse(Buffer.from(bodyBase64, "base64url").toString("utf8"));
    if (typeof parsed.organizationId !== "string" || typeof parsed.provider !== "string") return null;
    return { organizationId: parsed.organizationId, provider: parsed.provider };
  } catch {
    return null;
  }
}
```

- [ ] Testni qayta ishga tushirish: `npx vitest run src/lib/integrations/oauth/state.test.ts` — 3 ta test PASS.

- [ ] Commit:

```bash
git add src/lib/integrations/oauth/state.ts src/lib/integrations/oauth/state.test.ts
git commit -m "feat(integrations): add HMAC-signed OAuth state helper"
```

---

### Task 3: Har bir provayder uchun OAuth konfiguratsiyasi

**Files:**
- Create: `src/lib/integrations/oauth/config.ts`

**Interfaces:**
- Produces: `OAuthProviderConfig` type, `getOAuthConfig(provider: string): OAuthProviderConfig | null`, `isOAuthConfigured(provider: string): boolean`

- [ ] `src/lib/integrations/oauth/config.ts` yaratish:

```ts
import "server-only";

export type OAuthProviderConfig = {
  authUrl: string;
  tokenUrl: string;
  clientId: string;
  clientSecret: string;
  scopes: string[];
};

const PROVIDER_ENV_PREFIX: Record<string, string> = {
  amocrm: "AMOCRM",
  bitrix24: "BITRIX24",
  google: "GOOGLE",
  github: "GITHUB",
  headhunter: "HEADHUNTER",
};

const PROVIDER_ENDPOINTS: Record<string, { authUrl: string; tokenUrl: string; scopes: string[] }> = {
  amocrm: { authUrl: "https://www.amocrm.ru/oauth", tokenUrl: "", scopes: [] },
  bitrix24: {
    authUrl: "https://auth2.bitrix24.net/oauth/authorize/",
    tokenUrl: "https://oauth.bitrix.info/oauth/token/",
    scopes: ["im", "imbot", "imopenlines", "crm", "user_basic"],
  },
  google: {
    authUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenUrl: "https://oauth2.googleapis.com/token",
    scopes: [
      "https://www.googleapis.com/auth/drive",
      "https://www.googleapis.com/auth/spreadsheets",
      "https://www.googleapis.com/auth/calendar",
      "https://www.googleapis.com/auth/calendar.events",
      "https://www.googleapis.com/auth/userinfo.profile",
      "https://www.googleapis.com/auth/userinfo.email",
    ],
  },
  github: {
    authUrl: "https://github.com/login/oauth/authorize",
    tokenUrl: "https://github.com/login/oauth/access_token",
    scopes: ["repo", "read:user"],
  },
  headhunter: {
    authUrl: "https://hh.ru/oauth/authorize",
    tokenUrl: "https://hh.ru/oauth/token",
    scopes: [],
  },
};

export function isOAuthConfigured(provider: string): boolean {
  const prefix = PROVIDER_ENV_PREFIX[provider];
  if (!prefix) return false;
  return Boolean(process.env[`${prefix}_CLIENT_ID`] && process.env[`${prefix}_CLIENT_SECRET`]);
}

export function getOAuthConfig(provider: string): OAuthProviderConfig | null {
  const prefix = PROVIDER_ENV_PREFIX[provider];
  const endpoints = PROVIDER_ENDPOINTS[provider];
  if (!prefix || !endpoints) return null;

  const clientId = process.env[`${prefix}_CLIENT_ID`];
  const clientSecret = process.env[`${prefix}_CLIENT_SECRET`];
  if (!clientId || !clientSecret) return null;

  return { ...endpoints, clientId, clientSecret };
}
```

`amocrm.tokenUrl` bo'sh qoldirilgan — amoCRM'ning token endpoint'i foydalanuvchi
subdomeniga bog'liq (`https://{subdomain}.amocrm.ru/oauth2/access_token`),
callback route'da dinamik hosil qilinadi (Task 5).

- [ ] `npx tsc --noEmit` — xatosiz.
- [ ] Commit:

```bash
git add src/lib/integrations/oauth/config.ts
git commit -m "feat(integrations): add per-provider OAuth endpoint configuration"
```

---

### Task 4: OAuth start route

**Files:**
- Create: `src/app/api/integrations/[provider]/oauth/start/route.ts`

**Interfaces:**
- Consumes: `getOAuthConfig`, `isOAuthConfigured` (`@/lib/integrations/oauth/config`), `signOAuthState` (`@/lib/integrations/oauth/state`), `requireOrganization` (`@/lib/auth/dal`)

- [ ] `src/app/api/integrations/[provider]/oauth/start/route.ts` yaratish:

```ts
import { NextResponse } from "next/server";
import { getOAuthConfig, isOAuthConfigured } from "@/lib/integrations/oauth/config";
import { signOAuthState } from "@/lib/integrations/oauth/state";
import { requireOrganization } from "@/lib/auth/dal";

export async function GET(req: Request, { params }: { params: Promise<{ provider: string }> }) {
  const { provider } = await params;
  const locale = new URL(req.url).searchParams.get("locale") ?? "uz";
  const { organization } = await requireOrganization(locale);

  if (!isOAuthConfigured(provider)) {
    return NextResponse.redirect(
      new URL(`/${locale}/integrations?oauthError=not_configured&provider=${provider}`, req.url)
    );
  }

  const config = getOAuthConfig(provider);
  if (!config) {
    return NextResponse.redirect(new URL(`/${locale}/integrations?oauthError=unknown_provider`, req.url));
  }

  const state = signOAuthState({ organizationId: organization.id, provider });
  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/integrations/${provider}/oauth/callback`;

  const authorizeUrl = new URL(config.authUrl);
  authorizeUrl.searchParams.set("client_id", config.clientId);
  authorizeUrl.searchParams.set("redirect_uri", redirectUri);
  authorizeUrl.searchParams.set("response_type", "code");
  authorizeUrl.searchParams.set("state", state);
  if (config.scopes.length > 0) {
    authorizeUrl.searchParams.set("scope", config.scopes.join(" "));
  }

  return NextResponse.redirect(authorizeUrl.toString());
}
```

- [ ] `npx tsc --noEmit` — xatosiz.
- [ ] Commit:

```bash
git add "src/app/api/integrations/[provider]/oauth/start/route.ts"
git commit -m "feat(integrations): add generic OAuth start route"
```

---

### Task 5: Provayder-maxsus token-almashish funksiyalari

**Files:**
- Create: `src/lib/integrations/oauth/exchange.ts`
- Test: `src/lib/integrations/oauth/exchange.test.ts`

**Interfaces:**
- Produces: `exchangeCodeForToken(provider: string, code: string, extra: Record<string, string>): Promise<{ accessToken: string; refreshToken?: string; raw: unknown }>`

- [ ] `src/lib/integrations/oauth/exchange.test.ts` yozish (fetch mock bilan):

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { exchangeCodeForToken } from "./exchange";

describe("exchangeCodeForToken", () => {
  beforeEach(() => {
    process.env.GITHUB_CLIENT_ID = "gh_client";
    process.env.GITHUB_CLIENT_SECRET = "gh_secret";
    process.env.NEXT_PUBLIC_APP_URL = "https://arioo.uz";
  });

  it("posts to the provider token URL and returns the access token", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ access_token: "gho_abc123", token_type: "bearer" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await exchangeCodeForToken("github", "code123", {});

    expect(result.accessToken).toBe("gho_abc123");
    expect(fetchMock).toHaveBeenCalledWith(
      "https://github.com/login/oauth/access_token",
      expect.objectContaining({ method: "POST" })
    );
  });

  it("throws for an unknown provider", async () => {
    await expect(exchangeCodeForToken("unknown", "code", {})).rejects.toThrow();
  });
});
```

- [ ] Testni ishga tushirish: `npx vitest run src/lib/integrations/oauth/exchange.test.ts` — FAIL (`Cannot find module './exchange'`).

- [ ] `src/lib/integrations/oauth/exchange.ts` yaratish:

```ts
import "server-only";
import { getOAuthConfig } from "./config";

type ExchangeResult = { accessToken: string; refreshToken?: string; raw: unknown };

export async function exchangeCodeForToken(
  provider: string,
  code: string,
  extra: Record<string, string>
): Promise<ExchangeResult> {
  const config = getOAuthConfig(provider);
  if (!config) throw new Error(`OAuth is not configured for provider "${provider}"`);

  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/integrations/${provider}/oauth/callback`;

  // amoCRM'ning token endpoint'i callback'da qaytgan `referer` orqali
  // ma'lum bo'lgan subdomenga bog'liq — `extra.tokenUrl` orqali override qilinadi.
  const tokenUrl = extra.tokenUrl || config.tokenUrl;
  if (!tokenUrl) throw new Error(`No token URL resolved for provider "${provider}"`);

  const response = await fetch(tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
    }),
  });

  if (!response.ok) {
    throw new Error(`Token exchange failed for provider "${provider}": ${response.status}`);
  }

  const raw = await response.json();
  const accessToken = raw.access_token;
  if (typeof accessToken !== "string") {
    throw new Error(`Token exchange response for "${provider}" did not include access_token`);
  }

  return { accessToken, refreshToken: raw.refresh_token, raw };
}
```

- [ ] Testni qayta ishga tushirish: `npx vitest run src/lib/integrations/oauth/exchange.test.ts` — 2 ta test PASS.

- [ ] Commit:

```bash
git add src/lib/integrations/oauth/exchange.ts src/lib/integrations/oauth/exchange.test.ts
git commit -m "feat(integrations): add generic OAuth token exchange"
```

---

### Task 6: OAuth callback route

**Files:**
- Create: `src/app/api/integrations/[provider]/oauth/callback/route.ts`

**Interfaces:**
- Consumes: `verifyOAuthState`, `exchangeCodeForToken`, `encryptCredential` (`@/lib/integrations/credential-crypto`), `integrations`/`integrationEvents` (`@/db/schema/integrations`)

- [ ] `src/app/api/integrations/[provider]/oauth/callback/route.ts` yaratish:

```ts
import { NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { db } from "@/db/client";
import { integrations, integrationEvents } from "@/db/schema/integrations";
import { verifyOAuthState } from "@/lib/integrations/oauth/state";
import { exchangeCodeForToken } from "@/lib/integrations/oauth/exchange";
import { encryptCredential } from "@/lib/integrations/credential-crypto";

export async function GET(req: Request, { params }: { params: Promise<{ provider: string }> }) {
  const { provider } = await params;
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const stateToken = url.searchParams.get("state");
  const referer = url.searchParams.get("referer"); // amoCRM's portal subdomain hint

  const state = stateToken ? verifyOAuthState(stateToken) : null;
  const locale = "uz"; // callback'da locale state'da saqlanmagan, standart tilga qaytariladi

  if (!code || !state || state.provider !== provider) {
    return NextResponse.redirect(
      new URL(`/${locale}/integrations?oauthError=invalid_state`, req.url)
    );
  }

  try {
    const extra: Record<string, string> = {};
    if (provider === "amocrm" && referer) {
      extra.tokenUrl = `${referer.replace(/\/$/, "")}/oauth2/access_token`;
    }

    const { accessToken, refreshToken } = await exchangeCodeForToken(provider, code, extra);
    const credentialsEncrypted = encryptCredential(JSON.stringify({ accessToken, refreshToken }));

    const [existing] = await db
      .select({ id: integrations.id })
      .from(integrations)
      .where(and(eq(integrations.organizationId, state.organizationId), eq(integrations.providerId, provider)));

    let integrationId: string;
    if (existing) {
      await db
        .update(integrations)
        .set({ status: "active", credentialsEncrypted, lastVerifiedAt: new Date(), lastError: null, updatedAt: new Date() })
        .where(eq(integrations.id, existing.id));
      integrationId = existing.id;
    } else {
      const [created] = await db
        .insert(integrations)
        .values({
          organizationId: state.organizationId,
          providerId: provider,
          connectionMode: "oauth",
          status: "active",
          credentialsEncrypted,
          lastVerifiedAt: new Date(),
        })
        .returning({ id: integrations.id });
      integrationId = created.id;
    }

    await db.insert(integrationEvents).values({ integrationId, type: "verified", message: "OAuth token obtained" });

    return NextResponse.redirect(new URL(`/${locale}/integrations?oauthSuccess=${provider}`, req.url));
  } catch (error) {
    console.error(`OAuth callback failed for provider "${provider}":`, error);
    return NextResponse.redirect(
      new URL(`/${locale}/integrations?oauthError=exchange_failed&provider=${provider}`, req.url)
    );
  }
}
```

- [ ] `npx tsc --noEmit` — xatosiz.
- [ ] Commit:

```bash
git add "src/app/api/integrations/[provider]/oauth/callback/route.ts"
git commit -m "feat(integrations): add generic OAuth callback route"
```

---

### Task 7: amoCRM, Bitrix24, Google, GitHub, HeadHunter kartalarini OAuth tugmasiga o'tkazish

**Files:**
- Modify: `src/components/dashboard/integrations/integrations-grid.tsx`
- Delete: `src/components/dashboard/integrations/external-crm-connect-dialog.tsx`
- Delete: `src/components/dashboard/integrations/calendar-connect-dialog.tsx`
- Create: `src/components/dashboard/integrations/oauth-connect-button.tsx`

**Interfaces:**
- Produces: `OAuthConnectButton` komponenti, props: `{ provider: string; configured: boolean; locale: string }`

- [ ] `src/components/dashboard/integrations/oauth-connect-button.tsx` yaratish:

```tsx
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

export function OAuthConnectButton({ provider, configured, locale }: { provider: string; configured: boolean; locale: string }) {
  const t = useTranslations("integrations");

  if (!configured) {
    return (
      <Button size="sm" variant="outline" disabled>
        {t("setupNeeded")}
      </Button>
    );
  }

  return (
    <Button size="sm" variant="outline" render={<a href={`/api/integrations/${provider}/oauth/start?locale=${locale}`} />}>
      {t("connect")}
    </Button>
  );
}
```

- [ ] `messages/uz.json`'ning `integrations` bo'limiga qo'shish: `"setupNeeded": "Sozlash kerak"`. `ru.json`/`en.json`'ga mos tarjima ("Требует настройки" / "Setup needed").

- [ ] `src/components/dashboard/integrations/integrations-grid.tsx` faylida:
  1. Komponent props'iga `isOAuthConfigured: Record<string, boolean>` qo'shish (server tomonda `page.tsx` orqali uzatiladi — Task 8).
  2. `import { OAuthConnectButton } from "./oauth-connect-button";` qo'shish.
  3. `provider.id === "amocrm"` va `provider.id === "bitrix24"` shartlarini topib (`ExternalCrmConnectDialog` chaqirilgan joy), ikkalasini ham `<OAuthConnectButton provider={provider.id} configured={isOAuthConfigured[provider.id] ?? false} locale={locale} />`ga almashtirish.
  4. `provider.id === "googleWorkspace"` shartini (`CalendarConnectDialog` chaqirilgan joy) olib tashlab, `provider.id === "google"` sharti qo'shish, xuddi shu `OAuthConnectButton`ni ishlatish.
  5. `provider.id === "github"` va `provider.id === "oneC"` uchun eski "Tez orada" disabled tugma o'rniga: `github` uchun `OAuthConnectButton`, `oneC` — bu guruh-5'da hal qilinadi, hozircha o'zgarishsiz qoldiriladi (comment qo'shish shart emas, faqat `github` shartini qo'shish).
  6. Yangi `provider.id === "headhunter"` shartini qo'shib, `OAuthConnectButton` bilan bog'lash (bu — yangi provayder, `INTEGRATION_PROVIDERS` ro'yxatida guruh-1'da allaqachon qo'shilgan).
  7. `ICONS` obyektiga `github: GitBranch` (mavjud bo'lishi kerak), `google: FileSpreadsheet`, `headhunter: Building2` yozuvlarini tekshirib to'ldirish.

- [ ] `src/components/dashboard/integrations/external-crm-connect-dialog.tsx` va `src/components/dashboard/integrations/calendar-connect-dialog.tsx` fayllarini o'chirish: `git rm src/components/dashboard/integrations/external-crm-connect-dialog.tsx src/components/dashboard/integrations/calendar-connect-dialog.tsx`. Bu fayllarni boshqa joyda import qilgan qatorlarni tekshirish (`grep -rn "ExternalCrmConnectDialog\|CalendarConnectDialog" src/`) va topilgan importlarni olib tashlash.

- [ ] `npx tsc --noEmit` — xatosiz.

- [ ] Commit **qilinmaydi** — Task 8 bilan birga.

---

### Task 8: `isOAuthConfigured` holatini sahifadan uzatish va OAuth xato/muvaffaqiyat toast'lari

**Files:**
- Modify: `src/app/[locale]/(dashboard)/integrations/page.tsx`
- Create: `src/components/dashboard/integrations/oauth-result-toast.tsx`

**Interfaces:**
- Consumes: `isOAuthConfigured` (`@/lib/integrations/oauth/config`)

- [ ] `src/app/[locale]/(dashboard)/integrations/page.tsx` fayliga import qo'shish: `import { isOAuthConfigured } from "@/lib/integrations/oauth/config";`

- [ ] `IntegrationsGrid` chaqiruvidan oldin qo'shish:

```ts
const oauthProviders = ["amocrm", "bitrix24", "google", "github", "headhunter"];
const isOAuthConfiguredMap = Object.fromEntries(
  oauthProviders.map((provider) => [provider, isOAuthConfigured(provider)])
);
```

- [ ] `<IntegrationsGrid ... />` chaqiruviga `isOAuthConfigured={isOAuthConfiguredMap}` prop qo'shish.

- [ ] `searchParams`'dan `oauthSuccess`/`oauthError` o'qish uchun `page.tsx` funksiya signaturasini `searchParams: Promise<{ oauthSuccess?: string; oauthError?: string; provider?: string }>` bilan kengaytirish (agar `searchParams` allaqachon prop sifatida mavjud bo'lmasa, qo'shish; mavjud bo'lsa, tur'ini kengaytirish) va bu qiymatlarni `await` qilib olish.

- [ ] `src/components/dashboard/integrations/oauth-result-toast.tsx` yaratish (client komponent, `useEffect` orqali toast ko'rsatadi — loyihada mavjud toast kutubxonasi yo'q bo'lsa, oddiy `alert`-o'rniga inline banner ishlatiladi):

```tsx
"use client";

import { useTranslations } from "next-intl";

export function OAuthResultToast({ success, error, provider }: { success?: string; error?: string; provider?: string }) {
  const t = useTranslations("integrations.oauthResult");

  if (success) {
    return <p className="rounded-md bg-green-500/10 px-3 py-2 text-sm text-green-700 dark:text-green-400">{t("success", { provider: success })}</p>;
  }
  if (error) {
    return (
      <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
        {error === "not_configured" ? t("notConfigured", { provider: provider ?? "" }) : t("failed", { provider: provider ?? "" })}
      </p>
    );
  }
  return null;
}
```

- [ ] `page.tsx`'ning return JSX'ida sarlavhadan keyin, `<IntegrationsGrid>`dan oldin `<OAuthResultToast success={oauthSuccess} error={oauthError} provider={provider} />` qo'shish.

- [ ] `messages/uz.json`'ning `integrations` bo'limiga qo'shish:

```json
"oauthResult": {
  "success": "{provider} muvaffaqiyatli ulandi.",
  "notConfigured": "{provider} uchun administrator hali OAuth kalitlarini sozlamagan.",
  "failed": "{provider} bilan ulanishda xatolik yuz berdi. Qayta urinib ko'ring."
}
```

`ru.json`/`en.json`'ga mos tarjima.

- [ ] `npx tsc --noEmit` — xatosiz.

- [ ] `npm run dev` orqali tekshirish: `/uz/integrations` sahifasida amoCRM/Bitrix24/Google/GitHub/HeadHunter kartalarida "Sozlash kerak" (disabled) tugma ko'rinishi (chunki `.env.local`da hali kalitlar yo'q) — bu kutilgan holat.

- [ ] Commit (Task 7-8 birga):

```bash
git add src/components/dashboard/integrations/integrations-grid.tsx \
  src/components/dashboard/integrations/oauth-connect-button.tsx \
  src/components/dashboard/integrations/oauth-result-toast.tsx \
  "src/app/[locale]/(dashboard)/integrations/page.tsx" \
  messages/uz.json messages/ru.json messages/en.json
git rm src/components/dashboard/integrations/external-crm-connect-dialog.tsx \
  src/components/dashboard/integrations/calendar-connect-dialog.tsx
git commit -m "feat(integrations): wire OAuth connect buttons and setup-needed state into the grid"
```

---

## Tugatish tekshiruvi

- [ ] `npx tsc --noEmit` — xatosiz
- [ ] `npx vitest run src/lib/integrations/oauth/` — barcha testlar PASS
- [ ] Chrome orqali: amoCRM/Bitrix24/Google/GitHub/HeadHunter kartalari "Sozlash kerak" holatida disabled ko'rinadi; `.env.local`ga test uchun soxta `GITHUB_CLIENT_ID`/`GITHUB_CLIENT_SECRET` qo'yib qayta tekshirilsa, GitHub kartasi endi "Ulash" tugmasini ko'rsatadi va bosilganda `github.com/login/oauth/authorize`ga redirect qiladi (haqiqiy akkaunt bilan tugatish shart emas, faqat redirect ishlashini tasdiqlash yetarli)
