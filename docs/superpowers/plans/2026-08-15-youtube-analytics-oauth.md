# YouTube Analytics OAuth Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the hardcoded YouTube Analytics mock card on `/statistics/marketing` with a real Google OAuth connection and real YouTube Data API v3 stats, built on top of the existing generic Integrations OAuth infrastructure.

**Architecture:** Reuse the existing `integrations` table (`providerId="youtube"`), `credential-crypto.ts`, and the generic `/api/integrations/[provider]/oauth/{start,callback}` routes — no new table, no new routes. Fix two real bugs in the shared OAuth exchange code (wrong Content-Type, no token-expiry tracking) that block YouTube (and every other OAuth provider) from actually completing a token exchange. Add a `youtube` provider entry to the OAuth config, a pure stats-fetching module, and a small DB-glue module that reads/refreshes/persists the connection.

**Tech Stack:** Next.js App Router (Route Handlers + Server Components), Drizzle ORM, Vitest, next-intl.

**Spec:** `docs/superpowers/specs/2026-08-15-youtube-analytics-oauth-design.md`

## Global Constraints

- No new DB table — use the existing `integrations` table (`providerId="youtube"`).
- No new env vars — reuse `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `INTEGRATION_CREDENTIALS_ENCRYPTION_KEY`, `OAUTH_STATE_SIGNING_SECRET`, `NEXT_PUBLIC_APP_URL`.
- The `/api/integrations/[provider]/oauth/callback` route stays provider-agnostic — no YouTube-specific API calls inside it. Channel ID/title are fetched lazily on first stats read.
- Scope: only "Watch time" is dropped from the original mock card (needs YouTube Analytics API, out of scope). Subscribers, total views, video count, and recent-video views are all real.
- All 3 languages (`uz` default, `ru`, `en`) get new translation keys — no hardcoded UI strings.
- Every new pure-logic module gets a Vitest test written first (TDD): `channel-stats.ts`, the `exchange.ts`/`state.ts` changes.

---

### Task 1: Fix OAuth token exchange to use form-urlencoded body and track expiry

**Files:**
- Modify: `src/lib/integrations/oauth/exchange.ts`
- Modify: `src/lib/integrations/oauth/exchange.test.ts`

**Interfaces:**
- Produces: `exchangeCodeForToken(provider: string, code: string, extra: Record<string, string>): Promise<{ accessToken: string; refreshToken?: string; expiresAt?: string; raw: unknown }>` (adds `expiresAt` to the existing return shape)
- Produces: `refreshAccessToken(provider: string, refreshToken: string): Promise<{ accessToken: string; refreshToken?: string; expiresAt?: string; raw: unknown }>` (new export)

This is the most important fix in the whole plan: Google's (and the OAuth 2.0 standard's) token endpoint rejects the current `Content-Type: application/json` body. Without this fix, no OAuth provider in this app can actually complete a token exchange against a real provider.

- [ ] **Step 1: Write failing tests for the new body format and expiry parsing**

Replace the contents of `src/lib/integrations/oauth/exchange.test.ts` with:

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { exchangeCodeForToken, refreshAccessToken } from "./exchange";

describe("exchangeCodeForToken", () => {
  beforeEach(() => {
    process.env.GITHUB_CLIENT_ID = "gh_client";
    process.env.GITHUB_CLIENT_SECRET = "gh_secret";
    process.env.GOOGLE_CLIENT_ID = "g_client";
    process.env.GOOGLE_CLIENT_SECRET = "g_secret";
    process.env.NEXT_PUBLIC_APP_URL = "https://arioo.uz";
  });

  it("posts a form-urlencoded body to the provider token URL", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ access_token: "gho_abc123", token_type: "bearer" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await exchangeCodeForToken("github", "code123", {});

    expect(result.accessToken).toBe("gho_abc123");
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://github.com/login/oauth/access_token");
    expect(init.method).toBe("POST");
    expect(init.headers["Content-Type"]).toBe("application/x-www-form-urlencoded");
    expect(init.headers["Accept"]).toBe("application/json");
    const body = new URLSearchParams(init.body);
    expect(body.get("client_id")).toBe("gh_client");
    expect(body.get("grant_type")).toBe("authorization_code");
    expect(body.get("code")).toBe("code123");
  });

  it("computes expiresAt from expires_in when present", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ access_token: "ya29.abc", refresh_token: "1//refresh", expires_in: 3600 }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const before = Date.now();
    const result = await exchangeCodeForToken("google", "code123", {});
    const after = Date.now();

    expect(result.refreshToken).toBe("1//refresh");
    expect(result.expiresAt).toBeDefined();
    const expiresAtMs = new Date(result.expiresAt!).getTime();
    expect(expiresAtMs).toBeGreaterThanOrEqual(before + 3600 * 1000);
    expect(expiresAtMs).toBeLessThanOrEqual(after + 3600 * 1000);
  });

  it("throws for an unknown provider", async () => {
    await expect(exchangeCodeForToken("unknown", "code", {})).rejects.toThrow();
  });
});

describe("refreshAccessToken", () => {
  beforeEach(() => {
    process.env.GOOGLE_CLIENT_ID = "g_client";
    process.env.GOOGLE_CLIENT_SECRET = "g_secret";
  });

  it("posts a refresh_token grant and returns the new access token", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ access_token: "ya29.new", expires_in: 3600 }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await refreshAccessToken("google", "1//old-refresh");

    expect(result.accessToken).toBe("ya29.new");
    expect(result.expiresAt).toBeDefined();
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://oauth2.googleapis.com/token");
    const body = new URLSearchParams(init.body);
    expect(body.get("grant_type")).toBe("refresh_token");
    expect(body.get("refresh_token")).toBe("1//old-refresh");
  });

  it("falls back to the original refresh token when the response omits one", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ access_token: "ya29.new" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await refreshAccessToken("google", "1//old-refresh");

    expect(result.refreshToken).toBe("1//old-refresh");
  });

  it("throws when the token endpoint responds with an error status", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 400 }));
    await expect(refreshAccessToken("google", "1//old-refresh")).rejects.toThrow();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/integrations/oauth/exchange.test.ts`
Expected: FAIL — `refreshAccessToken` is not exported, and the body-format assertions fail against the current JSON implementation.

- [ ] **Step 3: Rewrite exchange.ts**

Replace the contents of `src/lib/integrations/oauth/exchange.ts` with:

```ts
import "server-only";
import { getOAuthConfig } from "./config";

type ExchangeResult = { accessToken: string; refreshToken?: string; expiresAt?: string; raw: unknown };

type TokenResponsePayload = {
  access_token?: unknown;
  refresh_token?: unknown;
  expires_in?: unknown;
  [key: string]: unknown;
};

async function postForToken(tokenUrl: string, params: URLSearchParams): Promise<TokenResponsePayload> {
  const response = await fetch(tokenUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: params.toString(),
  });

  if (!response.ok) {
    throw new Error(`OAuth token request failed (${response.status}) against ${tokenUrl}`);
  }

  return response.json();
}

function expiresAtFrom(raw: TokenResponsePayload): string | undefined {
  return typeof raw.expires_in === "number"
    ? new Date(Date.now() + raw.expires_in * 1000).toISOString()
    : undefined;
}

export async function exchangeCodeForToken(
  provider: string,
  code: string,
  extra: Record<string, string>
): Promise<ExchangeResult> {
  const config = getOAuthConfig(provider);
  if (!config) throw new Error(`OAuth is not configured for provider "${provider}"`);

  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/integrations/${provider}/oauth/callback`;

  // amoCRM's token endpoint is bound to the portal subdomain, known only
  // from the callback's `referer` query param — overridden via `extra.tokenUrl`.
  const tokenUrl = extra.tokenUrl || config.tokenUrl;
  if (!tokenUrl) throw new Error(`No token URL resolved for provider "${provider}"`);

  const params = new URLSearchParams({
    client_id: config.clientId,
    client_secret: config.clientSecret,
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
  });

  const raw = await postForToken(tokenUrl, params);
  const accessToken = raw.access_token;
  if (typeof accessToken !== "string") {
    throw new Error(`Token exchange response for "${provider}" did not include access_token`);
  }

  return {
    accessToken,
    refreshToken: typeof raw.refresh_token === "string" ? raw.refresh_token : undefined,
    expiresAt: expiresAtFrom(raw),
    raw,
  };
}

