# Auth + Kabinet Skeleton Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build passwordless OAuth authentication (Google, Telegram Login, GitHub) with account linking and an active-sessions panel, plus the first-login organization-creation flow and a bo'sh (empty) dashboard shell — matching worken.ru's minimalist authenticated-panel structure but in TayanchAI's own brand and localized for Uzbekistan.

**Architecture:** Next.js App Router, `(auth)` and `(dashboard)` route groups nested under `[locale]`. No `next-auth`/Auth.js core package — `@auth/drizzle-adapter`'s `DrizzleAdapter` is used only as a typed CRUD layer (`createUser`, `linkAccount`, `createSession`, etc.) against Postgres tables shaped to its convention. All OAuth handshakes (Google, GitHub) and the Telegram Login HMAC bridge are custom-built on top of that adapter, sharing one `completeLogin()` core so sign-in and account-linking behave identically for all three providers. Sessions are DB-backed (not JWT) so the active-sessions panel can list and revoke them individually.

**Tech Stack:** Next.js 16 (App Router, Proxy not Middleware), TypeScript, Drizzle ORM, Neon Postgres (`@neondatabase/serverless`, `drizzle-orm/neon-http`), `@auth/drizzle-adapter`, Zod, next-intl, shadcn/ui `sidebar` primitive.

## Global Constraints

- All user-visible text in 3 locales: `uz` (default), `ru`, `en` — `messages/{locale}.json`.
- Next.js 16 uses `proxy.ts` (not `middleware.ts`) at `src/proxy.ts` — only one file, existing next-intl logic must be preserved, not replaced.
- Auth checks must happen close to the data (DAL pattern, `verifySession()`/`requireOrganization()`), never solely in a layout — layouts don't re-render on client-side navigation.
- No password/email/phone fields anywhere in the auth UI — OAuth only, per the approved spec.
- Follow existing code style: minimal comments (only for non-obvious "why"), Zod for all external input, `import "server-only"` on server-only modules that touch secrets, small focused files.
- Spec reference: `docs/superpowers/specs/2026-08-05-auth-cabinet-design.md`.

---

## File Structure

```
drizzle.config.ts                          # drizzle-kit config (new)
src/
  db/
    client.ts                               # Neon + Drizzle client (new)
    schema/
      auth.ts                               # users, accounts, sessions, verificationTokens (new)
      org.ts                                # organizations, memberships, invites (new)
      index.ts                              # re-exports (new)
  lib/
    auth/
      cookies.ts                            # session cookie name/options (new)
      dal.ts                                # getSession/verifySession/requireOrganization (new)
      session.ts                            # completeLogin/linkProvider/revokeSession (new)
      oauth/
        providers.ts                        # per-provider authorize-URL + token-exchange config (new)
        telegram.ts                         # Telegram Login HMAC verification (new)
      invites.ts                            # invite token create/validate (new)
  app/
    api/auth/
      [provider]/start/route.ts             # GET — redirect to provider authorize URL (new)
      [provider]/callback/route.ts          # GET — Google/GitHub OAuth callback (new)
      telegram/callback/route.ts            # POST — Telegram Login widget callback (new)
      signout/route.ts                      # POST — clears session (new)
    [locale]/
      (auth)/
        sign-in/page.tsx                    # (new)
        onboarding/page.tsx                 # (new)
        onboarding/actions.ts               # createOrganization server action (new)
      (dashboard)/
        layout.tsx                          # sidebar + topbar shell (new)
        dashboard/page.tsx                  # empty-state home (new)
        settings/
          accounts/page.tsx                 # (new)
          accounts/actions.ts               # startLinkFlow/unlinkAccount (new)
          sessions/page.tsx                 # (new)
          sessions/actions.ts               # revokeSession/revokeOtherSessions (new)
          team/page.tsx                     # (new)
          team/actions.ts                   # inviteMember/acceptInvite (new)
  components/
    auth/
      provider-buttons.tsx                  # Google/Telegram/GitHub sign-in buttons (new)
      telegram-login-widget.tsx             # client component wrapping Telegram's script (new)
    dashboard/
      sidebar-nav.tsx                       # (new)
      org-switcher.tsx                      # (new)
      user-menu.tsx                         # (new)
  proxy.ts                                  # MODIFY — add optimistic auth gate
messages/{uz,ru,en}.json                    # MODIFY — add `auth`, `onboarding`, `dashboard`, `settings` keys
.env.example                                # MODIFY — add DATABASE_URL, OAuth + Telegram env vars
tests/e2e/auth.spec.ts                      # (new)
```

---

### Task 1: Provision Neon Postgres and scaffold Drizzle

**Files:**
- Create: `drizzle.config.ts`
- Create: `src/db/client.ts`
- Modify: `.env.example`
- Modify: `package.json` (dependencies)

**Interfaces:**
- Produces: `db` (Drizzle client instance) from `src/db/client.ts`, imported by every later DB-touching module.

- [ ] **Step 1: Provision the Neon Postgres database**

Use the `neon:neon-postgres` skill (or `mcp__plugin_neon_neon__create_project` directly) to create a Neon project for this app if one doesn't already exist, then get its connection string via `mcp__plugin_neon_neon__get_connection_string`. Add it to `.env.local` (not committed) as `DATABASE_URL=postgresql://...`.

- [ ] **Step 2: Install dependencies**

```bash
npm install drizzle-orm @neondatabase/serverless @auth/drizzle-adapter
npm install -D drizzle-kit
```

- [ ] **Step 3: Add `DATABASE_URL` to `.env.example`**

```
TELEGRAM_BOT_TOKEN=
TELEGRAM_LEADS_CHAT_ID=
DATABASE_URL=
```

- [ ] **Step 4: Create the Drizzle client**

```ts
// src/db/client.ts
import "server-only";
import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import * as schema from "./schema";

const sql = neon(process.env.DATABASE_URL!);
export const db = drizzle(sql, { schema });
```

- [ ] **Step 5: Create `drizzle.config.ts`**

```ts
// drizzle.config.ts
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/db/schema/index.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
```

- [ ] **Step 6: Commit**

```bash
git add drizzle.config.ts src/db/client.ts .env.example package.json package-lock.json
git commit -m "chore: provision Neon Postgres and scaffold Drizzle client"
```

---

### Task 2: Auth data model (users, accounts, sessions, verification tokens)

**Files:**
- Create: `src/db/schema/auth.ts`
- Create: `src/db/schema/index.ts`

**Interfaces:**
- Consumes: nothing new (uses `drizzle-orm/pg-core`).
- Produces: `users`, `accounts`, `sessions`, `verificationTokens` tables, re-exported from `src/db/schema/index.ts`. Column shape matches `@auth/drizzle-adapter`'s expected Postgres schema exactly (required for `DrizzleAdapter(db, schema)` to work without a custom mapping).

- [ ] **Step 1: Write the schema**

```ts
// src/db/schema/auth.ts
import {
  pgTable,
  text,
  timestamp,
  integer,
  primaryKey,
} from "drizzle-orm/pg-core";

export const users = pgTable("user", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name"),
  email: text("email").unique(),
  emailVerified: timestamp("emailVerified", { mode: "date" }),
  image: text("image"),
  createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
});

export const accounts = pgTable(
  "account",
  {
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("providerAccountId").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (account) => [
    primaryKey({ columns: [account.provider, account.providerAccountId] }),
  ],
);

export const sessions = pgTable("session", {
  sessionToken: text("sessionToken").primaryKey(),
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
  userAgent: text("userAgent"),
  ipAddress: text("ipAddress"),
  lastActiveAt: timestamp("lastActiveAt", { mode: "date" }).notNull().defaultNow(),
  createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
});

export const verificationTokens = pgTable(
  "verificationToken",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (vt) => [primaryKey({ columns: [vt.identifier, vt.token] })],
);
```

- [ ] **Step 2: Create the schema barrel file**

```ts
// src/db/schema/index.ts
export * from "./auth";
export * from "./org";
```

(`./org` is created in Task 3 — this file is finished there; for now it will fail to compile, which is expected until Task 3 lands. If running this task standalone, temporarily comment out the `./org` line and restore it in Task 3 Step 1.)

- [ ] **Step 3: Commit**

```bash
git add src/db/schema/auth.ts src/db/schema/index.ts
git commit -m "feat: add Drizzle schema for users, accounts, sessions"
```

---

### Task 3: Organization data model (organizations, memberships, invites)

**Files:**
- Create: `src/db/schema/org.ts`
- Modify: `src/db/schema/index.ts` (restore the `./org` export if it was commented out in Task 2)

**Interfaces:**
- Consumes: `users` from `./auth`.
- Produces: `organizations`, `memberships`, `invites` tables.

- [ ] **Step 1: Write the schema**

```ts
// src/db/schema/org.ts
import { pgTable, text, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { users } from "./auth";

export const membershipRole = pgEnum("membership_role", [
  "owner",
  "admin",
  "member",
]);

export const inviteStatus = pgEnum("invite_status", [
  "pending",
  "accepted",
  "expired",
]);

export const organizations = pgTable("organization", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  industry: text("industry").notNull(),
  createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
});

export const memberships = pgTable("membership", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  organizationId: text("organizationId")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  role: membershipRole("role").notNull(),
  createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
});

export const invites = pgTable("invite", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  organizationId: text("organizationId")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  email: text("email").notNull(),
  token: text("token").notNull().unique(),
  role: membershipRole("role").notNull(),
  status: inviteStatus("status").notNull().default("pending"),
  invitedByUserId: text("invitedByUserId")
    .notNull()
    .references(() => users.id),
  createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
  expiresAt: timestamp("expiresAt", { mode: "date" }).notNull(),
});
```

- [ ] **Step 2: Push the schema to Neon**

```bash
npx drizzle-kit push
```

Expected: drizzle-kit reports the 7 new tables (`user`, `account`, `session`, `verificationToken`, `organization`, `membership`, `invite`) created with no conflicts.

- [ ] **Step 3: Commit**

```bash
git add src/db/schema/org.ts src/db/schema/index.ts
git commit -m "feat: add Drizzle schema for organizations, memberships, invites"
```

---

### Task 4: OAuth provider config (Google, GitHub) — authorize URL + token exchange

**Files:**
- Create: `src/lib/auth/oauth/providers.ts`
- Test: `src/lib/auth/oauth/providers.test.ts`
- Modify: `.env.example`

**Interfaces:**
- Produces:
  - `type ProviderId = "google" | "github"`
  - `buildAuthorizeUrl(provider: ProviderId, state: string, redirectUri: string): string`
  - `exchangeCodeForProfile(provider: ProviderId, code: string, redirectUri: string): Promise<{ providerAccountId: string; email: string | null; name: string | null; image: string | null } | null>` — returns `null` on any HTTP failure, never throws (same fail-soft convention as `sendLeadNotification`).

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/auth/oauth/providers.test.ts
import { afterEach, describe, expect, it, vi } from "vitest";
import { buildAuthorizeUrl, exchangeCodeForProfile } from "./providers";

describe("buildAuthorizeUrl", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("builds a Google authorize URL with client_id, redirect_uri and state", () => {
    vi.stubEnv("GOOGLE_CLIENT_ID", "google-client-id");
    const url = new URL(
      buildAuthorizeUrl("google", "abc123", "https://tayanchai.uz/api/auth/google/callback"),
    );
    expect(url.origin + url.pathname).toBe("https://accounts.google.com/o/oauth2/v2/auth");
    expect(url.searchParams.get("client_id")).toBe("google-client-id");
    expect(url.searchParams.get("redirect_uri")).toBe(
      "https://tayanchai.uz/api/auth/google/callback",
    );
    expect(url.searchParams.get("state")).toBe("abc123");
  });

  it("builds a GitHub authorize URL", () => {
    vi.stubEnv("GITHUB_CLIENT_ID", "github-client-id");
    const url = new URL(
      buildAuthorizeUrl("github", "xyz789", "https://tayanchai.uz/api/auth/github/callback"),
    );
    expect(url.origin + url.pathname).toBe("https://github.com/login/oauth/authorize");
    expect(url.searchParams.get("client_id")).toBe("github-client-id");
  });
});

describe("exchangeCodeForProfile", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("exchanges a Google code and returns a normalized profile", async () => {
    vi.stubEnv("GOOGLE_CLIENT_ID", "id");
    vi.stubEnv("GOOGLE_CLIENT_SECRET", "secret");
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ access_token: "tok" }) })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ sub: "g-123", email: "a@b.com", name: "Akbarali", picture: "http://img" }),
      });
    vi.stubGlobal("fetch", fetchMock);

    const profile = await exchangeCodeForProfile(
      "google",
      "the-code",
      "https://tayanchai.uz/api/auth/google/callback",
    );

    expect(profile).toEqual({
      providerAccountId: "g-123",
      email: "a@b.com",
      name: "Akbarali",
      image: "http://img",
    });
  });

  it("returns null when the token exchange fails", async () => {
    vi.stubEnv("GOOGLE_CLIENT_ID", "id");
    vi.stubEnv("GOOGLE_CLIENT_SECRET", "secret");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false }));

    const profile = await exchangeCodeForProfile("google", "bad-code", "https://x/callback");
    expect(profile).toBeNull();
  });

  it("returns null when fetch throws", async () => {
    vi.stubEnv("GOOGLE_CLIENT_ID", "id");
    vi.stubEnv("GOOGLE_CLIENT_SECRET", "secret");
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));

    const profile = await exchangeCodeForProfile("google", "code", "https://x/callback");
    expect(profile).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/auth/oauth/providers.test.ts`
Expected: FAIL — `providers.ts` does not exist yet.

- [ ] **Step 3: Implement**

```ts
// src/lib/auth/oauth/providers.ts
import "server-only";

export type ProviderId = "google" | "github";

export type OAuthProfile = {
  providerAccountId: string;
  email: string | null;
  name: string | null;
  image: string | null;
};

type ProviderConfig = {
  authorizeUrl: string;
  tokenUrl: string;
  profileUrl: string;
  scope: string;
  clientIdEnv: string;
  clientSecretEnv: string;
  mapProfile: (raw: Record<string, unknown>) => OAuthProfile;
};

const PROVIDERS: Record<ProviderId, ProviderConfig> = {
  google: {
    authorizeUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenUrl: "https://oauth2.googleapis.com/token",
    profileUrl: "https://openidconnect.googleapis.com/v1/userinfo",
    scope: "openid email profile",
    clientIdEnv: "GOOGLE_CLIENT_ID",
    clientSecretEnv: "GOOGLE_CLIENT_SECRET",
    mapProfile: (raw) => ({
      providerAccountId: String(raw.sub),
      email: (raw.email as string) ?? null,
      name: (raw.name as string) ?? null,
      image: (raw.picture as string) ?? null,
    }),
  },
  github: {
    authorizeUrl: "https://github.com/login/oauth/authorize",
    tokenUrl: "https://github.com/login/oauth/access_token",
    profileUrl: "https://api.github.com/user",
    scope: "read:user user:email",
    clientIdEnv: "GITHUB_CLIENT_ID",
    clientSecretEnv: "GITHUB_CLIENT_SECRET",
    mapProfile: (raw) => ({
      providerAccountId: String(raw.id),
      email: (raw.email as string) ?? null,
      name: (raw.name as string) ?? (raw.login as string) ?? null,
      image: (raw.avatar_url as string) ?? null,
    }),
  },
};

export function buildAuthorizeUrl(
  provider: ProviderId,
  state: string,
  redirectUri: string,
): string {
  const config = PROVIDERS[provider];
  const url = new URL(config.authorizeUrl);
  url.searchParams.set("client_id", process.env[config.clientIdEnv]!);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("state", state);
  url.searchParams.set("scope", config.scope);
  url.searchParams.set("response_type", "code");
  return url.toString();
}