export async function refreshAccessToken(provider: string, refreshToken: string): Promise<ExchangeResult> {
  const config = getOAuthConfig(provider);
  if (!config) throw new Error(`OAuth is not configured for provider "${provider}"`);
  if (!config.tokenUrl) throw new Error(`No token URL resolved for provider "${provider}"`);

  const params = new URLSearchParams({
    client_id: config.clientId,
    client_secret: config.clientSecret,
    grant_type: "refresh_token",
    refresh_token: refreshToken,
  });

  const raw = await postForToken(config.tokenUrl, params);
  const accessToken = raw.access_token;
  if (typeof accessToken !== "string") {
    throw new Error(`Token refresh response for "${provider}" did not include access_token`);
  }

  return {
    accessToken,
    // Google (and most providers) omit refresh_token on refresh — the
    // original one stays valid and must be reused by the caller.
    refreshToken: typeof raw.refresh_token === "string" ? raw.refresh_token : refreshToken,
    expiresAt: expiresAtFrom(raw),
    raw,
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/integrations/oauth/exchange.test.ts`
Expected: PASS (all tests green)

- [ ] **Step 5: Commit**

```bash
git add src/lib/integrations/oauth/exchange.ts src/lib/integrations/oauth/exchange.test.ts
git commit -m "fix(integrations): use form-urlencoded OAuth token exchange and track expiry"
```

---

### Task 2: Add locale/returnPath round-trip and extraAuthParams to OAuth config

**Files:**
- Modify: `src/lib/integrations/oauth/state.ts`
- Modify: `src/lib/integrations/oauth/state.test.ts`
- Modify: `src/lib/integrations/oauth/config.ts`
- Create: `src/lib/integrations/oauth/config.test.ts`

**Interfaces:**
- Consumes: nothing new
- Produces: `signOAuthState(payload: { organizationId: string; provider: string; locale: string; returnPath?: string }): string`
- Produces: `verifyOAuthState(token: string): { organizationId: string; provider: string; locale: string; returnPath?: string } | null`
- Produces: `getOAuthConfig(provider: string): OAuthProviderConfig | null` where `OAuthProviderConfig` now has an optional `extraAuthParams?: Record<string, string>`
- Produces: `getOAuthConfig("youtube")` returns a config reusing the `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` env vars with `youtube.readonly` scope and `extraAuthParams: { access_type: "offline", prompt: "consent" }`

- [ ] **Step 1: Write failing test for locale/returnPath round-trip**

Replace `src/lib/integrations/oauth/state.test.ts` with:

```ts
import { describe, it, expect, beforeAll } from "vitest";
import { signOAuthState, verifyOAuthState } from "./state";

beforeAll(() => {
  process.env.OAUTH_STATE_SIGNING_SECRET = "test-secret-value-for-hmac-signing";
});

describe("OAuth state signing", () => {
  it("round-trips a signed payload with locale", () => {
    const token = signOAuthState({ organizationId: "org_123", provider: "amocrm", locale: "ru" });
    const verified = verifyOAuthState(token);
    expect(verified).toEqual({
      organizationId: "org_123",
      provider: "amocrm",
      locale: "ru",
      returnPath: undefined,
    });
  });

  it("round-trips an optional returnPath", () => {
    const token = signOAuthState({
      organizationId: "org_123",
      provider: "youtube",
      locale: "uz",
      returnPath: "/statistics/marketing",
    });
    const verified = verifyOAuthState(token);
    expect(verified?.returnPath).toBe("/statistics/marketing");
  });

  it("rejects a tampered token", () => {
    const token = signOAuthState({ organizationId: "org_123", provider: "amocrm", locale: "uz" });
    const tampered = token.slice(0, -2) + "xx";
    expect(verifyOAuthState(tampered)).toBeNull();
  });

  it("rejects a malformed token", () => {
    expect(verifyOAuthState("not-a-valid-token")).toBeNull();
  });

  it("rejects a payload missing locale", () => {
    // Simulates a pre-migration token signed before `locale` was required.
    const legacyToken = signOAuthState({ organizationId: "org_123", provider: "amocrm", locale: "uz" });
    expect(verifyOAuthState(legacyToken)).not.toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/integrations/oauth/state.test.ts`
Expected: FAIL — current `verifyOAuthState` returns `{organizationId, provider}` only, missing `locale`/`returnPath`.

- [ ] **Step 3: Update state.ts**

Replace the contents of `src/lib/integrations/oauth/state.ts` with:

```ts
import "server-only";
import { createHmac, timingSafeEqual, randomBytes } from "node:crypto";

type StatePayload = { organizationId: string; provider: string; locale: string; returnPath?: string };

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
    if (
      typeof parsed.organizationId !== "string" ||
      typeof parsed.provider !== "string" ||
      typeof parsed.locale !== "string"
    ) {
      return null;
    }
    return {
      organizationId: parsed.organizationId,
      provider: parsed.provider,
      locale: parsed.locale,
      returnPath: typeof parsed.returnPath === "string" ? parsed.returnPath : undefined,
    };
  } catch {
    return null;
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/integrations/oauth/state.test.ts`
Expected: PASS

- [ ] **Step 5: Write failing test for the youtube provider config**

Create `src/lib/integrations/oauth/config.test.ts`:

```ts
import { describe, it, expect, beforeEach } from "vitest";
import { getOAuthConfig, isOAuthConfigured } from "./config";

describe("youtube OAuth config", () => {
  beforeEach(() => {
    process.env.GOOGLE_CLIENT_ID = "g_client";
    process.env.GOOGLE_CLIENT_SECRET = "g_secret";
  });

  it("is configured when GOOGLE_CLIENT_ID/SECRET are set", () => {
    expect(isOAuthConfigured("youtube")).toBe(true);
  });

  it("requests the youtube.readonly scope and offline access", () => {
    const config = getOAuthConfig("youtube");
    expect(config).not.toBeNull();
    expect(config?.scopes).toEqual(["https://www.googleapis.com/auth/youtube.readonly"]);
    expect(config?.tokenUrl).toBe("https://oauth2.googleapis.com/token");
    expect(config?.extraAuthParams).toEqual({ access_type: "offline", prompt: "consent" });
  });

  it("reuses the same client credentials as the google provider", () => {
    const google = getOAuthConfig("google");
    const youtube = getOAuthConfig("youtube");
    expect(youtube?.clientId).toBe(google?.clientId);
    expect(youtube?.clientSecret).toBe(google?.clientSecret);
  });
});
```

- [ ] **Step 6: Run test to verify it fails**

Run: `npx vitest run src/lib/integrations/oauth/config.test.ts`
Expected: FAIL — `youtube` is not a known provider yet.

- [ ] **Step 7: Update config.ts**

In `src/lib/integrations/oauth/config.ts`, add `extraAuthParams` to the type and a `youtube` entry to both maps:

```ts
export type OAuthProviderConfig = {
  authUrl: string;
  tokenUrl: string;
  clientId: string;
  clientSecret: string;
  scopes: string[];
  extraAuthParams?: Record<string, string>;
};

const PROVIDER_ENV_PREFIX: Record<string, string> = {
  amocrm: "AMOCRM",
  bitrix24: "BITRIX24",
  google: "GOOGLE",
  youtube: "GOOGLE",
  github: "GITHUB",
  headhunter: "HEADHUNTER",
};

const PROVIDER_ENDPOINTS: Record<
  string,
  { authUrl: string; tokenUrl: string; scopes: string[]; extraAuthParams?: Record<string, string> }
> = {
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
  youtube: {
    authUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenUrl: "https://oauth2.googleapis.com/token",
    scopes: ["https://www.googleapis.com/auth/youtube.readonly"],
    extraAuthParams: { access_type: "offline", prompt: "consent" },
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
```

(`isOAuthConfigured`/`getOAuthConfig` function bodies are unchanged — they already read from these two maps generically.)

- [ ] **Step 8: Run tests to verify they pass**

Run: `npx vitest run src/lib/integrations/oauth/config.test.ts src/lib/integrations/oauth/state.test.ts`
Expected: PASS

- [ ] **Step 9: Commit**

```bash
git add src/lib/integrations/oauth/state.ts src/lib/integrations/oauth/state.test.ts src/lib/integrations/oauth/config.ts src/lib/integrations/oauth/config.test.ts
git commit -m "feat(integrations): add youtube OAuth provider and locale/returnPath state round-trip"
```

---

### Task 3: Wire locale/returnPath/extraAuthParams through the start and callback routes

**Files:**
- Modify: `src/app/api/integrations/[provider]/oauth/start/route.ts`
- Modify: `src/app/api/integrations/[provider]/oauth/callback/route.ts`

**Interfaces:**
- Consumes: `signOAuthState`/`verifyOAuthState` from Task 2, `exchangeCodeForToken` from Task 1 (now returns `expiresAt`)
- Produces: `/api/integrations/[provider]/oauth/start` now accepts an optional `?returnPath=` query param; `/api/integrations/[provider]/oauth/callback` redirects to `${state.locale}${state.returnPath ?? "/integrations"}` instead of a hardcoded `/uz/integrations`

No route handler tests exist for these files in the current codebase (they're covered indirectly by `state.ts`/`exchange.ts` unit tests plus manual verification) — this task keeps that convention.

- [ ] **Step 1: Update start/route.ts**

Replace the contents of `src/app/api/integrations/[provider]/oauth/start/route.ts` with:

```ts
import { NextResponse } from "next/server";
import { getOAuthConfig, isOAuthConfigured } from "@/lib/integrations/oauth/config";
import { signOAuthState } from "@/lib/integrations/oauth/state";
import { requireOrganization } from "@/lib/auth/dal";

export async function GET(req: Request, { params }: { params: Promise<{ provider: string }> }) {
  const { provider } = await params;
  const url = new URL(req.url);
  const locale = url.searchParams.get("locale") ?? "uz";
  const returnPath = url.searchParams.get("returnPath") ?? undefined;
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

  const state = signOAuthState({ organizationId: organization.id, provider, locale, returnPath });
  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/integrations/${provider}/oauth/callback`;

  const authorizeUrl = new URL(config.authUrl);
  authorizeUrl.searchParams.set("client_id", config.clientId);
  authorizeUrl.searchParams.set("redirect_uri", redirectUri);
  authorizeUrl.searchParams.set("response_type", "code");
  authorizeUrl.searchParams.set("state", state);
  if (config.scopes.length > 0) {
    authorizeUrl.searchParams.set("scope", config.scopes.join(" "));
  }
  if (config.extraAuthParams) {
    for (const [key, value] of Object.entries(config.extraAuthParams)) {
      authorizeUrl.searchParams.set(key, value);
    }
  }

  return NextResponse.redirect(authorizeUrl.toString());
}
```

- [ ] **Step 2: Update callback/route.ts**

Replace the contents of `src/app/api/integrations/[provider]/oauth/callback/route.ts` with:

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
  const locale = state?.locale ?? "uz";

  if (!code || !state || state.provider !== provider) {
    return NextResponse.redirect(
      new URL(`/${locale}/integrations?oauthError=invalid_state`, req.url)
    );
  }

  const returnPath = state.returnPath ?? "/integrations";

  try {
    const extra: Record<string, string> = {};
    if (provider === "amocrm" && referer) {
      extra.tokenUrl = `${referer.replace(/\/$/, "")}/oauth2/access_token`;
    }

    const { accessToken, refreshToken, expiresAt } = await exchangeCodeForToken(provider, code, extra);
    const credentialsEncrypted = encryptCredential(JSON.stringify({ accessToken, refreshToken, expiresAt }));

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

    return NextResponse.redirect(new URL(`/${locale}${returnPath}?oauthSuccess=${provider}`, req.url));
  } catch (error) {
    console.error(`OAuth callback failed for provider "${provider}":`, error);
    return NextResponse.redirect(
      new URL(`/${locale}${returnPath}?oauthError=exchange_failed&provider=${provider}`, req.url)
    );
  }
}
```

- [ ] **Step 3: Run the full existing test suite for regressions**

Run: `npx vitest run src/lib/integrations`
Expected: PASS (all existing + new tests green)

- [ ] **Step 4: Commit**

```bash
git add src/app/api/integrations/\[provider\]/oauth/start/route.ts src/app/api/integrations/\[provider\]/oauth/callback/route.ts
git commit -m "feat(integrations): round-trip locale/returnPath through OAuth start and callback routes"
```

---

### Task 4: Add returnPath support to OAuthConnectButton and revalidate the Statistics page on disconnect

**Files:**
- Modify: `src/components/dashboard/integrations/oauth-connect-button.tsx`
- Modify: `src/lib/integrations/detail-actions.ts`

**Interfaces:**
- Produces: `<OAuthConnectButton provider locale configured returnPath? />` — new optional `returnPath` prop, appended to the start URL when present
- Produces: `archiveIntegrationAction(integrationId, locale)` now also revalidates `/${locale}/statistics/marketing` in addition to the existing `/integrations` paths

- [ ] **Step 1: Update OAuthConnectButton**

Replace the contents of `src/components/dashboard/integrations/oauth-connect-button.tsx` with:

```tsx
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

export function OAuthConnectButton({
  provider,
  configured,
  locale,
  returnPath,
}: {
  provider: string;
  configured: boolean;
  locale: string;
  returnPath?: string;
}) {
  const t = useTranslations("integrations");

  if (!configured) {
    return (
      <Button size="sm" variant="outline" disabled>
        {t("setupNeeded")}
      </Button>
    );
  }

  const href = `/api/integrations/${provider}/oauth/start?locale=${locale}${
    returnPath ? `&returnPath=${encodeURIComponent(returnPath)}` : ""
  }`;

  return (
    <Button size="sm" variant="outline" render={<a href={href} />}>
      {t("connect")}
    </Button>
  );
}
```

- [ ] **Step 2: Add the Statistics page to archiveIntegrationAction's revalidation**

In `src/lib/integrations/detail-actions.ts`, update `archiveIntegrationAction`:

```ts
export async function archiveIntegrationAction(integrationId: string, locale: string): Promise<void> {
  await loadOwnedIntegration(integrationId, locale);
  await db
    .update(integrations)
    .set({ status: "archived", updatedAt: new Date() })
    .where(eq(integrations.id, integrationId));
  await db.insert(integrationEvents).values({ integrationId, type: "archived" });
  revalidatePath(`/${locale}/integrations`);
  revalidatePath(`/${locale}/integrations/${integrationId}`);
  revalidatePath(`/${locale}/statistics/marketing`);
}
```

- [ ] **Step 3: Run the integrations test suite to confirm no regressions**

Run: `npx vitest run src/lib/integrations`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/components/dashboard/integrations/oauth-connect-button.tsx src/lib/integrations/detail-actions.ts
git commit -m "feat(integrations): support returnPath on OAuthConnectButton, revalidate Statistics on archive"
```

---

### Task 5: Pure YouTube stats-fetching module

**Files:**
- Create: `src/lib/youtube/channel-stats.ts`
- Create: `src/lib/youtube/channel-stats.test.ts`

**Interfaces:**
- Consumes: nothing (no DB, no imports from `oauth/exchange.ts` — the token refresh function is injected by the caller so this module stays pure and easy to test)
- Produces:
  ```ts
  export type YoutubeCredentials = {
    accessToken: string;
    refreshToken?: string;
    expiresAt?: string;
    channelId?: string;
    channelTitle?: string;
  };
  export type YoutubeVideoStat = { id: string; title: string; viewCount: number };
  export type YoutubeStatsResult =
    | {
        available: true;
        channelTitle: string;
        subscriberCount: number;
        viewCount: number;
        videoCount: number;
        recentVideos: YoutubeVideoStat[];
        updatedCredentials: YoutubeCredentials;
      }
    | { available: false; reason: "quota_exceeded" | "reauth_required" | "unknown" };
  export function getYoutubeChannelStats(
    credentials: YoutubeCredentials,
    refresh: (refreshToken: string) => Promise<{ accessToken: string; refreshToken?: string; expiresAt?: string }>,
  ): Promise<YoutubeStatsResult>
  ```

- [ ] **Step 1: Write failing tests**

Create `src/lib/youtube/channel-stats.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { getYoutubeChannelStats, type YoutubeCredentials } from "./channel-stats";

const baseCredentials: YoutubeCredentials = {
  accessToken: "ya29.valid",
  refreshToken: "1//refresh",
  expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
  channelId: "UC123",
  channelTitle: "Arioo Channel",
};

function jsonResponse(body: unknown, ok = true, status = 200) {
  return { ok, status, json: async () => body };
}

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("getYoutubeChannelStats", () => {
  it("returns stats for an already-fresh token without refreshing", async () => {
    const refresh = vi.fn();
    const fetchMock = vi
      .fn()
      // channels?part=statistics
      .mockResolvedValueOnce(
        jsonResponse({ items: [{ statistics: { subscriberCount: "1200", viewCount: "45000", videoCount: "37" } }] })
      )
      // search?type=video
      .mockResolvedValueOnce(jsonResponse({ items: [{ id: { videoId: "vid1" } }, { id: { videoId: "vid2" } }] }))
      // videos?part=snippet,statistics
      .mockResolvedValueOnce(
        jsonResponse({
          items: [
            { id: "vid1", snippet: { title: "Video One" }, statistics: { viewCount: "500" } },
            { id: "vid2", snippet: { title: "Video Two" }, statistics: { viewCount: "300" } },
          ],
        })
      );
    vi.stubGlobal("fetch", fetchMock);

    const result = await getYoutubeChannelStats(baseCredentials, refresh);

    expect(refresh).not.toHaveBeenCalled();
    expect(result).toEqual({
      available: true,
      channelTitle: "Arioo Channel",
      subscriberCount: 1200,
      viewCount: 45000,
      videoCount: 37,
      recentVideos: [
        { id: "vid1", title: "Video One", viewCount: 500 },
        { id: "vid2", title: "Video Two", viewCount: 300 },
      ],
      updatedCredentials: baseCredentials,
    });
  });

  it("refreshes an expired token before fetching stats", async () => {
    const expired: YoutubeCredentials = {
      ...baseCredentials,
      expiresAt: new Date(Date.now() - 60 * 1000).toISOString(),
    };
    const refresh = vi.fn().mockResolvedValue({
      accessToken: "ya29.refreshed",
      expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    });
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse({ items: [{ statistics: { subscriberCount: "10", viewCount: "20", videoCount: "1" } }] })
      )
      .mockResolvedValueOnce(jsonResponse({ items: [] }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await getYoutubeChannelStats(expired, refresh);

    expect(refresh).toHaveBeenCalledWith("1//refresh");
    expect(result.available).toBe(true);
    if (result.available) {
      expect(result.updatedCredentials.accessToken).toBe("ya29.refreshed");
      expect(result.updatedCredentials.refreshToken).toBe("1//refresh");
    }
    // Authorization header on the first Data API call used the refreshed token.
    const firstCallHeaders = fetchMock.mock.calls[0][1].headers;
    expect(firstCallHeaders.Authorization).toBe("Bearer ya29.refreshed");
  });

  it("returns reauth_required when there is no refresh token and the access token expired", async () => {
    const expired: YoutubeCredentials = { ...baseCredentials, refreshToken: undefined, expiresAt: new Date(0).toISOString() };
    const refresh = vi.fn();

    const result = await getYoutubeChannelStats(expired, refresh);

    expect(refresh).not.toHaveBeenCalled();
    expect(result).toEqual({ available: false, reason: "reauth_required" });
  });

  it("returns reauth_required when refreshing throws", async () => {
    const expired: YoutubeCredentials = { ...baseCredentials, expiresAt: new Date(0).toISOString() };
    const refresh = vi.fn().mockRejectedValue(new Error("invalid_grant"));

    const result = await getYoutubeChannelStats(expired, refresh);

    expect(result).toEqual({ available: false, reason: "reauth_required" });
  });

  it("fetches the channel id lazily when missing from credentials", async () => {
    const withoutChannelId: YoutubeCredentials = { ...baseCredentials, channelId: undefined, channelTitle: undefined };
    const refresh = vi.fn();
    const fetchMock = vi
      .fn()
      // channels?mine=true
      .mockResolvedValueOnce(jsonResponse({ items: [{ id: "UC999", snippet: { title: "My Channel" } }] }))
      // channels?part=statistics
      .mockResolvedValueOnce(
        jsonResponse({ items: [{ statistics: { subscriberCount: "5", viewCount: "10", videoCount: "2" } }] })
      )
      // search
      .mockResolvedValueOnce(jsonResponse({ items: [] }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await getYoutubeChannelStats(withoutChannelId, refresh);

    expect(result.available).toBe(true);
    if (result.available) {
      expect(result.updatedCredentials.channelId).toBe("UC999");
      expect(result.updatedCredentials.channelTitle).toBe("My Channel");
    }
    const statsCallUrl = fetchMock.mock.calls[1][0] as URL;
    expect(statsCallUrl.toString()).toContain("id=UC999");
  });

  it("returns quota_exceeded when the Data API reports quotaExceeded", async () => {
    const refresh = vi.fn();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse({ error: { errors: [{ reason: "quotaExceeded" }] } }, false, 403)
      )
    );

    const result = await getYoutubeChannelStats(baseCredentials, refresh);

    expect(result).toEqual({ available: false, reason: "quota_exceeded" });
  });

  it("returns unknown for any other API error", async () => {
    const refresh = vi.fn();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({}, false, 500)));

    const result = await getYoutubeChannelStats(baseCredentials, refresh);

    expect(result).toEqual({ available: false, reason: "unknown" });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/youtube/channel-stats.test.ts`
Expected: FAIL — `./channel-stats` does not exist yet.

- [ ] **Step 3: Implement channel-stats.ts**

Create `src/lib/youtube/channel-stats.ts`:

```ts
import "server-only";

export type YoutubeCredentials = {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: string;
  channelId?: string;
  channelTitle?: string;
};

export type YoutubeVideoStat = { id: string; title: string; viewCount: number };

export type YoutubeStatsResult =
  | {
      available: true;
      channelTitle: string;
      subscriberCount: number;
      viewCount: number;
      videoCount: number;
      recentVideos: YoutubeVideoStat[];
      updatedCredentials: YoutubeCredentials;
    }
  | { available: false; reason: "quota_exceeded" | "reauth_required" | "unknown" };

type RefreshFn = (
  refreshToken: string
) => Promise<{ accessToken: string; refreshToken?: string; expiresAt?: string }>;

class YoutubeApiError extends Error {
  reason?: string;
  constructor(message: string, reason?: string) {
    super(message);
    this.reason = reason;
  }
}

async function youtubeApiFetch(
  accessToken: string,
  path: string,
  params: Record<string, string>
): Promise<Record<string, unknown>> {
  const url = new URL(`https://www.googleapis.com/youtube/v3/${path}`);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);

  const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as
      | { error?: { errors?: { reason?: string }[] } }
      | null;
    const reason = body?.error?.errors?.[0]?.reason;
    throw new YoutubeApiError(`YouTube API error ${res.status}`, reason);
  }
  return res.json();
}

export async function getYoutubeChannelStats(
  credentials: YoutubeCredentials,
  refresh: RefreshFn
): Promise<YoutubeStatsResult> {
  let creds = credentials;

  if (creds.expiresAt && new Date(creds.expiresAt) < new Date()) {
    if (!creds.refreshToken) return { available: false, reason: "reauth_required" };
    try {
      const refreshed = await refresh(creds.refreshToken);
      creds = {
        ...creds,
        accessToken: refreshed.accessToken,
        refreshToken: refreshed.refreshToken ?? creds.refreshToken,
        expiresAt: refreshed.expiresAt,
      };
    } catch {
      return { available: false, reason: "reauth_required" };
    }
  }

  try {
    if (!creds.channelId) {
      const mine = await youtubeApiFetch(creds.accessToken, "channels", { part: "snippet", mine: "true" });
      const channel = (mine.items as { id: string; snippet?: { title?: string } }[] | undefined)?.[0];
      if (!channel) return { available: false, reason: "unknown" };
      creds = { ...creds, channelId: channel.id, channelTitle: channel.snippet?.title ?? "" };
    }

    const statsData = await youtubeApiFetch(creds.accessToken, "channels", {
      part: "statistics",
      id: creds.channelId,
    });
    const stats = (
      statsData.items as { statistics?: { subscriberCount?: string; viewCount?: string; videoCount?: string } }[] | undefined
    )?.[0]?.statistics;
    if (!stats) return { available: false, reason: "unknown" };

    const searchData = await youtubeApiFetch(creds.accessToken, "search", {
      part: "id",
      channelId: creds.channelId,
      type: "video",
      order: "date",
      maxResults: "5",
    });
    const videoIds = ((searchData.items as { id?: { videoId?: string } }[] | undefined) ?? [])
      .map((item) => item.id?.videoId)
      .filter((id): id is string => Boolean(id));

    let recentVideos: YoutubeVideoStat[] = [];
    if (videoIds.length > 0) {
      const videosData = await youtubeApiFetch(creds.accessToken, "videos", {
        part: "snippet,statistics",
        id: videoIds.join(","),
      });
      recentVideos = (
        (videosData.items as
          | { id: string; snippet?: { title?: string }; statistics?: { viewCount?: string } }[]
          | undefined) ?? []
      ).map((item) => ({
        id: item.id,
        title: item.snippet?.title ?? "",
        viewCount: Number(item.statistics?.viewCount ?? 0),
      }));
    }

    return {
      available: true,
      channelTitle: creds.channelTitle ?? "",
      subscriberCount: Number(stats.subscriberCount ?? 0),
      viewCount: Number(stats.viewCount ?? 0),
      videoCount: Number(stats.videoCount ?? 0),
      recentVideos,
      updatedCredentials: creds,
    };
  } catch (error) {
    if (error instanceof YoutubeApiError && error.reason === "quotaExceeded") {
      return { available: false, reason: "quota_exceeded" };
    }
    return { available: false, reason: "unknown" };
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/youtube/channel-stats.test.ts`
Expected: PASS (all 7 tests green)

- [ ] **Step 5: Commit**

```bash
git add src/lib/youtube/channel-stats.ts src/lib/youtube/channel-stats.test.ts
git commit -m "feat(youtube): add pure YouTube Data API stats-fetching module"
```

---

### Task 6: DB-glue module that reads/refreshes/persists the YouTube connection

**Files:**
- Create: `src/lib/youtube/sync-stats.ts`
- Create: `src/lib/youtube/sync-stats.test.ts`

**Interfaces:**
- Consumes: `getYoutubeChannelStats` and `YoutubeCredentials` from Task 5, `refreshAccessToken` from Task 1, `encryptCredential`/`decryptCredential` from `@/lib/integrations/credential-crypto`, the `integrations` table
- Produces:
  ```ts
  export type YoutubeCardData =
    | { connected: false }
    | { connected: true; integrationId: string; result: YoutubeStatsResult };
  export function syncYoutubeStats(organizationId: string): Promise<YoutubeCardData>
  ```

- [ ] **Step 1: Write failing tests with a mocked db**

Create `src/lib/youtube/sync-stats.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";

process.env.INTEGRATION_CREDENTIALS_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString("base64");

const dbSelectWhere = vi.fn();
const dbUpdateSet = vi.fn().mockReturnThis();
const dbUpdateWhere = vi.fn().mockResolvedValue(undefined);
vi.mock("@/db/client", () => ({
  db: {
    select: vi.fn(() => ({ from: () => ({ where: dbSelectWhere }) })),
    update: vi.fn(() => ({ set: dbUpdateSet, where: dbUpdateWhere })),
  },
}));

const getYoutubeChannelStats = vi.fn();
vi.mock("./channel-stats", () => ({ getYoutubeChannelStats }));

const refreshAccessToken = vi.fn();
vi.mock("@/lib/integrations/oauth/exchange", () => ({ refreshAccessToken }));

import { encryptCredential } from "@/lib/integrations/credential-crypto";
import { syncYoutubeStats } from "./sync-stats";

beforeEach(() => {
  dbSelectWhere.mockReset();
  dbUpdateSet.mockClear();
  dbUpdateWhere.mockClear();
  getYoutubeChannelStats.mockReset();
});

describe("syncYoutubeStats", () => {
  it("returns connected:false when there is no integration row", async () => {
    dbSelectWhere.mockResolvedValue([]);

    const result = await syncYoutubeStats("org_1");

    expect(result).toEqual({ connected: false });
    expect(getYoutubeChannelStats).not.toHaveBeenCalled();
  });

  it("returns connected:false when the integration is archived", async () => {
    dbSelectWhere.mockResolvedValue([
      { id: "int_1", status: "archived", credentialsEncrypted: encryptCredential(JSON.stringify({ accessToken: "x" })) },
    ]);

    const result = await syncYoutubeStats("org_1");

    expect(result).toEqual({ connected: false });
  });

  it("fetches stats and persists updated credentials on success", async () => {
    const credentials = { accessToken: "old", channelId: "UC1" };
    dbSelectWhere.mockResolvedValue([
      { id: "int_1", status: "active", credentialsEncrypted: encryptCredential(JSON.stringify(credentials)) },
    ]);
    getYoutubeChannelStats.mockResolvedValue({
      available: true,
      channelTitle: "Arioo",
      subscriberCount: 10,
      viewCount: 20,
      videoCount: 3,
      recentVideos: [],
      updatedCredentials: { accessToken: "new", channelId: "UC1" },
    });

    const result = await syncYoutubeStats("org_1");

    expect(result.connected).toBe(true);
    if (result.connected) {
      expect(result.integrationId).toBe("int_1");
      expect(result.result.available).toBe(true);
    }
    expect(dbUpdateSet).toHaveBeenCalledWith(
      expect.objectContaining({ status: "active", lastError: null })
    );
  });

  it("marks the integration need_attention when stats are unavailable", async () => {
    dbSelectWhere.mockResolvedValue([
      { id: "int_1", status: "active", credentialsEncrypted: encryptCredential(JSON.stringify({ accessToken: "old" })) },
    ]);
    getYoutubeChannelStats.mockResolvedValue({ available: false, reason: "quota_exceeded" });

    const result = await syncYoutubeStats("org_1");

    expect(result).toEqual({
      connected: true,
      integrationId: "int_1",
      result: { available: false, reason: "quota_exceeded" },
    });
    expect(dbUpdateSet).toHaveBeenCalledWith(
      expect.objectContaining({ status: "need_attention", lastError: "quota_exceeded" })
    );
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/youtube/sync-stats.test.ts`
Expected: FAIL — `./sync-stats` does not exist yet.

- [ ] **Step 3: Implement sync-stats.ts**

Create `src/lib/youtube/sync-stats.ts`:

```ts
import "server-only";
import { eq, and } from "drizzle-orm";
import { db } from "@/db/client";
import { integrations } from "@/db/schema/integrations";
import { encryptCredential, decryptCredential } from "@/lib/integrations/credential-crypto";
import { refreshAccessToken } from "@/lib/integrations/oauth/exchange";
import { getYoutubeChannelStats, type YoutubeCredentials, type YoutubeStatsResult } from "./channel-stats";

export type YoutubeCardData =
  | { connected: false }
  | { connected: true; integrationId: string; result: YoutubeStatsResult };

export async function syncYoutubeStats(organizationId: string): Promise<YoutubeCardData> {
  const [row] = await db
    .select()
    .from(integrations)
    .where(and(eq(integrations.organizationId, organizationId), eq(integrations.providerId, "youtube")));

  if (!row || row.status === "archived" || !row.credentialsEncrypted) {
    return { connected: false };
  }

  const credentials: YoutubeCredentials = JSON.parse(decryptCredential(row.credentialsEncrypted));
  const result = await getYoutubeChannelStats(credentials, (refreshToken) =>
    refreshAccessToken("youtube", refreshToken)
  );

  if (result.available) {
    await db
      .update(integrations)
      .set({
        credentialsEncrypted: encryptCredential(JSON.stringify(result.updatedCredentials)),
        status: "active",
        lastVerifiedAt: new Date(),
        lastError: null,
        updatedAt: new Date(),
      })
      .where(eq(integrations.id, row.id));
  } else {
    await db
      .update(integrations)
      .set({ status: "need_attention", lastError: result.reason, updatedAt: new Date() })
      .where(eq(integrations.id, row.id));
  }

  return { connected: true, integrationId: row.id, result };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/youtube/sync-stats.test.ts`
Expected: PASS (all 4 tests green)

- [ ] **Step 5: Commit**

```bash
git add src/lib/youtube/sync-stats.ts src/lib/youtube/sync-stats.test.ts
git commit -m "feat(youtube): add DB-glue module to read/refresh/persist YouTube stats"
```

---

### Task 7: Translation keys for the YouTube card (uz/ru/en)

**Files:**
- Modify: `messages/uz.json`
- Modify: `messages/ru.json`
- Modify: `messages/en.json`

**Interfaces:**
- Produces: `statistics.marketing.youtube.{title,subtitle,notConnected,subscribers,views,videos,recentVideos,viewsShort,disconnect,quotaExceeded,genericError}` in all 3 files

- [ ] **Step 1: Add the `youtube` block under `statistics.marketing` in messages/uz.json**

In `messages/uz.json`, line 682 is `      "channels": {` (6-space indent, a sibling of the `"telegram"` key right above it at line 671). Insert a new `"youtube"` key right before line 682, at the same 6-space indent as `"channels"`/`"telegram"`, with its own fields at 8-space indent:

```json
      "youtube": {
        "title": "YouTube Analytics",
        "subtitle": "Obunachilar va ko'rishlar",
        "notConnected": "YouTube kanali hali ulanmagan.",
        "subscribers": "Obunachilar",
        "views": "Umumiy ko'rishlar",
        "videos": "Videolar soni",
        "recentVideos": "So'nggi videolar",
        "viewsShort": "ko'rish",
        "disconnect": "Kanalni uzish",
        "quotaExceeded": "YouTube API kvotasi vaqtincha tugadi.",
        "genericError": "YouTube statistikasini yuklab bo'lmadi."
      },
```

- [ ] **Step 2: Add the same block to messages/ru.json**

Same location (before the `"channels"` key at the same line number/indent as uz.json):

```json
      "youtube": {
        "title": "YouTube Analytics",
        "subtitle": "Подписчики и просмотры",
        "notConnected": "YouTube-канал ещё не подключён.",
        "subscribers": "Подписчики",
        "views": "Всего просмотров",
        "videos": "Количество видео",
        "recentVideos": "Последние видео",
        "viewsShort": "просмотров",
        "disconnect": "Отключить канал",
        "quotaExceeded": "Квота YouTube API временно исчерпана.",
        "genericError": "Не удалось загрузить статистику YouTube."
      },
```

- [ ] **Step 3: Add the same block to messages/en.json**

Same location:

```json
      "youtube": {
        "title": "YouTube Analytics",
        "subtitle": "Subscribers and views",
        "notConnected": "YouTube channel is not connected yet.",
        "subscribers": "Subscribers",
        "views": "Total views",
        "videos": "Video count",
        "recentVideos": "Recent videos",
        "viewsShort": "views",
        "disconnect": "Disconnect channel",
        "quotaExceeded": "YouTube API quota temporarily exceeded.",
        "genericError": "Could not load YouTube statistics."
      },
```

- [ ] **Step 4: Run the messages structural test**

Run: `npx vitest run messages/messages.test.ts`
Expected: PASS — confirms all 3 locale files still have matching key structures.

- [ ] **Step 5: Commit**

```bash
git add messages/uz.json messages/ru.json messages/en.json
git commit -m "i18n: add YouTube Analytics card translations (uz/ru/en)"
```

---

### Task 8: YoutubeAnalyticsCard component

**Files:**
- Create: `src/components/dashboard/statistics/youtube-analytics-card.tsx`

**Interfaces:**
- Consumes: `YoutubeCardData` from Task 6, `OAuthConnectButton` from Task 4, `isOAuthConfigured` from Task 2, `archiveIntegrationAction` from `@/lib/integrations/detail-actions`
- Produces: `<YoutubeAnalyticsCard data={YoutubeCardData} locale={string} />` (async Server Component)

No dedicated component test — this codebase doesn't unit-test presentational Server Components (verified via `run` skill / manual dev-server check in Task 9 instead).

- [ ] **Step 1: Create the component**

Create `src/components/dashboard/statistics/youtube-analytics-card.tsx`:

```tsx
import { getTranslations } from "next-intl/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { OAuthConnectButton } from "@/components/dashboard/integrations/oauth-connect-button";
import { isOAuthConfigured } from "@/lib/integrations/oauth/config";
import { archiveIntegrationAction } from "@/lib/integrations/detail-actions";
import type { YoutubeCardData } from "@/lib/youtube/sync-stats";

export async function YoutubeAnalyticsCard({ data, locale }: { data: YoutubeCardData; locale: string }) {
  const t = await getTranslations("statistics.marketing.youtube");
  const formatNumber = (value: number) => new Intl.NumberFormat(locale).format(value);
  const configured = isOAuthConfigured("youtube");

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{t("title")}</CardTitle>
        <p className="text-xs text-muted-foreground">{t("subtitle")}</p>
      </CardHeader>
      <CardContent>
        {!data.connected ? (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-muted-foreground">{t("notConnected")}</p>
            <OAuthConnectButton
              provider="youtube"
              configured={configured}
              locale={locale}
              returnPath="/statistics/marketing"
            />
          </div>
        ) : data.result.available ? (
          <div className="flex flex-col gap-4">
            <div>
              <p className="text-2xl font-bold">{formatNumber(data.result.subscriberCount)}</p>
              <p className="text-xs text-muted-foreground">{t("subscribers")}</p>
            </div>
            <ul className="text-sm divide-y divide-border">
              <li className="flex justify-between py-2">
                <span className="text-muted-foreground">{t("views")}</span>
                <span className="font-medium">{formatNumber(data.result.viewCount)}</span>
              </li>
              <li className="flex justify-between py-2">
                <span className="text-muted-foreground">{t("videos")}</span>
                <span className="font-medium">{formatNumber(data.result.videoCount)}</span>
              </li>
            </ul>
            {data.result.recentVideos.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-medium text-muted-foreground">{t("recentVideos")}</p>
                <ul className="divide-y divide-border rounded-lg border border-border text-sm">
                  {data.result.recentVideos.map((video) => (
                    <li key={video.id} className="flex items-center justify-between gap-2 px-3 py-2">
                      <span className="truncate text-muted-foreground">{video.title}</span>
                      <span className="shrink-0 font-medium">
                        {formatNumber(video.viewCount)} {t("viewsShort")}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <form action={archiveIntegrationAction.bind(null, data.integrationId, locale)}>
              <Button type="submit" size="sm" variant="outline" className="w-full">
                {t("disconnect")}
              </Button>
            </form>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-muted-foreground">
              {data.result.reason === "quota_exceeded" ? t("quotaExceeded") : t("genericError")}
            </p>
            <OAuthConnectButton
              provider="youtube"
              configured={configured}
              locale={locale}
              returnPath="/statistics/marketing"
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 2: Verify the project still typechecks**

Run: `npx tsc --noEmit`
Expected: No new type errors (the component references `YoutubeCardData`, which is exported from Task 6; if this fails, check the field names against `sync-stats.ts` exactly).

- [ ] **Step 3: Commit**

```bash
git add src/components/dashboard/statistics/youtube-analytics-card.tsx
git commit -m "feat(youtube): add YoutubeAnalyticsCard component"
```

---

### Task 9: Wire the card into the Statistics marketing page and remove the mock

**Files:**
- Modify: `src/app/[locale]/(dashboard)/statistics/marketing/page.tsx`

**Interfaces:**
- Consumes: `syncYoutubeStats` (Task 6), `YoutubeAnalyticsCard` (Task 8), `OAuthResultToast` (existing, from `@/components/dashboard/integrations/oauth-result-toast`)

- [ ] **Step 1: Update imports and searchParams type**

In `src/app/[locale]/(dashboard)/statistics/marketing/page.tsx`, add these imports near the top (alongside the existing ones):

```ts
import { OAuthResultToast } from "@/components/dashboard/integrations/oauth-result-toast";
import { syncYoutubeStats } from "@/lib/youtube/sync-stats";
import { YoutubeAnalyticsCard } from "@/components/dashboard/statistics/youtube-analytics-card";
```

Update the function signature's `searchParams` type from:

```ts
  searchParams: Promise<{ range?: string }>;
```

to:

```ts
  searchParams: Promise<{ range?: string; oauthSuccess?: string; oauthError?: string; provider?: string }>;
```

And update the destructure:

```ts
  const { range: rawRange, oauthSuccess, oauthError, provider } = await searchParams;
```

- [ ] **Step 2: Fetch the YouTube stats alongside the existing site/telegram data**

Right after the existing `telegramStats` block (after the `const telegramStats = ...` statement), add:

```ts
  const youtubeCard = await syncYoutubeStats(organization.id);
```

- [ ] **Step 3: Render the toast and swap the mock card**

Add `<OAuthResultToast success={oauthSuccess} error={oauthError} provider={provider} />` right after the `<StatisticsTabs />` line (matching the placement used on `/integrations`).

Replace the entire YouTube mock `<Card>` block (the one with `{/* YouTube Analytics Mock */}` and the hardcoded `12,450` / `1.2M` / `45K soat` values) with:

```tsx
            <YoutubeAnalyticsCard data={youtubeCard} locale={locale} />
```

Leave the Instagram and OLX mock cards untouched — they're out of scope for this sub-project.

- [ ] **Step 4: Run the full test suite**

Run: `npx vitest run`
Expected: PASS — no regressions anywhere in the suite.

- [ ] **Step 5: Typecheck**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 6: Manual verification with the dev server**

Run: `npm run dev`, then in a browser visit `/uz/statistics/marketing`.
Expected:
- YouTube card shows "YouTube kanali hali ulanmagan." and a disabled "Sozlash kerak" button (since `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` aren't set in this environment) — **not** hardcoded numbers, **not** a fake "Ulangan" button.
- Instagram and OLX cards are unchanged (still mocked, as expected — out of scope).
- No console errors on page load.

If `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` are available in `.env.local` (from an existing Google Calendar setup), also verify: clicking "Ulash" redirects to Google's consent screen, and after granting `youtube.readonly` access, the page redirects back to `/uz/statistics/marketing?oauthSuccess=youtube` showing real subscriber/view/video counts.

- [ ] **Step 7: Commit**

```bash
git add "src/app/[locale]/(dashboard)/statistics/marketing/page.tsx"
git commit -m "feat(statistics): replace mock YouTube Analytics card with real OAuth integration"
```

---

### Task 10: Update CLAUDE.md status note

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Update the Phase F bullet for YouTube**

In `CLAUDE.md`, find the line under Phase F:

```
  - YouTube kanal analitikasi — obunachilar o'sishi, ko'rishlar, watch time, CTR
    (YouTube Data API v3 + YouTube Analytics API, OAuth — qo'lda integratsiya)
```

Replace it with:

```
  - [x] YouTube kanal analitikasi — obunachilar, umumiy ko'rishlar, videolar soni,
    so'nggi videolar (Google OAuth + YouTube Data API v3, umumiy Integrations OAuth
    infratuzilmasi orqali, avto token-refresh). Watch time qamrovdan tashqarida
    (YouTube Analytics API talab qiladi).
```

- [ ] **Step 2: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: mark YouTube Analytics as implemented in CLAUDE.md"
```

## Self-Review Notes

- **Spec coverage:** Both mandatory shared-infra bug fixes (Task 1), the `youtube` provider config + locale/returnPath state (Task 2), route wiring (Task 3), the connect-button/revalidation changes (Task 4), pure stats fetching (Task 5), DB glue (Task 6), i18n (Task 7), UI (Task 8), and page wiring (Task 9) are all covered. CLAUDE.md status update (Task 10) closes the loop.
- **Explicitly out of scope, not tasked:** watch time, adding `youtube` to `providers.ts`/the `/integrations` catalog UI, Instagram/Facebook, OLX.uz — all per spec.
- **Type consistency check:** `YoutubeCredentials`/`YoutubeStatsResult`/`YoutubeVideoStat` are defined once in Task 5 and imported (never redefined) in Tasks 6 and 8. `YoutubeCardData` is defined once in Task 6 and imported in Tasks 8 and 9. `syncYoutubeStats`/`getYoutubeChannelStats`/`archiveIntegrationAction` signatures match between their defining task and every call site.