export async function exchangeCodeForProfile(
  provider: ProviderId,
  code: string,
  redirectUri: string,
): Promise<OAuthProfile | null> {
  const config = PROVIDERS[provider];
  try {
    const tokenResponse = await fetch(config.tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        client_id: process.env[config.clientIdEnv],
        client_secret: process.env[config.clientSecretEnv],
        code,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });
    if (!tokenResponse.ok) return null;
    const tokenBody = (await tokenResponse.json()) as { access_token?: string };
    if (!tokenBody.access_token) return null;

    const profileResponse = await fetch(config.profileUrl, {
      headers: { Authorization: `Bearer ${tokenBody.access_token}` },
    });
    if (!profileResponse.ok) return null;
    const raw = (await profileResponse.json()) as Record<string, unknown>;
    return config.mapProfile(raw);
  } catch (error) {
    console.error(`OAuth exchange failed for ${provider}`, error);
    return null;
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/auth/oauth/providers.test.ts`
Expected: PASS (5 tests)

- [ ] **Step 5: Add OAuth client env vars to `.env.example`**

```
TELEGRAM_BOT_TOKEN=
TELEGRAM_LEADS_CHAT_ID=
DATABASE_URL=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
```

- [ ] **Step 6: Commit**

```bash
git add src/lib/auth/oauth/providers.ts src/lib/auth/oauth/providers.test.ts .env.example
git commit -m "feat: add Google/GitHub OAuth authorize-url and token-exchange helpers"
```

---

### Task 5: Telegram Login Widget HMAC verification

**Files:**
- Create: `src/lib/auth/oauth/telegram.ts`
- Test: `src/lib/auth/oauth/telegram.test.ts`
- Modify: `.env.example` (already has `TELEGRAM_BOT_TOKEN`, reused here)

**Interfaces:**
- Produces: `type TelegramAuthData = { id: string; first_name?: string; last_name?: string; username?: string; photo_url?: string; auth_date: string; hash: string }`, `verifyTelegramAuth(data: TelegramAuthData, botToken: string): boolean`, `isTelegramAuthFresh(data: TelegramAuthData, maxAgeSeconds: number): boolean`.

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/auth/oauth/telegram.test.ts
import { createHash, createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { isTelegramAuthFresh, verifyTelegramAuth } from "./telegram";

const BOT_TOKEN = "test-bot-token";

function signPayload(data: Record<string, string>) {
  const checkString = Object.keys(data)
    .filter((key) => key !== "hash")
    .sort()
    .map((key) => `${key}=${data[key]}`)
    .join("\n");
  const secretKey = createHash("sha256").update(BOT_TOKEN).digest();
  const hash = createHmac("sha256", secretKey).update(checkString).digest("hex");
  return { ...data, hash };
}

describe("verifyTelegramAuth", () => {
  it("accepts a correctly signed payload", () => {
    const data = signPayload({
      id: "123456",
      first_name: "Akbarali",
      auth_date: String(Math.floor(Date.now() / 1000)),
    });
    expect(verifyTelegramAuth(data, BOT_TOKEN)).toBe(true);
  });

  it("rejects a payload with a tampered field", () => {
    const data = signPayload({
      id: "123456",
      first_name: "Akbarali",
      auth_date: String(Math.floor(Date.now() / 1000)),
    });
    const tampered = { ...data, first_name: "Someone Else" };
    expect(verifyTelegramAuth(tampered, BOT_TOKEN)).toBe(false);
  });

  it("rejects a payload signed with a different bot token", () => {
    const data = signPayload({ id: "1", auth_date: "1700000000" });
    expect(verifyTelegramAuth(data, "different-token")).toBe(false);
  });
});

describe("isTelegramAuthFresh", () => {
  it("accepts an auth_date within the max age window", () => {
    const nowSeconds = Math.floor(Date.now() / 1000);
    expect(isTelegramAuthFresh({ auth_date: String(nowSeconds - 10) } as never, 86400)).toBe(true);
  });

  it("rejects an auth_date older than the max age window", () => {
    const nowSeconds = Math.floor(Date.now() / 1000);
    expect(isTelegramAuthFresh({ auth_date: String(nowSeconds - 90000) } as never, 86400)).toBe(
      false,
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/auth/oauth/telegram.test.ts`
Expected: FAIL — module does not exist.

- [ ] **Step 3: Implement**

```ts
// src/lib/auth/oauth/telegram.ts
import "server-only";
import { createHash, createHmac, timingSafeEqual } from "node:crypto";

export type TelegramAuthData = {
  id: string;
  first_name?: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date: string;
  hash: string;
};

export function verifyTelegramAuth(data: TelegramAuthData, botToken: string): boolean {
  const { hash, ...rest } = data;
  const checkString = Object.keys(rest)
    .sort()
    .map((key) => `${key}=${(rest as Record<string, string>)[key]}`)
    .join("\n");

  const secretKey = createHash("sha256").update(botToken).digest();
  const expectedHash = createHmac("sha256", secretKey).update(checkString).digest("hex");

  const expected = Buffer.from(expectedHash, "hex");
  const actual = Buffer.from(hash, "hex");
  if (expected.length !== actual.length) return false;
  return timingSafeEqual(expected, actual);
}

export function isTelegramAuthFresh(
  data: Pick<TelegramAuthData, "auth_date">,
  maxAgeSeconds: number,
): boolean {
  const nowSeconds = Math.floor(Date.now() / 1000);
  const authDateSeconds = Number(data.auth_date);
  return nowSeconds - authDateSeconds <= maxAgeSeconds;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/auth/oauth/telegram.test.ts`
Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/auth/oauth/telegram.ts src/lib/auth/oauth/telegram.test.ts
git commit -m "feat: add Telegram Login Widget HMAC verification"
```

---

### Task 6: Session cookie helpers + login/link core

**Files:**
- Create: `src/lib/auth/cookies.ts`
- Create: `src/lib/auth/session.ts`
- Test: `src/lib/auth/session.test.ts`

**Interfaces:**
- Consumes: `db` (Task 1), `users`/`accounts`/`sessions` (Task 2).
- Produces:
  - `SESSION_COOKIE_NAME: string`, `sessionCookieOptions(): CookieOptions` (`cookies.ts`)
  - `completeLogin(input: { provider: string; providerAccountId: string; email: string | null; name: string | null; image: string | null }): Promise<{ sessionToken: string; userId: string }>` — finds-or-creates the user+account, creates a session row, returns the new token.
  - `linkProviderToUser(input: { userId: string; provider: string; providerAccountId: string; email: string | null; name: string | null; image: string | null }): Promise<{ ok: true } | { ok: false; error: "already_linked_to_another_user" }>`
  - `unlinkProvider(input: { userId: string; provider: string; providerAccountId: string }): Promise<{ ok: true } | { ok: false; error: "last_account" }>`

This task uses the real `db` client and runs against the Neon database provisioned in Task 1 (integration-style unit tests) — each test creates its own random-suffixed rows and does not depend on other tests' state.

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/auth/session.test.ts
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { afterEach, describe, expect, it } from "vitest";
import { db } from "@/db/client";
import { accounts, sessions, users } from "@/db/schema/auth";
import { completeLogin, linkProviderToUser, unlinkProvider } from "./session";

const createdUserIds: string[] = [];

afterEach(async () => {
  for (const userId of createdUserIds.splice(0)) {
    await db.delete(users).where(eq(users.id, userId));
  }
});

describe("completeLogin", () => {
  it("creates a new user and account on first login", async () => {
    const providerAccountId = randomUUID();
    const result = await completeLogin({
      provider: "google",
      providerAccountId,
      email: `${providerAccountId}@example.com`,
      name: "Akbarali",
      image: null,
    });
    createdUserIds.push(result.userId);

    const [session] = await db
      .select()
      .from(sessions)
      .where(eq(sessions.sessionToken, result.sessionToken));
    expect(session?.userId).toBe(result.userId);

    const [account] = await db
      .select()
      .from(accounts)
      .where(eq(accounts.providerAccountId, providerAccountId));
    expect(account?.userId).toBe(result.userId);
  });

  it("reuses the same user on a second login with the same provider account", async () => {
    const providerAccountId = randomUUID();
    const first = await completeLogin({
      provider: "google",
      providerAccountId,
      email: null,
      name: null,
      image: null,
    });
    createdUserIds.push(first.userId);

    const second = await completeLogin({
      provider: "google",
      providerAccountId,
      email: null,
      name: null,
      image: null,
    });

    expect(second.userId).toBe(first.userId);
    expect(second.sessionToken).not.toBe(first.sessionToken);
  });
});

describe("linkProviderToUser / unlinkProvider", () => {
  it("links a second provider to an existing user", async () => {
    const login = await completeLogin({
      provider: "google",
      providerAccountId: randomUUID(),
      email: null,
      name: null,
      image: null,
    });
    createdUserIds.push(login.userId);

    const result = await linkProviderToUser({
      userId: login.userId,
      provider: "github",
      providerAccountId: randomUUID(),
      email: null,
      name: null,
      image: null,
    });

    expect(result).toEqual({ ok: true });
    const linked = await db
      .select()
      .from(accounts)
      .where(eq(accounts.userId, login.userId));
    expect(linked).toHaveLength(2);
  });

  it("refuses to link a provider account already owned by someone else", async () => {
    const providerAccountId = randomUUID();
    const ownerLogin = await completeLogin({
      provider: "github",
      providerAccountId,
      email: null,
      name: null,
      image: null,
    });
    createdUserIds.push(ownerLogin.userId);

    const otherLogin = await completeLogin({
      provider: "google",
      providerAccountId: randomUUID(),
      email: null,
      name: null,
      image: null,
    });
    createdUserIds.push(otherLogin.userId);

    const result = await linkProviderToUser({
      userId: otherLogin.userId,
      provider: "github",
      providerAccountId,
      email: null,
      name: null,
      image: null,
    });

    expect(result).toEqual({ ok: false, error: "already_linked_to_another_user" });
  });

  it("refuses to unlink the last remaining provider", async () => {
    const login = await completeLogin({
      provider: "google",
      providerAccountId: randomUUID(),
      email: null,
      name: null,
      image: null,
    });
    createdUserIds.push(login.userId);

    const [onlyAccount] = await db
      .select()
      .from(accounts)
      .where(eq(accounts.userId, login.userId));

    const result = await unlinkProvider({
      userId: login.userId,
      provider: onlyAccount!.provider,
      providerAccountId: onlyAccount!.providerAccountId,
    });

    expect(result).toEqual({ ok: false, error: "last_account" });
  });

  it("unlinks a provider when at least one other remains", async () => {
    const login = await completeLogin({
      provider: "google",
      providerAccountId: randomUUID(),
      email: null,
      name: null,
      image: null,
    });
    createdUserIds.push(login.userId);
    const githubAccountId = randomUUID();
    await linkProviderToUser({
      userId: login.userId,
      provider: "github",
      providerAccountId: githubAccountId,
      email: null,
      name: null,
      image: null,
    });

    const result = await unlinkProvider({
      userId: login.userId,
      provider: "github",
      providerAccountId: githubAccountId,
    });

    expect(result).toEqual({ ok: true });
    const remaining = await db
      .select()
      .from(accounts)
      .where(eq(accounts.userId, login.userId));
    expect(remaining).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/auth/session.test.ts`
Expected: FAIL — `session.ts` does not exist.

- [ ] **Step 3: Implement the cookie helper**

```ts
// src/lib/auth/cookies.ts
export const SESSION_COOKIE_NAME = "tayanchai_session";

export function sessionCookieOptions(expires: Date) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    expires,
  };
}
```

- [ ] **Step 4: Implement the session core**

```ts
// src/lib/auth/session.ts
import "server-only";
import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { accounts, sessions, users } from "@/db/schema/auth";

const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

type ProviderInput = {
  provider: string;
  providerAccountId: string;
  email: string | null;
  name: string | null;
  image: string | null;
};

async function createSessionForUser(userId: string) {
  const sessionToken = randomUUID();
  const expires = new Date(Date.now() + SESSION_TTL_MS);
  await db.insert(sessions).values({ sessionToken, userId, expires });
  return { sessionToken, userId };
}

export async function completeLogin(input: ProviderInput) {
  const [existingAccount] = await db
    .select()
    .from(accounts)
    .where(
      and(
        eq(accounts.provider, input.provider),
        eq(accounts.providerAccountId, input.providerAccountId),
      ),
    );

  if (existingAccount) {
    return createSessionForUser(existingAccount.userId);
  }

  const [user] = await db
    .insert(users)
    .values({ name: input.name, email: input.email, image: input.image })
    .returning();

  await db.insert(accounts).values({
    userId: user!.id,
    type: "oauth",
    provider: input.provider,
    providerAccountId: input.providerAccountId,
  });

  return createSessionForUser(user!.id);
}

export async function linkProviderToUser(
  input: ProviderInput & { userId: string },
): Promise<{ ok: true } | { ok: false; error: "already_linked_to_another_user" }> {
  const [existingAccount] = await db
    .select()
    .from(accounts)
    .where(
      and(
        eq(accounts.provider, input.provider),
        eq(accounts.providerAccountId, input.providerAccountId),
      ),
    );

  if (existingAccount && existingAccount.userId !== input.userId) {
    return { ok: false, error: "already_linked_to_another_user" };
  }
  if (existingAccount) {
    return { ok: true }; // already linked to this same user — idempotent
  }

  await db.insert(accounts).values({
    userId: input.userId,
    type: "oauth",
    provider: input.provider,
    providerAccountId: input.providerAccountId,
  });
  return { ok: true };
}

export async function unlinkProvider(input: {
  userId: string;
  provider: string;
  providerAccountId: string;
}): Promise<{ ok: true } | { ok: false; error: "last_account" }> {
  const linkedAccounts = await db
    .select()
    .from(accounts)
    .where(eq(accounts.userId, input.userId));

  if (linkedAccounts.length <= 1) {
    return { ok: false, error: "last_account" };
  }

  await db
    .delete(accounts)
    .where(
      and(
        eq(accounts.provider, input.provider),
        eq(accounts.providerAccountId, input.providerAccountId),
        eq(accounts.userId, input.userId),
      ),
    );
  return { ok: true };
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/lib/auth/session.test.ts`
Expected: PASS (6 tests). Requires `DATABASE_URL` to be set in the test environment (`.env.local` is loaded by Vitest via `vite-tsconfig-paths`/`dotenv` already implied by Next.js tooling — if `vitest.config.mts` does not currently load `.env.local`, add `import { loadEnv } from "vite"; process.env = { ...process.env, ...loadEnv("test", process.cwd(), "") };` at the top of the config, or add `dotenv/config` as a `setupFiles` entry).

- [ ] **Step 6: Commit**

```bash
git add src/lib/auth/cookies.ts src/lib/auth/session.ts src/lib/auth/session.test.ts vitest.config.mts
git commit -m "feat: add login/link/unlink session core backed by Drizzle"
```

---

### Task 7: DAL — `getSession`, `verifySession`, `requireOrganization`

**Files:**
- Create: `src/lib/auth/dal.ts`

**Interfaces:**
- Consumes: `SESSION_COOKIE_NAME` (Task 6), `db`, `sessions`/`users` (Task 2), `memberships`/`organizations` (Task 3).
- Produces:
  - `getSession(): Promise<{ user: User; session: Session } | null>` — cached per-request via `React.cache`, never redirects.
  - `verifySession(locale: string): Promise<{ user: User; session: Session }>` — redirects to `/{locale}/sign-in` if absent.
  - `requireOrganization(locale: string): Promise<{ user: User; session: Session; membership: Membership; organization: Organization }>` — redirects to `/{locale}/onboarding` if the user has no membership.

- [ ] **Step 1: Implement**

(No unit test for this task — it's a thin composition over Task 6's already-tested queries plus `next/headers`/`next/navigation`, which need a request context that unit tests can't easily provide. It is covered by the Playwright flow test in Task 16.)

```ts
// src/lib/auth/dal.ts
import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { sessions, users } from "@/db/schema/auth";
import { memberships, organizations } from "@/db/schema/org";
import { SESSION_COOKIE_NAME } from "./cookies";

export const getSession = cache(async () => {
  const token = (await cookies()).get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;

  const [row] = await db
    .select({ session: sessions, user: users })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(eq(sessions.sessionToken, token));

  if (!row || row.session.expires < new Date()) return null;
  return row;
});

export async function verifySession(locale: string) {
  const result = await getSession();
  if (!result) redirect(`/${locale}/sign-in`);
  return result;
}

export async function requireOrganization(locale: string) {
  const session = await verifySession(locale);

  const [row] = await db
    .select({ membership: memberships, organization: organizations })
    .from(memberships)
    .innerJoin(organizations, eq(memberships.organizationId, organizations.id))
    .where(eq(memberships.userId, session.user.id));

  if (!row) redirect(`/${locale}/onboarding`);
  return { ...session, ...row };
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/auth/dal.ts
git commit -m "feat: add auth DAL (getSession/verifySession/requireOrganization)"
```

---

### Task 8: OAuth + Telegram route handlers, sign-out route

**Files:**
- Create: `src/app/api/auth/[provider]/start/route.ts`
- Create: `src/app/api/auth/[provider]/callback/route.ts`
- Create: `src/app/api/auth/telegram/callback/route.ts`
- Create: `src/app/api/auth/signout/route.ts`

**Interfaces:**
- Consumes: `buildAuthorizeUrl`/`exchangeCodeForProfile` (Task 4), `verifyTelegramAuth`/`isTelegramAuthFresh` (Task 5), `completeLogin`/`linkProviderToUser` (Task 6), `getSession` (Task 7), `SESSION_COOKIE_NAME`/`sessionCookieOptions` (Task 6).
- Produces: the four HTTP endpoints the UI (Task 9) links to.

State/CSRF handling: `start` sets a short-lived `tayanchai_oauth_state` cookie holding a random value; `callback` validates the query `state` against it before proceeding, then deletes the cookie. `start` also accepts `?mode=link` (only honored if a session already exists) to route into `linkProviderToUser` instead of `completeLogin` in the callback.

- [ ] **Step 1: `start` route**

```ts
// src/app/api/auth/[provider]/start/route.ts
import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { type NextRequest } from "next/server";
import { buildAuthorizeUrl, type ProviderId } from "@/lib/auth/oauth/providers";
import { getSession } from "@/lib/auth/dal";

const VALID_PROVIDERS: ProviderId[] = ["google", "github"];

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> },
) {
  const { provider } = await params;
  if (!VALID_PROVIDERS.includes(provider as ProviderId)) {
    return new Response("Unknown provider", { status: 404 });
  }

  const mode = request.nextUrl.searchParams.get("mode") === "link" ? "link" : "signin";
  if (mode === "link") {
    const session = await getSession();
    if (!session) return new Response("Not signed in", { status: 401 });
  }

  const state = randomUUID();
  const cookieStore = await cookies();
  cookieStore.set("tayanchai_oauth_state", `${state}:${mode}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });

  const redirectUri = new URL(
    `/api/auth/${provider}/callback`,
    request.nextUrl.origin,
  ).toString();
  redirect(buildAuthorizeUrl(provider as ProviderId, state, redirectUri));
}
```

- [ ] **Step 2: `callback` route**

```ts
// src/app/api/auth/[provider]/callback/route.ts
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { type NextRequest } from "next/server";
import { exchangeCodeForProfile, type ProviderId } from "@/lib/auth/oauth/providers";
import { completeLogin, linkProviderToUser } from "@/lib/auth/session";
import { getSession } from "@/lib/auth/dal";
import { SESSION_COOKIE_NAME, sessionCookieOptions } from "@/lib/auth/cookies";

const VALID_PROVIDERS: ProviderId[] = ["google", "github"];
const DEFAULT_LOCALE = "uz";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> },
) {
  const { provider } = await params;
  if (!VALID_PROVIDERS.includes(provider as ProviderId)) {
    return new Response("Unknown provider", { status: 404 });
  }

  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const cookieStore = await cookies();
  const storedState = cookieStore.get("tayanchai_oauth_state")?.value;
  cookieStore.delete("tayanchai_oauth_state");

  if (!code || !state || !storedState) {
    redirect(`/${DEFAULT_LOCALE}/sign-in?error=oauth_failed`);
  }
  const [expectedState, mode] = storedState.split(":");
  if (expectedState !== state) {
    redirect(`/${DEFAULT_LOCALE}/sign-in?error=oauth_failed`);
  }

  const redirectUri = new URL(
    `/api/auth/${provider}/callback`,
    request.nextUrl.origin,
  ).toString();
  const profile = await exchangeCodeForProfile(provider as ProviderId, code, redirectUri);
  if (!profile) {
    redirect(`/${DEFAULT_LOCALE}/sign-in?error=oauth_failed`);
  }

  if (mode === "link") {
    const session = await getSession();
    if (!session) redirect(`/${DEFAULT_LOCALE}/sign-in?error=oauth_failed`);
    const result = await linkProviderToUser({ ...profile, provider, userId: session.user.id });
    if (!result.ok) {
      redirect(`/${DEFAULT_LOCALE}/settings/accounts?error=${result.error}`);
    }
    redirect(`/${DEFAULT_LOCALE}/settings/accounts`);
  }

  const { sessionToken, expires } = await completeLoginWithExpiry(provider, profile);
  cookieStore.set(SESSION_COOKIE_NAME, sessionToken, sessionCookieOptions(expires));
  redirect(`/${DEFAULT_LOCALE}/dashboard`);
}

async function completeLoginWithExpiry(
  provider: string,
  profile: Awaited<ReturnType<typeof exchangeCodeForProfile>>,
) {
  const result = await completeLogin({ ...profile!, provider });
  return { ...result, expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) };
}
```

- [ ] **Step 3: Telegram callback route**

```ts
// src/app/api/auth/telegram/callback/route.ts
import { z } from "zod";
import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { isTelegramAuthFresh, verifyTelegramAuth } from "@/lib/auth/oauth/telegram";
import { completeLogin, linkProviderToUser } from "@/lib/auth/session";
import { getSession } from "@/lib/auth/dal";
import { SESSION_COOKIE_NAME, sessionCookieOptions } from "@/lib/auth/cookies";

const telegramAuthSchema = z.object({
  id: z.union([z.string(), z.number()]).transform(String),
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  username: z.string().optional(),
  photo_url: z.string().optional(),
  auth_date: z.union([z.string(), z.number()]).transform(String),
  hash: z.string(),
});

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = telegramAuthSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  }
  const data = parsed.data;

  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken || !verifyTelegramAuth(data, botToken) || !isTelegramAuthFresh(data, 86_400)) {
    return NextResponse.json({ error: "invalid_signature" }, { status: 401 });
  }

  const profile = {
    providerAccountId: data.id,
    email: null,
    name: [data.first_name, data.last_name].filter(Boolean).join(" ") || data.username || null,
    image: data.photo_url ?? null,
  };

  const mode = request.nextUrl.searchParams.get("mode") === "link" ? "link" : "signin";
  const cookieStore = await cookies();

  if (mode === "link") {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "not_signed_in" }, { status: 401 });
    const result = await linkProviderToUser({ ...profile, provider: "telegram", userId: session.user.id });
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 409 });
    return NextResponse.json({ ok: true });
  }

  const { sessionToken } = await completeLogin({ ...profile, provider: "telegram" });
  const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  cookieStore.set(SESSION_COOKIE_NAME, sessionToken, sessionCookieOptions(expires));
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 4: Sign-out route**

```ts
// src/app/api/auth/signout/route.ts
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { sessions } from "@/db/schema/auth";
import { SESSION_COOKIE_NAME } from "@/lib/auth/cookies";

export async function POST() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (token) {
    await db.delete(sessions).where(eq(sessions.sessionToken, token));
    cookieStore.delete(SESSION_COOKIE_NAME);
  }
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 5: Verify manually**

Run `npm run dev`, set real `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` (and GitHub equivalents) in `.env.local` from a test OAuth app whose redirect URI is `http://localhost:3000/api/auth/google/callback` (and `/github/callback`), then visit `http://localhost:3000/api/auth/google/start` directly in the browser and confirm it redirects through Google and lands on `/uz/dashboard` with a `tayanchai_session` cookie set.

- [ ] **Step 6: Commit**

```bash
git add src/app/api/auth
git commit -m "feat: add OAuth start/callback, Telegram callback, and sign-out routes"
```

---

### Task 9: Sign-in page UI + auth i18n messages

**Files:**
- Create: `src/app/[locale]/(auth)/sign-in/page.tsx`
- Create: `src/components/auth/provider-buttons.tsx`
- Create: `src/components/auth/telegram-login-widget.tsx`
- Modify: `messages/uz.json`, `messages/ru.json`, `messages/en.json`

**Interfaces:**
- Consumes: `/api/auth/google/start`, `/api/auth/github/start` (Task 8, plain links), `/api/auth/telegram/callback` (Task 8, called by the widget's JS callback).
- Produces: `/{locale}/sign-in` page.

- [ ] **Step 1: Add messages**

Add to `messages/uz.json` (mirror in `ru.json`/`en.json` with translated strings):

```json
"auth": {
  "signIn": {
    "title": "TayanchAI'ga kiring",
    "subtitle": "Parolsiz — bitta tugmani bosing",
    "google": "Google orqali kirish",
    "github": "GitHub orqali kirish",
    "telegram": "Telegram orqali kirish",
    "errorOauthFailed": "Kirishda xatolik yuz berdi. Qaytadan urinib ko'ring."
  }
}
```

(`ru.json`: `"title": "Kiring TayanchAI"` → use proper Russian: `"title": "Войдите в TayanchAI"`, `"subtitle": "Без пароля — один клик"`, `"google": "Войти через Google"`, `"github": "Войти через GitHub"`, `"telegram": "Войти через Telegram"`, `"errorOauthFailed": "Ошибка входа. Попробуйте снова."`. `en.json`: `"title": "Sign in to TayanchAI"`, `"subtitle": "No password — one click"`, `"google": "Continue with Google"`, `"github": "Continue with GitHub"`, `"telegram": "Continue with Telegram"`, `"errorOauthFailed": "Sign-in failed. Please try again."`.)

- [ ] **Step 2: Provider buttons component**

```tsx
// src/components/auth/provider-buttons.tsx
import { Button } from "@/components/ui/button";
import { useTranslations } from "next-intl";

export function ProviderButtons() {
  const t = useTranslations("auth.signIn");
  return (
    <div className="flex flex-col gap-3">
      <Button asChild size="lg">
        <a href="/api/auth/google/start">{t("google")}</a>
      </Button>
      <Button asChild size="lg" variant="secondary">
        <a href="/api/auth/github/start">{t("github")}</a>
      </Button>
    </div>
  );
}
```

- [ ] **Step 3: Telegram Login Widget wrapper (client component)**

```tsx
// src/components/auth/telegram-login-widget.tsx
"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "@/i18n/navigation";

type TelegramAuthData = {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date: number;
  hash: string;
};

declare global {
  interface Window {
    onTelegramAuth?: (data: TelegramAuthData) => void;
  }
}

export function TelegramLoginWidget({ botUsername }: { botUsername: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    window.onTelegramAuth = async (data) => {
      const response = await fetch("/api/auth/telegram/callback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (response.ok) {
        router.push("/dashboard");
      } else {
        router.push("/sign-in?error=oauth_failed");
      }
    };

    const script = document.createElement("script");
    script.src = "https://telegram.org/js/telegram-widget.js?22";
    script.async = true;
    script.setAttribute("data-telegram-login", botUsername);
    script.setAttribute("data-size", "large");
    script.setAttribute("data-onauth", "onTelegramAuth(user)");
    script.setAttribute("data-request-access", "write");
    containerRef.current?.appendChild(script);

    return () => {
      window.onTelegramAuth = undefined;
    };
  }, [botUsername, router]);

  return <div ref={containerRef} />;
}
```

- [ ] **Step 4: Sign-in page**

```tsx
// src/app/[locale]/(auth)/sign-in/page.tsx
import { getTranslations } from "next-intl/server";
import { ProviderButtons } from "@/components/auth/provider-buttons";
import { TelegramLoginWidget } from "@/components/auth/telegram-login-widget";

export default async function SignInPage() {
  const t = await getTranslations("auth.signIn");
  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-6 px-4">
      <div className="flex flex-col items-center gap-2 text-center">
        <h1 className="text-2xl font-semibold">{t("title")}</h1>
        <p className="text-muted-foreground">{t("subtitle")}</p>
      </div>
      <div className="flex flex-col items-center gap-3">
        <ProviderButtons />
        <TelegramLoginWidget botUsername={process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME!} />
      </div>
    </main>
  );
}
```

Add `NEXT_PUBLIC_TELEGRAM_BOT_USERNAME=` to `.env.example`.

- [ ] **Step 5: Verify manually**

`npm run dev`, visit `/uz/sign-in`, `/ru/sign-in`, `/en/sign-in` — confirm translated copy and that all three buttons/widgets render.

- [ ] **Step 6: Commit**

```bash
git add src/app/[locale]/\(auth\)/sign-in src/components/auth messages .env.example
git commit -m "feat: add sign-in page with OAuth and Telegram Login buttons"
```

---

### Task 10: `proxy.ts` optimistic auth gate

**Files:**
- Modify: `src/proxy.ts`

**Interfaces:**
- Consumes: `SESSION_COOKIE_NAME` (Task 6), `routing` (existing).

Per Next.js's own auth guide, this is an **optimistic** cookie-presence check only (no DB read) — real authorization still happens in the DAL (Task 7) on every protected page/action.

- [ ] **Step 1: Update `proxy.ts`**

```ts
// src/proxy.ts
import createMiddleware from "next-intl/middleware";
import { NextResponse, type NextRequest } from "next/server";
import { routing } from "./i18n/routing";
import { SESSION_COOKIE_NAME } from "./lib/auth/cookies";

const handleI18nRouting = createMiddleware(routing);

const PROTECTED_SEGMENT = /^\/(uz|ru|en)\/(dashboard|settings|onboarding)(\/|$)/;

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (PROTECTED_SEGMENT.test(pathname) && !request.cookies.get(SESSION_COOKIE_NAME)) {
    const locale = pathname.split("/")[1];
    return NextResponse.redirect(new URL(`/${locale}/sign-in`, request.url));
  }
  return handleI18nRouting(request);
}

export const config = {
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
```

- [ ] **Step 2: Verify manually**

With no session cookie, visit `http://localhost:3000/uz/dashboard` and confirm redirect to `/uz/sign-in`. Sign in, then visiting `/uz/dashboard` should succeed.

- [ ] **Step 3: Commit**

```bash
git add src/proxy.ts
git commit -m "feat: add optimistic auth redirect to proxy for protected routes"
```

---

### Task 11: Onboarding (organization creation)

**Files:**
- Create: `src/app/[locale]/(auth)/onboarding/page.tsx`
- Create: `src/app/[locale]/(auth)/onboarding/actions.ts`
- Create: `src/lib/org/schema.ts`
- Test: `src/lib/org/schema.test.ts`
- Modify: `messages/{uz,ru,en}.json`

**Interfaces:**
- Consumes: `verifySession` (Task 7), `organizations`/`memberships` (Task 3).
- Produces: `parseOrganizationInput(input: unknown): { success: true; data: { name: string; industry: string } } | { success: false; error: string }`, `createOrganization(formData: FormData): Promise<void>` (redirects to `/dashboard` on success).

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/org/schema.test.ts
import { describe, expect, it } from "vitest";
import { parseOrganizationInput } from "./schema";

describe("parseOrganizationInput", () => {
  it("accepts a valid name and industry", () => {
    const result = parseOrganizationInput({ name: "Tayanch Do'kon", industry: "retail" });
    expect(result).toEqual({
      success: true,
      data: { name: "Tayanch Do'kon", industry: "retail" },
    });
  });

  it("rejects an empty name", () => {
    const result = parseOrganizationInput({ name: "", industry: "retail" });
    expect(result.success).toBe(false);
  });

  it("rejects an unknown industry", () => {
    const result = parseOrganizationInput({ name: "Do'kon", industry: "not-a-real-industry" });
    expect(result.success).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/org/schema.test.ts`
Expected: FAIL — module missing.

- [ ] **Step 3: Implement schema**

```ts
// src/lib/org/schema.ts
import { z } from "zod";

export const INDUSTRIES = ["retail", "restaurant", "education", "real_estate", "other"] as const;

const organizationSchema = z.object({
  name: z.string().trim().min(2).max(100),
  industry: z.enum(INDUSTRIES),
});

export type OrganizationInput = z.infer<typeof organizationSchema>;

export function parseOrganizationInput(
  input: unknown,
): { success: true; data: OrganizationInput } | { success: false; error: string } {
  const result = organizationSchema.safeParse(input);
  if (!result.success) {
    return { success: false, error: result.error.issues[0]?.message ?? "Invalid input" };
  }
  return { success: true, data: result.data };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/org/schema.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: Server action**

```ts
// src/app/[locale]/(auth)/onboarding/actions.ts
"use server";

import { redirect } from "next/navigation";
import { db } from "@/db/client";
import { organizations, memberships } from "@/db/schema/org";
import { verifySession } from "@/lib/auth/dal";
import { parseOrganizationInput } from "@/lib/org/schema";

export async function createOrganization(locale: string, formData: FormData): Promise<void> {
  const { user } = await verifySession(locale);
  const parsed = parseOrganizationInput({
    name: formData.get("name"),
    industry: formData.get("industry"),
  });
  if (!parsed.success) {
    redirect(`/${locale}/onboarding?error=${encodeURIComponent(parsed.error)}`);
  }

  const [organization] = await db.insert(organizations).values(parsed.data).returning();
  await db.insert(memberships).values({
    userId: user.id,
    organizationId: organization!.id,
    role: "owner",
  });

  redirect(`/${locale}/dashboard`);
}
```

- [ ] **Step 6: Onboarding page**

```tsx
// src/app/[locale]/(auth)/onboarding/page.tsx
import { getTranslations } from "next-intl/server";
import { verifySession } from "@/lib/auth/dal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { INDUSTRIES } from "@/lib/org/schema";
import { createOrganization } from "./actions";

export default async function OnboardingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  await verifySession(locale);
  const t = await getTranslations("onboarding");
  const action = createOrganization.bind(null, locale);

  return (
    <main className="mx-auto flex min-h-svh max-w-md flex-col justify-center gap-6 px-4">
      <div>
        <h1 className="text-2xl font-semibold">{t("title")}</h1>
        <p className="text-muted-foreground">{t("subtitle")}</p>
      </div>
      <form action={action} className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="name">{t("nameLabel")}</Label>
          <Input id="name" name="name" required minLength={2} maxLength={100} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="industry">{t("industryLabel")}</Label>
          <select id="industry" name="industry" required className="border-input rounded-md border px-3 py-2">
            {INDUSTRIES.map((industry) => (
              <option key={industry} value={industry}>
                {t(`industries.${industry}`)}
              </option>
            ))}
          </select>
        </div>
        <Button type="submit">{t("submit")}</Button>
      </form>
    </main>
  );
}
```

- [ ] **Step 7: Add `onboarding` messages** to all three locale files:

```json
"onboarding": {
  "title": "Tashkilotingizni yarating",
  "subtitle": "Bir necha soniyada boshlanadi",
  "nameLabel": "Tashkilot nomi",
  "industryLabel": "Soha",
  "submit": "Davom etish",
  "industries": {
    "retail": "Do'kon / Chakana savdo",
    "restaurant": "Restoran / Kafe",
    "education": "Ta'lim markazi",
    "real_estate": "Ko'chmas mulk",
    "other": "Boshqa"
  }
}
```

(translate equivalently for `ru.json`/`en.json`)

- [ ] **Step 8: Commit**

```bash
git add src/app/[locale]/\(auth\)/onboarding src/lib/org messages
git commit -m "feat: add onboarding flow for first-login organization creation"
```

---

### Task 12: `requireOrganization` gate wiring + dashboard route stub

**Files:**
- Create: `src/app/[locale]/(dashboard)/dashboard/page.tsx` (minimal placeholder — full empty-state UI lands in Task 15)

**Interfaces:**
- Consumes: `requireOrganization` (Task 7).

This is a small dedicated task so the onboarding→dashboard redirect loop (Task 11 redirects to `/dashboard`; `/dashboard` must redirect back to `/onboarding` if no org exists) can be verified end-to-end before the full dashboard shell (Task 14) is built.

- [ ] **Step 1: Minimal dashboard page**

```tsx
// src/app/[locale]/(dashboard)/dashboard/page.tsx
import { requireOrganization } from "@/lib/auth/dal";

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const { organization } = await requireOrganization(locale);
  return <div>{organization.name}</div>;
}
```

- [ ] **Step 2: Verify manually**

Sign in with a fresh account (no org yet) → confirm redirect to `/onboarding` → submit the form → confirm redirect to `/dashboard` showing the organization name.

- [ ] **Step 3: Commit**

```bash
git add "src/app/[locale]/(dashboard)/dashboard/page.tsx"
git commit -m "feat: wire requireOrganization gate on the dashboard route"
```

---

### Task 13: Linked accounts settings page

**Files:**
- Create: `src/app/[locale]/(dashboard)/settings/accounts/page.tsx`
- Create: `src/app/[locale]/(dashboard)/settings/accounts/actions.ts`
- Modify: `messages/{uz,ru,en}.json`

**Interfaces:**
- Consumes: `verifySession` (Task 7), `unlinkProvider` (Task 6), `accounts` table (Task 2).

- [ ] **Step 1: Server action**

```ts
// src/app/[locale]/(dashboard)/settings/accounts/actions.ts
"use server";

import { revalidatePath } from "next/cache";
import { verifySession } from "@/lib/auth/dal";
import { unlinkProvider } from "@/lib/auth/session";

export async function unlinkAccountAction(
  locale: string,
  provider: string,
  providerAccountId: string,
): Promise<{ ok: boolean; error?: string }> {
  const { user } = await verifySession(locale);
  const result = await unlinkProvider({ userId: user.id, provider, providerAccountId });
  if (result.ok) revalidatePath(`/${locale}/settings/accounts`);
  return result.ok ? { ok: true } : { ok: false, error: result.error };
}
```

- [ ] **Step 2: Page**

```tsx
// src/app/[locale]/(dashboard)/settings/accounts/page.tsx
import { eq } from "drizzle-orm";
import { getTranslations } from "next-intl/server";
import { db } from "@/db/client";
import { accounts } from "@/db/schema/auth";
import { verifySession } from "@/lib/auth/dal";
import { Button } from "@/components/ui/button";
import { unlinkAccountAction } from "./actions";

const ALL_PROVIDERS = ["google", "telegram", "github"] as const;

export default async function LinkedAccountsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const { user } = await verifySession(locale);
  const t = await getTranslations("settings.accounts");

  const linked = await db.select().from(accounts).where(eq(accounts.userId, user.id));
  const linkedProviders = new Set(linked.map((a) => a.provider));
  const canUnlink = linked.length > 1;

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold">{t("title")}</h1>
      <ul className="flex flex-col gap-3">
        {linked.map((account) => (
          <li key={`${account.provider}:${account.providerAccountId}`} className="flex items-center justify-between rounded-lg border p-4">
            <span className="capitalize">{account.provider}</span>
            <form
              action={async () => {
                "use server";
                await unlinkAccountAction(locale, account.provider, account.providerAccountId);
              }}
            >
              <Button type="submit" variant="ghost" disabled={!canUnlink}>
                {t("unlink")}
              </Button>
            </form>
          </li>
        ))}
      </ul>
      <div className="flex flex-col gap-2">
        <h2 className="text-sm font-medium text-muted-foreground">{t("addProvider")}</h2>
        <div className="flex flex-wrap gap-2">
          {ALL_PROVIDERS.filter((p) => !linkedProviders.has(p)).map((provider) =>
            provider === "telegram" ? null : (
              <Button key={provider} asChild variant="outline">
                <a href={`/api/auth/${provider}/start?mode=link`}>{t(`link.${provider}`)}</a>
              </Button>
            ),
          )}
        </div>
      </div>
    </div>
  );
}
```

(Telegram linking uses the same `TelegramLoginWidget` component from Task 9 with a `mode=link` query param appended to its POST target — extend `TelegramLoginWidget` to accept an optional `mode` prop that's forwarded as `?mode=link` on the fetch URL, and render it here for the "add Telegram" case instead of a plain link.)

- [ ] **Step 3: Extend `TelegramLoginWidget` for link mode**

In `src/components/auth/telegram-login-widget.tsx`, add a `mode?: "signin" | "link"` prop (default `"signin"`) and use it to build the fetch URL: `` `/api/auth/telegram/callback${mode === "link" ? "?mode=link" : ""}` ``, and on success `router.push(mode === "link" ? "/settings/accounts" : "/dashboard")`.

- [ ] **Step 4: Add `settings.accounts` messages**

```json
"settings": {
  "accounts": {
    "title": "Ulangan akkauntlar",
    "unlink": "Uzish",
    "addProvider": "Provider qo'shish",
    "link": {
      "google": "Google qo'shish",
      "github": "GitHub qo'shish",
      "telegram": "Telegram qo'shish"
    }
  }
}
```

(translate for `ru`/`en`)

- [ ] **Step 5: Verify manually**

Sign in, visit `/uz/settings/accounts`, link a second provider, confirm "Uzish" becomes enabled once 2+ accounts exist and disabled with 1.

- [ ] **Step 6: Commit**

```bash
git add "src/app/[locale]/(dashboard)/settings/accounts" src/components/auth/telegram-login-widget.tsx messages
git commit -m "feat: add linked accounts settings page"
```

---

### Task 14: Active sessions settings page

**Files:**
- Create: `src/app/[locale]/(dashboard)/settings/sessions/page.tsx`
- Create: `src/app/[locale]/(dashboard)/settings/sessions/actions.ts`
- Create: `src/lib/auth/touch-session.ts`
- Modify: `src/app/[locale]/(dashboard)/layout.tsx` reference (created fully in Task 15 — this task only adds the client-side touch call; if Task 15 hasn't run yet, add a temporary minimal layout that just renders `{children}` plus the touch effect, to be replaced wholesale in Task 15)
- Modify: `messages/{uz,ru,en}.json`

**Interfaces:**
- Consumes: `verifySession` (Task 7), `sessions` table (Task 2).
- Produces: `touchSession(): Promise<void>` (server action — records user-agent/IP/lastActiveAt on the current session row), `revokeSessionAction`, `revokeOtherSessionsAction`.

- [ ] **Step 1: `touchSession` server action**

```ts
// src/lib/auth/touch-session.ts
"use server";

import { headers, cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { sessions } from "@/db/schema/auth";
import { SESSION_COOKIE_NAME } from "./cookies";

export async function touchSession(): Promise<void> {
  const token = (await cookies()).get(SESSION_COOKIE_NAME)?.value;
  if (!token) return;
  const headerList = await headers();
  await db
    .update(sessions)
    .set({
      userAgent: headerList.get("user-agent") ?? null,
      ipAddress: headerList.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
      lastActiveAt: new Date(),
    })
    .where(eq(sessions.sessionToken, token));
}
```

- [ ] **Step 2: Call it once per session from the dashboard layout**

Add a tiny client component `src/components/dashboard/session-touch.tsx`:

```tsx
"use client";
import { useEffect } from "react";
import { touchSession } from "@/lib/auth/touch-session";

export function SessionTouch() {
  useEffect(() => {
    touchSession();
  }, []);
  return null;
}
```

Render `<SessionTouch />` once inside `(dashboard)/layout.tsx` (wired fully in Task 15; if that layout doesn't exist yet, create a minimal one now: `export default function DashboardLayout({ children }: { children: React.ReactNode }) { return <>{children}<SessionTouch /></>; }` and Task 15 will replace its contents, keeping `<SessionTouch />`).

- [ ] **Step 3: Revoke actions**

```ts
// src/app/[locale]/(dashboard)/settings/sessions/actions.ts
"use server";

import { revalidatePath } from "next/cache";
import { and, eq, ne } from "drizzle-orm";
import { cookies } from "next/headers";
import { db } from "@/db/client";
import { sessions } from "@/db/schema/auth";
import { verifySession } from "@/lib/auth/dal";
import { SESSION_COOKIE_NAME } from "@/lib/auth/cookies";

export async function revokeSessionAction(locale: string, sessionToken: string): Promise<void> {
  const { user } = await verifySession(locale);
  await db
    .delete(sessions)
    .where(and(eq(sessions.sessionToken, sessionToken), eq(sessions.userId, user.id)));
  revalidatePath(`/${locale}/settings/sessions`);
}

export async function revokeOtherSessionsAction(locale: string): Promise<void> {
  const { user } = await verifySession(locale);
  const currentToken = (await cookies()).get(SESSION_COOKIE_NAME)?.value;
  await db
    .delete(sessions)
    .where(
      and(
        eq(sessions.userId, user.id),
        currentToken ? ne(sessions.sessionToken, currentToken) : undefined,
      ),
    );
  revalidatePath(`/${locale}/settings/sessions`);
}
```

- [ ] **Step 4: Page**

```tsx
// src/app/[locale]/(dashboard)/settings/sessions/page.tsx
import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { getTranslations } from "next-intl/server";
import { db } from "@/db/client";
import { sessions } from "@/db/schema/auth";
import { verifySession } from "@/lib/auth/dal";
import { SESSION_COOKIE_NAME } from "@/lib/auth/cookies";
import { Button } from "@/components/ui/button";
import { revokeOtherSessionsAction, revokeSessionAction } from "./actions";

export default async function SessionsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const { user } = await verifySession(locale);
  const t = await getTranslations("settings.sessions");
  const currentToken = (await cookies()).get(SESSION_COOKIE_NAME)?.value;

  const rows = await db.select().from(sessions).where(eq(sessions.userId, user.id));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">{t("title")}</h1>
        <form
          action={async () => {
            "use server";
            await revokeOtherSessionsAction(locale);
          }}
        >
          <Button type="submit" variant="outline">
            {t("revokeOthers")}
          </Button>
        </form>
      </div>
      <ul className="flex flex-col gap-3">
        {rows.map((row) => (
          <li key={row.sessionToken} className="flex items-center justify-between rounded-lg border p-4">
            <div>
              <p className="font-medium">
                {row.userAgent ?? t("unknownDevice")}
                {row.sessionToken === currentToken ? ` — ${t("thisDevice")}` : ""}
              </p>
              <p className="text-muted-foreground text-sm">{row.ipAddress ?? "—"}</p>
            </div>
            {row.sessionToken !== currentToken && (
              <form
                action={async () => {
                  "use server";
                  await revokeSessionAction(locale, row.sessionToken);
                }}
              >
                <Button type="submit" variant="ghost">
                  {t("revoke")}
                </Button>
              </form>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
```

- [ ] **Step 5: Add `settings.sessions` messages**

```json
"sessions": {
  "title": "Faol sessiyalar",
  "revoke": "Chiqish",
  "revokeOthers": "Boshqa hamma joydan chiqish",
  "thisDevice": "bu qurilma",
  "unknownDevice": "Noma'lum qurilma"
}
```

(nested under `settings`, translated for `ru`/`en`)

- [ ] **Step 6: Verify manually**

Sign in from two different browsers/profiles with the same account (link the second via a provider), confirm `/uz/settings/sessions` lists both, "bu qurilma" tag on the current one, and both revoke actions work.

- [ ] **Step 7: Commit**

```bash
git add "src/app/[locale]/(dashboard)/settings/sessions" src/lib/auth/touch-session.ts src/components/dashboard/session-touch.tsx messages
git commit -m "feat: add active sessions panel with device metadata and revoke actions"
```

---

### Task 15: Team invites

**Files:**
- Create: `src/lib/auth/invites.ts`
- Test: `src/lib/auth/invites.test.ts`
- Create: `src/app/[locale]/(dashboard)/settings/team/page.tsx`
- Create: `src/app/[locale]/(dashboard)/settings/team/actions.ts`
- Modify: `messages/{uz,ru,en}.json`

**Interfaces:**
- Consumes: `requireOrganization` (Task 7), `invites`/`memberships` (Task 3).
- Produces: `parseInviteEmail(input: unknown): { success: true; data: string } | { success: false; error: string }`, `isInviteValid(invite: { status: string; expiresAt: Date }): boolean`.

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/auth/invites.test.ts
import { describe, expect, it } from "vitest";
import { isInviteValid, parseInviteEmail } from "./invites";

describe("parseInviteEmail", () => {
  it("accepts a valid email", () => {
    expect(parseInviteEmail("teammate@example.com")).toEqual({
      success: true,
      data: "teammate@example.com",
    });
  });

  it("rejects an invalid email", () => {
    const result = parseInviteEmail("not-an-email");
    expect(result.success).toBe(false);
  });
});

describe("isInviteValid", () => {
  it("accepts a pending, unexpired invite", () => {
    const invite = { status: "pending", expiresAt: new Date(Date.now() + 86_400_000) };
    expect(isInviteValid(invite)).toBe(true);
  });

  it("rejects an already-accepted invite", () => {
    const invite = { status: "accepted", expiresAt: new Date(Date.now() + 86_400_000) };
    expect(isInviteValid(invite)).toBe(false);
  });

  it("rejects an expired invite", () => {
    const invite = { status: "pending", expiresAt: new Date(Date.now() - 1000) };
    expect(isInviteValid(invite)).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/auth/invites.test.ts`
Expected: FAIL — module missing.

- [ ] **Step 3: Implement**

```ts
// src/lib/auth/invites.ts
import "server-only";
import { z } from "zod";

const emailSchema = z.email();

export function parseInviteEmail(
  input: unknown,
): { success: true; data: string } | { success: false; error: string } {
  const result = emailSchema.safeParse(input);
  if (!result.success) {
    return { success: false, error: result.error.issues[0]?.message ?? "Invalid email" };
  }
  return { success: true, data: result.data };
}

export function isInviteValid(invite: { status: string; expiresAt: Date }): boolean {
  return invite.status === "pending" && invite.expiresAt.getTime() > Date.now();
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/auth/invites.test.ts`
Expected: PASS (5 tests)

- [ ] **Step 5: Server actions**

```ts
// src/app/[locale]/(dashboard)/settings/team/actions.ts
"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { invites, memberships } from "@/db/schema/org";
import { requireOrganization, verifySession } from "@/lib/auth/dal";
import { isInviteValid, parseInviteEmail } from "@/lib/auth/invites";

export async function inviteMemberAction(locale: string, formData: FormData): Promise<void> {
  const { user, organization } = await requireOrganization(locale);
  const parsed = parseInviteEmail(formData.get("email"));
  if (!parsed.success) return;

  await db.insert(invites).values({
    organizationId: organization.id,
    email: parsed.data,
    token: randomUUID(),
    role: "member",
    invitedByUserId: user.id,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  });
  // Sending the invite email is stubbed until Phase 2b picks a transactional
  // email provider alongside billing — logging keeps the invite operable
  // (the token can be shared manually) without blocking this phase on that choice.
  console.log(`Invite created for ${parsed.data} in org ${organization.id}`);
  revalidatePath(`/${locale}/settings/team`);
}

export async function acceptInviteAction(locale: string, token: string): Promise<void> {
  const { user } = await verifySession(locale);
  const [invite] = await db.select().from(invites).where(eq(invites.token, token));
  if (!invite || !isInviteValid(invite)) return;

  await db.insert(memberships).values({
    userId: user.id,
    organizationId: invite.organizationId,
    role: invite.role,
  });
  await db.update(invites).set({ status: "accepted" }).where(eq(invites.id, invite.id));
}
```

- [ ] **Step 6: Team page**

```tsx
// src/app/[locale]/(dashboard)/settings/team/page.tsx
import { eq } from "drizzle-orm";
import { getTranslations } from "next-intl/server";
import { db } from "@/db/client";
import { invites, memberships } from "@/db/schema/org";
import { users } from "@/db/schema/auth";
import { requireOrganization } from "@/lib/auth/dal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { inviteMemberAction } from "./actions";

export default async function TeamPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const { organization } = await requireOrganization(locale);
  const t = await getTranslations("settings.team");
  const action = inviteMemberAction.bind(null, locale);

  const members = await db
    .select({ name: users.name, email: users.email, role: memberships.role })
    .from(memberships)
    .innerJoin(users, eq(memberships.userId, users.id))
    .where(eq(memberships.organizationId, organization.id));

  const pendingInvites = await db
    .select()
    .from(invites)
    .where(eq(invites.organizationId, organization.id));

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold">{t("title")}</h1>
      <form action={action} className="flex gap-2">
        <Input name="email" type="email" placeholder={t("emailPlaceholder")} required />
        <Button type="submit">{t("invite")}</Button>
      </form>
      <ul className="flex flex-col gap-2">
        {members.map((member) => (
          <li key={member.email} className="rounded-lg border p-3">
            {member.name ?? member.email} — {member.role}
          </li>
        ))}
        {pendingInvites
          .filter((invite) => invite.status === "pending")
          .map((invite) => (
            <li key={invite.id} className="rounded-lg border border-dashed p-3 text-muted-foreground">
              {invite.email} — {t("pending")}
            </li>
          ))}
      </ul>
    </div>
  );
}
```

- [ ] **Step 7: Add `settings.team` messages**

```json
"team": {
  "title": "Jamoa a'zolari",
  "emailPlaceholder": "email@misol.uz",
  "invite": "Taklif yuborish",
  "pending": "kutilmoqda"
}
```

(nested under `settings`, translated for `ru`/`en`)

- [ ] **Step 8: Commit**

```bash
git add src/lib/auth/invites.ts src/lib/auth/invites.test.ts "src/app/[locale]/(dashboard)/settings/team" messages
git commit -m "feat: add team invite flow"
```

---

### Task 16: Dashboard shell (sidebar, topbar, org switcher, user menu)

**Files:**
- Create: `src/components/dashboard/sidebar-nav.tsx`
- Create: `src/components/dashboard/org-switcher.tsx`
- Create: `src/components/dashboard/user-menu.tsx`
- Modify: `src/app/[locale]/(dashboard)/layout.tsx` (replace the minimal stub from Task 14 with the full shell)
- Modify: `messages/{uz,ru,en}.json`

**Interfaces:**
- Consumes: `requireOrganization` (Task 7), `SessionTouch` (Task 14), shadcn `sidebar` primitive (installed in Step 1 below).

- [ ] **Step 1: Install the shadcn sidebar primitive**

```bash
npx shadcn add sidebar
```

Expected: adds `src/components/ui/sidebar.tsx` and any primitives it depends on (`separator`, `tooltip`, `sheet` — `sheet` already exists) using this project's existing `components.json` config (`style: base-nova`, `baseColor: neutral`).

- [ ] **Step 2: Sidebar navigation component**

```tsx
// src/components/dashboard/sidebar-nav.tsx
import { useTranslations } from "next-intl";
import {
  SidebarContent,
  SidebarGroup,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@/components/ui/sidebar";
import { Link } from "@/i18n/navigation";
import { Bot, MessageSquare, BookOpen, Plug, BarChart3, Settings } from "lucide-react";

const COMING_SOON_ITEMS = [
  { key: "assistants", icon: Bot },
  { key: "chats", icon: MessageSquare },
  { key: "knowledgeBases", icon: BookOpen },
  { key: "integrations", icon: Plug },
  { key: "statistics", icon: BarChart3 },
] as const;

export function SidebarNav() {
  const t = useTranslations("dashboard.nav");
  return (
    <SidebarContent>
      <SidebarGroup>
        <SidebarMenu>
          {COMING_SOON_ITEMS.map(({ key, icon: Icon }) => (
            <SidebarMenuItem key={key}>
              <SidebarMenuButton disabled>
                <Icon />
                <span>{t(key)}</span>
                <span className="text-muted-foreground ml-auto text-xs">{t("comingSoon")}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <Link href="/settings/accounts">
                <Settings />
                <span>{t("settings")}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarGroup>
    </SidebarContent>
  );
}
```

- [ ] **Step 3: Org switcher (server component fetching, minimal client trigger)**

```tsx
// src/components/dashboard/org-switcher.tsx
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { memberships, organizations } from "@/db/schema/org";

export async function OrgSwitcher({ userId, activeOrgId }: { userId: string; activeOrgId: string }) {
  const rows = await db
    .select({ organization: organizations })
    .from(memberships)
    .innerJoin(organizations, eq(memberships.organizationId, organizations.id))
    .where(eq(memberships.userId, userId));

  const active = rows.find((row) => row.organization.id === activeOrgId)?.organization;

  // Multi-organization switching UI is deferred: worken.ru's own switcher only
  // matters once a user belongs to 2+ orgs, which Phase 2a's single-org
  // onboarding flow (Task 11) never produces. Rendering the active org name
  // now avoids a dead click target; the dropdown is a Phase 3+ addition once
  // a second org can actually be joined (e.g. via Task 15's team invites).
  return <span className="font-medium">{active?.name}</span>;
}
```

- [ ] **Step 4: User menu (client dropdown, sign-out call)**

```tsx
// src/components/dashboard/user-menu.tsx
"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";

export function UserMenu({ name }: { name: string | null }) {
  const t = useTranslations("dashboard.userMenu");
  const router = useRouter();

  async function handleSignOut() {
    await fetch("/api/auth/signout", { method: "POST" });
    router.push("/sign-in");
  }

  return (
    <div className="flex items-center gap-3">
      <span className="text-sm">{name ?? t("anonymous")}</span>
      <Button variant="ghost" size="sm" onClick={handleSignOut}>
        {t("signOut")}
      </Button>
    </div>
  );
}
```

- [ ] **Step 5: Dashboard layout**

```tsx
// src/app/[locale]/(dashboard)/layout.tsx
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarFooter,
  SidebarInset,
} from "@/components/ui/sidebar";
import { SidebarNav } from "@/components/dashboard/sidebar-nav";
import { OrgSwitcher } from "@/components/dashboard/org-switcher";
import { UserMenu } from "@/components/dashboard/user-menu";
import { SessionTouch } from "@/components/dashboard/session-touch";
import { requireOrganization } from "@/lib/auth/dal";

export default async function DashboardLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const { user, organization } = await requireOrganization(locale);

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader>
          <OrgSwitcher userId={user.id} activeOrgId={organization.id} />
        </SidebarHeader>
        <SidebarNav />
        <SidebarFooter>
          <UserMenu name={user.name} />
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <SessionTouch />
        {children}
      </SidebarInset>
    </SidebarProvider>
  );
}
```

- [ ] **Step 6: Add `dashboard` messages**

```json
"dashboard": {
  "nav": {
    "assistants": "AI Xodimlar",
    "chats": "Suhbatlar",
    "knowledgeBases": "Bilim bazasi",
    "integrations": "Integratsiyalar",
    "statistics": "Statistika",
    "settings": "Sozlamalar",
    "comingSoon": "Tez orada"
  },
  "userMenu": {
    "signOut": "Chiqish",
    "anonymous": "Foydalanuvchi"
  }
}
```

(translate for `ru`/`en`)

- [ ] **Step 7: Verify manually**

Sign in, confirm the sidebar renders with disabled "Tez orada" items, active org name in the header, and sign-out returns to `/sign-in` and clears the session (re-visiting `/dashboard` redirects to sign-in again).

- [ ] **Step 8: Commit**

```bash
git add src/components/dashboard src/components/ui/sidebar.tsx "src/app/[locale]/(dashboard)/layout.tsx" messages package.json package-lock.json
git commit -m "feat: add dashboard shell with sidebar, org switcher, and user menu"
```

---

### Task 17: Dashboard empty-state home page

**Files:**
- Modify: `src/app/[locale]/(dashboard)/dashboard/page.tsx` (replace the Task 12 placeholder with the real empty state)
- Modify: `messages/{uz,ru,en}.json`

**Interfaces:**
- Consumes: `requireOrganization` (Task 7).

- [ ] **Step 1: Replace the page**

```tsx
// src/app/[locale]/(dashboard)/dashboard/page.tsx
import { getTranslations } from "next-intl/server";
import { requireOrganization } from "@/lib/auth/dal";
import { Button } from "@/components/ui/button";

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const { organization } = await requireOrganization(locale);
  const t = await getTranslations("dashboard.home");

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
      <h1 className="text-2xl font-semibold">{t("title", { org: organization.name })}</h1>
      <p className="text-muted-foreground max-w-md">{t("subtitle")}</p>
      <Button disabled>{t("cta")}</Button>
    </div>
  );
}
```

- [ ] **Step 2: Add `dashboard.home` messages**

```json
"home": {
  "title": "Xush kelibsiz, {org}",
  "subtitle": "Hali AI xodim yo'q. Bu funksiya tez orada — AI Xodimlar bo'limida birinchi assistentingizni yaratasiz.",
  "cta": "AI xodim ijaraga olish"
}
```

(nested under `dashboard`, translated for `ru`/`en`)

- [ ] **Step 3: Verify manually**

Visit `/uz/dashboard`, `/ru/dashboard`, `/en/dashboard` and confirm the organization name is interpolated and copy is translated.

- [ ] **Step 4: Commit**

```bash
git add "src/app/[locale]/(dashboard)/dashboard/page.tsx" messages
git commit -m "feat: add dashboard empty-state home page"
```

---

### Task 18: Playwright smoke tests

**Files:**
- Create: `tests/e2e/auth.spec.ts`

**Interfaces:**
- Consumes: the running dev server (per `playwright.config.ts`, already configured for the marketing smoke tests).

Full OAuth round-trips can't be driven through real Google/GitHub/Telegram in CI without live credentials, so these smoke tests cover what's deterministic: the sign-in page renders correctly in all 3 locales, and the auth gate actually redirects unauthenticated visitors away from protected routes.

- [ ] **Step 1: Write the test**

```ts
// tests/e2e/auth.spec.ts
import { test, expect } from "@playwright/test";

test.describe("sign-in page", () => {
  for (const locale of ["uz", "ru", "en"] as const) {
    test(`renders provider buttons in ${locale}`, async ({ page }) => {
      await page.goto(`/${locale}/sign-in`);
      await expect(page.getByRole("link", { name: /google|Google/i })).toBeVisible();
      await expect(page.getByRole("link", { name: /github|GitHub/i })).toBeVisible();
    });
  }
});

test.describe("auth gate", () => {
  test("redirects an unauthenticated visitor from /dashboard to /sign-in", async ({ page }) => {
    await page.goto("/uz/dashboard");
    await expect(page).toHaveURL(/\/uz\/sign-in/);
  });

  test("redirects an unauthenticated visitor from /settings/accounts to /sign-in", async ({ page }) => {
    await page.goto("/uz/settings/accounts");
    await expect(page).toHaveURL(/\/uz\/sign-in/);
  });
});
```

- [ ] **Step 2: Run the tests**

Run: `npm run test:e2e -- tests/e2e/auth.spec.ts`
Expected: all pass (5 tests) against a locally running dev server.

- [ ] **Step 3: Commit**

```bash
git add tests/e2e/auth.spec.ts
git commit -m "test: add Playwright smoke tests for sign-in page and auth gate"
```

---

## Final manual verification (not a task — run after Task 18)

With real `GOOGLE_CLIENT_ID`/`SECRET`, `GITHUB_CLIENT_ID`/`SECRET`, `TELEGRAM_BOT_TOKEN`, and `NEXT_PUBLIC_TELEGRAM_BOT_USERNAME` set in `.env.local`:

1. Sign in with Google as a brand-new user → confirm redirect to `/onboarding` → create an organization → confirm redirect to `/dashboard` showing the empty state.
2. From `/settings/accounts`, link Telegram and GitHub to the same account → confirm all three show as linked and "Uzish" is enabled.
3. Unlink down to one provider → confirm the last one's "Uzish" button is disabled.
4. From `/settings/sessions`, confirm the current device is tagged and revoking it via a second signed-in session logs the first one out on its next navigation.
5. From `/settings/team`, invite a second email address → confirm it appears as "kutilmoqda" in the list.
6. Repeat steps 1–2 with the UI in `ru` and `en` and confirm all copy is translated (no raw keys, no leftover Uzbek strings).
