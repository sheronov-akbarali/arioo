# Phase F — Telegram Channel Analytics Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let an org admin connect their organization's own Telegram channel (via a personal Telegram account, MTProto) and see member growth + per-post view/forward stats in the `/statistics/marketing` "Telegram" card.

**Architecture:** A `gramjs` (MTProto) client drives a 3-step login (phone+channel → code → optional 2FA password) across stateless Next.js Server Actions, persisting the in-progress session string (AES-256-GCM encrypted) in a new `telegram_channel_connection` table between steps. Once connected, a read path re-opens the stored session on each page load to fetch `channels.getFullChannel` (member count) and `stats.getBroadcastStats` (post stats), with graceful "not enough subscribers" and "not connected" states — never fake data.

**Tech Stack:** `telegram` npm package (gramjs), Node `crypto` (AES-256-GCM), Drizzle ORM / Postgres, Next.js Server Actions + `useActionState`, next-intl.

**Spec:** `docs/superpowers/specs/2026-08-14-phase-f-telegram-channel-analytics-design.md`

## Global Constraints

- New env vars (add to `.env.example`, never commit real values): `TELEGRAM_API_ID`, `TELEGRAM_API_HASH` (from https://my.telegram.org — a one-time manual step for the project owner, shared across all orgs, like `TELEGRAM_BOT_TOKEN` already is), `TELEGRAM_SESSION_ENCRYPTION_KEY` (32 random bytes, base64-encoded).
- One Telegram connection per organization (MVP) — `organizationId` is `unique` on the new table.
- Session strings are never logged, never sent to the client, and only ever decrypted inside `server-only` modules.
- All user-visible strings ship in `uz` (default), `ru`, `en` — uz is written first, then ru/en are direct translations.
- `npx drizzle-kit push` is this repo's migration workflow — no versioned migration files.
- Follow the connect-flow ordering fixed in the spec: phone + channel username are collected together in step 1, before the auth code.

---

### Task 1: DB schema — `telegram_channel_connection`

**Files:**
- Create: `src/db/schema/telegram-channel-connection.ts`
- Modify: `src/db/schema/index.ts`

**Interfaces:**
- Produces: `telegramChannelConnections` table, `telegramConnectionStatus` pg enum (`"pending_code" | "pending_password" | "connected" | "error"`), and the row shape `{ id, organizationId, channelUsername, channelTitle, phoneMasked, sessionSecretEncrypted, phoneCodeHash, status, lastSyncedAt, lastError, createdAt, updatedAt }` — every later task reads/writes these exact column names.

- [ ] **Step 1: Write the schema file**

```ts
// src/db/schema/telegram-channel-connection.ts
import { pgTable, text, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { organizations } from "./org";

export const telegramConnectionStatus = pgEnum("telegram_connection_status", [
  "pending_code",
  "pending_password",
  "connected",
  "error",
]);

export const telegramChannelConnections = pgTable("telegram_channel_connection", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  organizationId: text("organizationId")
    .notNull()
    .unique()
    .references(() => organizations.id, { onDelete: "cascade" }),
  channelUsername: text("channelUsername").notNull(),
  channelTitle: text("channelTitle"),
  phoneMasked: text("phoneMasked"),
  // Encrypted MTProto session string (AES-256-GCM, see session-crypto.ts).
  // Populated as soon as step 1 connects, then overwritten at each step.
  sessionSecretEncrypted: text("sessionSecretEncrypted"),
  // Needed to complete auth.SignIn; cleared once status becomes "connected" or "error".
  phoneCodeHash: text("phoneCodeHash"),
  status: telegramConnectionStatus("status").notNull().default("pending_code"),
  lastSyncedAt: timestamp("lastSyncedAt", { mode: "date" }),
  lastError: text("lastError"),
  createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
});
```

- [ ] **Step 2: Export it from the schema barrel**

Add to `src/db/schema/index.ts`:
```ts
export * from "./telegram-channel-connection";
```

- [ ] **Step 3: Push the schema to the dev database**

Run: `npx drizzle-kit push`
Expected: prompts to create `telegram_channel_connection` table + `telegram_connection_status` enum; accept.

- [ ] **Step 4: Verify with a type check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/db/schema/telegram-channel-connection.ts src/db/schema/index.ts
git commit -m "feat(telegram): add telegram_channel_connection table"
```

---

### Task 2: Session encryption (`session-crypto.ts`)

**Files:**
- Create: `src/lib/telegram/session-crypto.ts`
- Test: `src/lib/telegram/session-crypto.test.ts`

**Interfaces:**
- Produces: `encryptSessionSecret(plaintext: string): string`, `decryptSessionSecret(ciphertext: string): string` — both throw if `TELEGRAM_SESSION_ENCRYPTION_KEY` is missing or malformed. Used by Task 5–8's actions to store/read `sessionSecretEncrypted`.

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/telegram/session-crypto.test.ts
import { describe, expect, it, beforeAll } from "vitest";
import { encryptSessionSecret, decryptSessionSecret } from "./session-crypto";

beforeAll(() => {
  process.env.TELEGRAM_SESSION_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString("base64");
});

describe("session-crypto", () => {
  it("round-trips a plaintext session string", () => {
    const ciphertext = encryptSessionSecret("super-secret-session-string");
    expect(ciphertext).not.toContain("super-secret-session-string");
    expect(decryptSessionSecret(ciphertext)).toBe("super-secret-session-string");
  });

  it("produces different ciphertext for the same plaintext (random IV)", () => {
    const a = encryptSessionSecret("same-input");
    const b = encryptSessionSecret("same-input");
    expect(a).not.toBe(b);
  });

  it("throws when the encryption key is missing", () => {
    const original = process.env.TELEGRAM_SESSION_ENCRYPTION_KEY;
    delete process.env.TELEGRAM_SESSION_ENCRYPTION_KEY;
    expect(() => encryptSessionSecret("x")).toThrow();
    process.env.TELEGRAM_SESSION_ENCRYPTION_KEY = original;
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/telegram/session-crypto.test.ts`
Expected: FAIL — `session-crypto` module not found.

- [ ] **Step 3: Write the implementation**

```ts
// src/lib/telegram/session-crypto.ts
import "server-only";
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

function getKey(): Buffer {
  const raw = process.env.TELEGRAM_SESSION_ENCRYPTION_KEY;
  if (!raw) throw new Error("TELEGRAM_SESSION_ENCRYPTION_KEY is not set");
  const key = Buffer.from(raw, "base64");
  if (key.length !== 32) {
    throw new Error("TELEGRAM_SESSION_ENCRYPTION_KEY must decode to exactly 32 bytes");
  }
  return key;
}

export function encryptSessionSecret(plaintext: string): string {
  const key = getKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return Buffer.concat([iv, authTag, encrypted]).toString("base64");
}

export function decryptSessionSecret(ciphertext: string): string {
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

`session-crypto.test.ts` imports a `server-only` module directly under vitest — confirm this works the same way `src/db/client.ts`'s existing tests do (grep `grep -rl '"server-only"' src` shows this pattern is already exercised in this repo's test suite, e.g. `ai-core-schema.test.ts`), so no special vitest config is needed.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/telegram/session-crypto.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/telegram/session-crypto.ts src/lib/telegram/session-crypto.test.ts
git commit -m "feat(telegram): add AES-256-GCM session secret encryption"
```

---

### Task 3: Install `telegram` (gramjs) and add the client helper

**Files:**
- Modify: `package.json`, `package-lock.json` (via `npm install`)
- Create: `src/lib/telegram/client.ts`
- Test: `src/lib/telegram/client.test.ts`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: `telegramApiCredentials(): { apiId: number; apiHash: string }` and `openTelegramClient(sessionString: string): Promise<TelegramClient>` (connects and returns a ready client — caller is responsible for `client.disconnect()`). Tasks 5–9 build on these two functions.

- [ ] **Step 1: Install the dependency**

Run: `npm install telegram`
Expected: `telegram` added to `dependencies` in `package.json`.

- [ ] **Step 2: Write the failing test**

```ts
// src/lib/telegram/client.test.ts
import { describe, expect, it, vi, beforeEach } from "vitest";

const connectMock = vi.fn().mockResolvedValue(undefined);
const TelegramClientMock = vi.fn().mockImplementation(() => ({ connect: connectMock }));

vi.mock("telegram", () => ({ TelegramClient: TelegramClientMock }));
vi.mock("telegram/sessions", () => ({
  StringSession: vi.fn().mockImplementation((s: string) => ({ __session: s })),
}));

import { openTelegramClient, telegramApiCredentials } from "./client";

beforeEach(() => {
  process.env.TELEGRAM_API_ID = "12345";
  process.env.TELEGRAM_API_HASH = "abc123hash";
  connectMock.mockClear();
  TelegramClientMock.mockClear();
});

describe("telegramApiCredentials", () => {
  it("reads apiId/apiHash from env", () => {
    expect(telegramApiCredentials()).toEqual({ apiId: 12345, apiHash: "abc123hash" });
  });

  it("throws when TELEGRAM_API_ID is missing", () => {
    delete process.env.TELEGRAM_API_ID;
    expect(() => telegramApiCredentials()).toThrow();
  });
});

describe("openTelegramClient", () => {
  it("constructs a client with the given session and connects it", async () => {
    const client = await openTelegramClient("existing-session-string");
    expect(TelegramClientMock).toHaveBeenCalledWith(
      { __session: "existing-session-string" },
      12345,
      "abc123hash",
      expect.objectContaining({ connectionRetries: 5 }),
    );
    expect(connectMock).toHaveBeenCalledOnce();
    expect(client).toBeDefined();
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run src/lib/telegram/client.test.ts`
Expected: FAIL — `client.ts` not found.

- [ ] **Step 4: Write the implementation**

```ts
// src/lib/telegram/client.ts
import "server-only";
import { TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions";

export function telegramApiCredentials(): { apiId: number; apiHash: string } {
  const apiId = Number(process.env.TELEGRAM_API_ID);
  const apiHash = process.env.TELEGRAM_API_HASH;
  if (!apiId || !apiHash) {
    throw new Error("TELEGRAM_API_ID / TELEGRAM_API_HASH is not set");
  }
  return { apiId, apiHash };
}

export async function openTelegramClient(sessionString: string): Promise<TelegramClient> {
  const { apiId, apiHash } = telegramApiCredentials();
  const client = new TelegramClient(new StringSession(sessionString), apiId, apiHash, {
    connectionRetries: 5,
  });
  await client.connect();
  return client;
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/lib/telegram/client.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json src/lib/telegram/client.ts src/lib/telegram/client.test.ts
git commit -m "feat(telegram): add gramjs client helper"
```

---

### Task 4: Connect-flow state type

**Files:**
- Create: `src/lib/telegram/connect-state.ts`

**Interfaces:**
- Produces: `TelegramConnectState` — the `useActionState` state shape shared by all 4 server actions (Task 5) and the form component (Task 9).

- [ ] **Step 1: Write the type**

```ts
// src/lib/telegram/connect-state.ts
export type TelegramConnectState =
  | { status: "idle"; error?: string }
  | { status: "pending_code"; error?: string }
  | { status: "pending_password"; error?: string }
  | { status: "connected" }
  | { status: "error"; error: string };
```

- [ ] **Step 2: Verify with a type check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/telegram/connect-state.ts
git commit -m "feat(telegram): add TelegramConnectState type"
```

---

### Task 5: `finalizeConnection` helper (channel admin check + save/reject)

**Files:**
- Create: `src/lib/telegram/finalize-connection.ts`
- Test: `src/lib/telegram/finalize-connection.test.ts`

**Interfaces:**
- Consumes: `encryptSessionSecret` (Task 2).
- Produces: `finalizeConnection(params: { organizationId: string; channelUsername: string; client: TelegramClient }): Promise<TelegramConnectState>` — called by both the no-2FA and 2FA-complete branches in Task 6. On success, upserts the DB row to `status: "connected"` with the final encrypted session + resolved `channelTitle`; on failure (not an admin of that channel), logs the client out, sets `status: "error"`, and does **not** persist the session.

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/telegram/finalize-connection.test.ts
import { describe, expect, it, vi, beforeEach } from "vitest";

process.env.TELEGRAM_SESSION_ENCRYPTION_KEY = Buffer.alloc(32, 9).toString("base64");

const dbUpdateSet = vi.fn().mockReturnThis();
const dbUpdateWhere = vi.fn().mockResolvedValue(undefined);
vi.mock("@/db/client", () => ({
  db: {
    update: vi.fn(() => ({ set: dbUpdateSet, where: dbUpdateWhere })),
  },
}));

const invoke = vi.fn();
const logOut = vi.fn();
const sessionSave = vi.fn().mockReturnValue("final-session-string");

function makeClient() {
  return { invoke, logOut, session: { save: sessionSave } } as any;
}

import { finalizeConnection } from "./finalize-connection";

beforeEach(() => {
  invoke.mockReset();
  logOut.mockReset();
  dbUpdateSet.mockClear();
  dbUpdateWhere.mockClear();
});

describe("finalizeConnection", () => {
  it("marks the connection connected when the account administers the channel", async () => {
    invoke
      .mockResolvedValueOnce({ chats: [{ id: "1", title: "Arioo kanali", accessHash: "h" }] }) // ResolveUsername
      .mockResolvedValueOnce({
        participant: { className: "ChannelParticipantAdmin" },
      }); // GetParticipant

    const result = await finalizeConnection({
      organizationId: "org_1",
      channelUsername: "arioo_uz",
      client: makeClient(),
    });

    expect(result).toEqual({ status: "connected" });
    expect(dbUpdateSet).toHaveBeenCalledWith(
      expect.objectContaining({ status: "connected", channelTitle: "Arioo kanali" }),
    );
    expect(logOut).not.toHaveBeenCalled();
  });

  it("rejects and logs out when the account is not an admin", async () => {
    invoke
      .mockResolvedValueOnce({ chats: [{ id: "1", title: "Arioo kanali", accessHash: "h" }] })
      .mockResolvedValueOnce({ participant: { className: "ChannelParticipantSelf" } });

    const result = await finalizeConnection({
      organizationId: "org_1",
      channelUsername: "arioo_uz",
      client: makeClient(),
    });

    expect(result.status).toBe("error");
    expect(logOut).toHaveBeenCalledOnce();
    expect(dbUpdateSet).toHaveBeenCalledWith(expect.objectContaining({ status: "error" }));
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/telegram/finalize-connection.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

```ts
// src/lib/telegram/finalize-connection.ts
import "server-only";
import { eq } from "drizzle-orm";
import type { TelegramClient } from "telegram";
import { Api } from "telegram";
import { db } from "@/db/client";
import { telegramChannelConnections } from "@/db/schema/telegram-channel-connection";
import { encryptSessionSecret } from "./session-crypto";
import type { TelegramConnectState } from "./connect-state";

const ADMIN_PARTICIPANT_TYPES = new Set(["ChannelParticipantAdmin", "ChannelParticipantCreator"]);

export async function finalizeConnection(params: {
  organizationId: string;
  channelUsername: string;
  client: TelegramClient;
}): Promise<TelegramConnectState> {
  const { organizationId, channelUsername, client } = params;

  const resolved = (await client.invoke(
    new Api.contacts.ResolveUsername({ username: channelUsername }),
  )) as unknown as { chats: Array<{ id: string; title: string; accessHash: string }> };
  const chat = resolved.chats[0];

  const participantResult = (await client.invoke(
    new Api.channels.GetParticipant({
      channel: channelUsername,
      participant: "me",
    }),
  )) as unknown as { participant: { className: string } };

  const isAdmin = ADMIN_PARTICIPANT_TYPES.has(participantResult.participant.className);

  if (!isAdmin) {
    await client.logOut();
    await db
      .update(telegramChannelConnections)
      .set({
        status: "error",
        lastError: "not_channel_admin",
        sessionSecretEncrypted: null,
        phoneCodeHash: null,
        updatedAt: new Date(),
      })
      .where(eq(telegramChannelConnections.organizationId, organizationId));
    return { status: "error", error: "not_channel_admin" };
  }

  const sessionString = client.session.save() as unknown as string;
  await db
    .update(telegramChannelConnections)
    .set({
      status: "connected",
      channelTitle: chat?.title ?? channelUsername,
      sessionSecretEncrypted: encryptSessionSecret(sessionString),
      phoneCodeHash: null,
      lastError: null,
      lastSyncedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(telegramChannelConnections.organizationId, organizationId));
  return { status: "connected" };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/telegram/finalize-connection.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/telegram/finalize-connection.ts src/lib/telegram/finalize-connection.test.ts
git commit -m "feat(telegram): add channel-admin verification and connection finalize step"
```

---

### Task 6: Server actions — `startTelegramConnection`, `submitTelegramCode`, `submitTelegramPassword`, `disconnectTelegramChannel`

**Files:**
- Create: `src/app/[locale]/(dashboard)/statistics/marketing/telegram-actions.ts`
- Test: `src/app/[locale]/(dashboard)/statistics/marketing/telegram-actions.test.ts`

**Interfaces:**
- Consumes: `requireOrganization` (`@/lib/auth/dal`), `openTelegramClient`/`telegramApiCredentials` (Task 3), `encryptSessionSecret`/`decryptSessionSecret` (Task 2), `finalizeConnection` (Task 5), `telegramChannelConnections` (Task 1), `TelegramConnectState` (Task 4).
- Produces: 4 exported `async function` server actions, each shaped `(locale: string, prevState: TelegramConnectState, formData: FormData) => Promise<TelegramConnectState>` — Task 9's form component binds `locale` with `.bind(null, locale)`, matching the existing `updateProjectAction` pattern in `src/app/[locale]/(dashboard)/settings/project/actions.ts`.

- [ ] **Step 1: Write the failing test**

```ts
// src/app/[locale]/(dashboard)/statistics/marketing/telegram-actions.test.ts
import { describe, expect, it, vi, beforeEach } from "vitest";

process.env.TELEGRAM_SESSION_ENCRYPTION_KEY = Buffer.alloc(32, 3).toString("base64");
process.env.TELEGRAM_API_ID = "111";
process.env.TELEGRAM_API_HASH = "hash";

vi.mock("@/lib/auth/dal", () => ({
  requireOrganization: vi.fn().mockResolvedValue({ organization: { id: "org_1" } }),
}));

const sendCode = vi.fn().mockResolvedValue({ phoneCodeHash: "hash123" });
const invoke = vi.fn();
const disconnect = vi.fn();
const sessionSave = vi.fn().mockReturnValue("mid-session-string");

vi.mock("@/lib/telegram/client", () => ({
  openTelegramClient: vi.fn().mockResolvedValue({
    sendCode,
    invoke,
    disconnect,
    session: { save: sessionSave },
  }),
  telegramApiCredentials: vi.fn().mockReturnValue({ apiId: 111, apiHash: "hash" }),
}));

const dbValues = vi.fn().mockReturnThis();
const dbOnConflict = vi.fn().mockReturnThis();
const dbReturning = vi.fn().mockResolvedValue([{ id: "conn_1" }]);
const dbSelectWhere = vi.fn().mockResolvedValue([
  { id: "conn_1", organizationId: "org_1", phoneCodeHash: "hash123", sessionSecretEncrypted: null },
]);
vi.mock("@/db/client", () => ({
  db: {
    insert: vi.fn(() => ({ values: dbValues, onConflictDoUpdate: dbOnConflict, returning: dbReturning })),
    select: vi.fn(() => ({ from: vi.fn(() => ({ where: dbSelectWhere })) })),
    update: vi.fn(() => ({ set: vi.fn().mockReturnThis(), where: vi.fn().mockResolvedValue(undefined) })),
  },
}));

vi.mock("@/lib/telegram/finalize-connection", () => ({
  finalizeConnection: vi.fn().mockResolvedValue({ status: "connected" }),
}));

import { startTelegramConnection, submitTelegramCode } from "./telegram-actions";

beforeEach(() => {
  invoke.mockReset();
  sendCode.mockClear();
});

describe("startTelegramConnection", () => {
  it("sends a login code and returns pending_code", async () => {
    const formData = new FormData();
    formData.set("phone", "+998901234567");
    formData.set("channelUsername", "arioo_uz");

    const result = await startTelegramConnection("uz", { status: "idle" }, formData);

    expect(sendCode).toHaveBeenCalledWith({ apiId: 111, apiHash: "hash" }, "+998901234567");
    expect(result).toEqual({ status: "pending_code" });
  });
});

describe("submitTelegramCode", () => {
  it("returns connected when SignIn succeeds without 2FA", async () => {
    invoke.mockResolvedValueOnce({}); // Api.auth.SignIn resolves without SESSION_PASSWORD_NEEDED

    const formData = new FormData();
    formData.set("code", "12345");

    const result = await submitTelegramCode("uz", { status: "pending_code" }, formData);

    expect(result).toEqual({ status: "connected" });
  });

  it("returns pending_password when Telegram requires 2FA", async () => {
    invoke.mockRejectedValueOnce({ errorMessage: "SESSION_PASSWORD_NEEDED" });

    const formData = new FormData();
    formData.set("code", "12345");

    const result = await submitTelegramCode("uz", { status: "pending_code" }, formData);

    expect(result).toEqual({ status: "pending_password" });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run "src/app/[locale]/(dashboard)/statistics/marketing/telegram-actions.test.ts"`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

```ts
// src/app/[locale]/(dashboard)/statistics/marketing/telegram-actions.ts
"use server";

import { eq } from "drizzle-orm";
import { Api } from "telegram";
import { db } from "@/db/client";
import { telegramChannelConnections } from "@/db/schema/telegram-channel-connection";
import { requireOrganization } from "@/lib/auth/dal";
import { openTelegramClient, telegramApiCredentials } from "@/lib/telegram/client";
import { encryptSessionSecret, decryptSessionSecret } from "@/lib/telegram/session-crypto";
import { finalizeConnection } from "@/lib/telegram/finalize-connection";
import type { TelegramConnectState } from "@/lib/telegram/connect-state";

function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 4) return phone;
  return `${phone.slice(0, phone.length - digits.length + 3)}***${digits.slice(-2)}`;
}

export async function startTelegramConnection(
  locale: string,
  _prevState: TelegramConnectState,
  formData: FormData,
): Promise<TelegramConnectState> {
  const { organization } = await requireOrganization(locale);
  const phone = String(formData.get("phone") ?? "").trim();
  const channelUsername = String(formData.get("channelUsername") ?? "")
    .trim()
    .replace(/^@/, "");
  if (!phone || !channelUsername) {
    return { status: "idle", error: "missing_fields" };
  }

  const client = await openTelegramClient("");
  try {
    const { phoneCodeHash } = await client.sendCode(telegramApiCredentials(), phone);
    const sessionString = client.session.save() as unknown as string;

    await db
      .insert(telegramChannelConnections)
      .values({
        organizationId: organization.id,
        channelUsername,
        phoneMasked: maskPhone(phone),
        sessionSecretEncrypted: encryptSessionSecret(sessionString),
        phoneCodeHash,
        status: "pending_code",
      })
      .onConflictDoUpdate({
        target: telegramChannelConnections.organizationId,
        set: {
          channelUsername,
          phoneMasked: maskPhone(phone),
          sessionSecretEncrypted: encryptSessionSecret(sessionString),
          phoneCodeHash,
          status: "pending_code",
          lastError: null,
          updatedAt: new Date(),
        },
      });

    return { status: "pending_code" };
  } finally {
    await client.disconnect();
  }
}

async function loadConnection(organizationId: string) {
  const [row] = await db
    .select()
    .from(telegramChannelConnections)
    .where(eq(telegramChannelConnections.organizationId, organizationId));
  if (!row?.sessionSecretEncrypted) {
    throw new Error("No in-progress Telegram connection found");
  }
  return row;
}

export async function submitTelegramCode(
  locale: string,
  _prevState: TelegramConnectState,
  formData: FormData,
): Promise<TelegramConnectState> {
  const { organization } = await requireOrganization(locale);
  const code = String(formData.get("code") ?? "").trim();
  const connection = await loadConnection(organization.id);
  const client = await openTelegramClient(decryptSessionSecret(connection.sessionSecretEncrypted!));

  try {
    await client.invoke(
      new Api.auth.SignIn({
        phoneNumber: connection.phoneMasked ?? undefined,
        phoneCodeHash: connection.phoneCodeHash ?? "",
        phoneCode: code,
      }),
    );
    return finalizeConnection({
      organizationId: organization.id,
      channelUsername: connection.channelUsername,
      client,
    });
  } catch (err) {
    const message = (err as { errorMessage?: string }).errorMessage;
    if (message === "SESSION_PASSWORD_NEEDED") {
      const sessionString = client.session.save() as unknown as string;
      await db
        .update(telegramChannelConnections)
        .set({
          status: "pending_password",
          sessionSecretEncrypted: encryptSessionSecret(sessionString),
          updatedAt: new Date(),
        })
        .where(eq(telegramChannelConnections.organizationId, organization.id));
      return { status: "pending_password" };
    }
    return { status: "pending_code", error: "invalid_code" };
  } finally {
    await client.disconnect();
  }
}

export async function submitTelegramPassword(
  locale: string,
  _prevState: TelegramConnectState,
  formData: FormData,
): Promise<TelegramConnectState> {
  const { organization } = await requireOrganization(locale);
  const password = String(formData.get("password") ?? "");
  const connection = await loadConnection(organization.id);
  const client = await openTelegramClient(decryptSessionSecret(connection.sessionSecretEncrypted!));

  try {
    const passwordInfo = await client.invoke(new Api.account.GetPassword());
    const { computeCheck } = await import("telegram/Password");
    const passwordSrpCheck = await computeCheck(passwordInfo, password);
    await client.invoke(new Api.auth.CheckPassword({ password: passwordSrpCheck }));
    return finalizeConnection({
      organizationId: organization.id,
      channelUsername: connection.channelUsername,
      client,
    });
  } catch {
    return { status: "pending_password", error: "invalid_password" };
  } finally {
    await client.disconnect();
  }
}

export async function disconnectTelegramChannel(locale: string): Promise<void> {
  const { organization } = await requireOrganization(locale);
  const [connection] = await db
    .select()
    .from(telegramChannelConnections)
    .where(eq(telegramChannelConnections.organizationId, organization.id));
  if (connection?.sessionSecretEncrypted) {
    const client = await openTelegramClient(decryptSessionSecret(connection.sessionSecretEncrypted));
    try {
      await client.logOut();
    } finally {
      await client.disconnect();
    }
  }
  await db
    .delete(telegramChannelConnections)
    .where(eq(telegramChannelConnections.organizationId, organization.id));
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run "src/app/[locale]/(dashboard)/statistics/marketing/telegram-actions.test.ts"`
Expected: PASS (3 tests).

- [ ] **Step 5: Run the full test suite and type check**

Run: `npx vitest run && npx tsc --noEmit`
Expected: all green.

- [ ] **Step 6: Commit**

```bash
git add src/lib/telegram/connect-state.ts "src/app/[locale]/(dashboard)/statistics/marketing/telegram-actions.ts" "src/app/[locale]/(dashboard)/statistics/marketing/telegram-actions.test.ts"
git commit -m "feat(telegram): add connect/disconnect server actions"
```

---

### Task 7: Channel stats read path

**Files:**
- Create: `src/lib/telegram/channel-stats.ts`
- Test: `src/lib/telegram/channel-stats.test.ts`

**Interfaces:**
- Consumes: `openTelegramClient` (Task 3), `decryptSessionSecret` (Task 2).
- Produces: `getTelegramChannelStats(connection: { channelUsername: string; sessionSecretEncrypted: string }): Promise<TelegramChannelStats>` where
  ```ts
  export type TelegramChannelStats =
    | { available: true; memberCount: number; recentPosts: Array<{ id: number; text: string; views: number; forwards: number }> }
    | { available: false; reason: "not_enough_subscribers" | "unknown" };
  ```
  Task 8's page reads this to render the connected card.

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/telegram/channel-stats.test.ts
import { describe, expect, it, vi, beforeEach } from "vitest";

process.env.TELEGRAM_SESSION_ENCRYPTION_KEY = Buffer.alloc(32, 5).toString("base64");

const invoke = vi.fn();
const disconnect = vi.fn();
vi.mock("@/lib/telegram/client", () => ({
  openTelegramClient: vi.fn().mockResolvedValue({ invoke, disconnect }),
}));

import { encryptSessionSecret } from "./session-crypto";
import { getTelegramChannelStats } from "./channel-stats";

const connection = {
  channelUsername: "arioo_uz",
  sessionSecretEncrypted: encryptSessionSecret("session-string"),
};

beforeEach(() => {
  invoke.mockReset();
});

describe("getTelegramChannelStats", () => {
  it("returns member count and recent posts when stats are available", async () => {
    invoke
      .mockResolvedValueOnce({ full_chat: { participants_count: 1200 } }) // GetFullChannel
      .mockResolvedValueOnce({
        recentPostsInteractions: [
          { views: 340, forwards: 12, msgId: 101 },
        ],
      }); // GetBroadcastStats

    const result = await getTelegramChannelStats(connection);

    expect(result).toEqual({
      available: true,
      memberCount: 1200,
      recentPosts: [{ id: 101, text: "", views: 340, forwards: 12 }],
    });
  });

  it("returns not_enough_subscribers when Telegram rejects the stats request", async () => {
    invoke
      .mockResolvedValueOnce({ full_chat: { participants_count: 40 } })
      .mockRejectedValueOnce({ errorMessage: "STATS_MIGRATE_X" });

    const result = await getTelegramChannelStats(connection);

    expect(result).toEqual({ available: false, reason: "not_enough_subscribers" });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/telegram/channel-stats.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

```ts
// src/lib/telegram/channel-stats.ts
import "server-only";
import { Api } from "telegram";
import { openTelegramClient } from "./client";
import { decryptSessionSecret } from "./session-crypto";

export type TelegramChannelStats =
  | {
      available: true;
      memberCount: number;
      recentPosts: Array<{ id: number; text: string; views: number; forwards: number }>;
    }
  | { available: false; reason: "not_enough_subscribers" | "unknown" };

export async function getTelegramChannelStats(connection: {
  channelUsername: string;
  sessionSecretEncrypted: string;
}): Promise<TelegramChannelStats> {
  const client = await openTelegramClient(decryptSessionSecret(connection.sessionSecretEncrypted));
  try {
    const full = (await client.invoke(
      new Api.channels.GetFullChannel({ channel: connection.channelUsername }),
    )) as unknown as { full_chat: { participants_count: number } };
    const memberCount = full.full_chat.participants_count;

    try {
      const stats = (await client.invoke(
        new Api.stats.GetBroadcastStats({ channel: connection.channelUsername }),
      )) as unknown as {
        recentPostsInteractions: Array<{ msgId: number; views: number; forwards: number }>;
      };
      return {
        available: true,
        memberCount,
        recentPosts: stats.recentPostsInteractions.map((post) => ({
          id: post.msgId,
          text: "",
          views: post.views,
          forwards: post.forwards,
        })),
      };
    } catch {
      return { available: false, reason: "not_enough_subscribers" };
    }
  } finally {
    await client.disconnect();
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/telegram/channel-stats.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/telegram/channel-stats.ts src/lib/telegram/channel-stats.test.ts
git commit -m "feat(telegram): add channel stats read path"
```

---

### Task 8: Connect form component

**Files:**
- Create: `src/components/dashboard/statistics/telegram-connect-form.tsx`

**Interfaces:**
- Consumes: `TelegramConnectState` (Task 4), the 3 bound server actions passed as props from the page (Task 9 wires `.bind(null, locale)`), `Button`/`Input`/`Label` from `@/components/ui/*`.
- Produces: `<TelegramConnectForm startAction={...} submitCodeAction={...} submitPasswordAction={...} initialStatus={...} />` default export used only by Task 9's page.

- [ ] **Step 1: Write the component**

```tsx
// src/components/dashboard/statistics/telegram-connect-form.tsx
"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { TelegramConnectState } from "@/lib/telegram/connect-state";

type BoundAction = (
  prevState: TelegramConnectState,
  formData: FormData,
) => Promise<TelegramConnectState>;

export function TelegramConnectForm({
  startAction,
  submitCodeAction,
  submitPasswordAction,
}: {
  startAction: BoundAction;
  submitCodeAction: BoundAction;
  submitPasswordAction: BoundAction;
}) {
  const t = useTranslations("statistics.marketing.telegram.connect");
  const [startState, startFormAction, startPending] = useActionState(startAction, { status: "idle" });
  const [codeState, codeFormAction, codePending] = useActionState(submitCodeAction, { status: "pending_code" });
  const [passwordState, passwordFormAction, passwordPending] = useActionState(submitPasswordAction, {
    status: "pending_password",
  });

  const step =
    passwordState.status === "connected" || codeState.status === "connected"
      ? "connected"
      : passwordState.status === "pending_password" || codeState.status === "pending_password"
        ? "password"
        : startState.status === "pending_code"
          ? "code"
          : "start";

  if (step === "connected") {
    return <p className="text-sm text-brand">{t("connected")}</p>;
  }

  if (step === "password") {
    return (
      <form action={passwordFormAction} className="flex max-w-sm flex-col gap-3">
        <div className="flex flex-col gap-2">
          <Label htmlFor="password">{t("passwordLabel")}</Label>
          <Input id="password" name="password" type="password" required />
        </div>
        {passwordState.status === "pending_password" && passwordState.error && (
          <p role="alert" className="text-sm text-red-600 dark:text-red-400">
            {t(`errors.${passwordState.error}`)}
          </p>
        )}
        <Button type="submit" disabled={passwordPending} className="w-fit">
          {passwordPending ? t("submitting") : t("confirm")}
        </Button>
      </form>
    );
  }

  if (step === "code") {
    return (
      <form action={codeFormAction} className="flex max-w-sm flex-col gap-3">
        <div className="flex flex-col gap-2">
          <Label htmlFor="code">{t("codeLabel")}</Label>
          <Input id="code" name="code" required />
        </div>
        {codeState.status === "pending_code" && codeState.error && (
          <p role="alert" className="text-sm text-red-600 dark:text-red-400">
            {t(`errors.${codeState.error}`)}
          </p>
        )}
        <Button type="submit" disabled={codePending} className="w-fit">
          {codePending ? t("submitting") : t("confirm")}
        </Button>
      </form>
    );
  }

  return (
    <form action={startFormAction} className="flex max-w-sm flex-col gap-3">
      <p className="text-xs text-muted-foreground">{t("riskWarning")}</p>
      <div className="flex flex-col gap-2">
        <Label htmlFor="phone">{t("phoneLabel")}</Label>
        <Input id="phone" name="phone" type="tel" placeholder="+998901234567" required />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="channelUsername">{t("channelLabel")}</Label>
        <Input id="channelUsername" name="channelUsername" placeholder="arioo_uz" required />
      </div>
      {startState.status === "idle" && startState.error && (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {t(`errors.${startState.error}`)}
        </p>
      )}
      <Button type="submit" disabled={startPending} className="w-fit">
        {startPending ? t("submitting") : t("start")}
      </Button>
    </form>
  );
}
```

- [ ] **Step 2: Verify with a type check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/dashboard/statistics/telegram-connect-form.tsx
git commit -m "feat(telegram): add multi-step connect form component"
```

---

### Task 9: Wire into `/statistics/marketing` + i18n

**Files:**
- Modify: `src/app/[locale]/(dashboard)/statistics/marketing/page.tsx`
- Modify: `messages/uz.json`, `messages/ru.json`, `messages/en.json`
- Modify: `.env.example`

**Interfaces:**
- Consumes: everything from Tasks 1–8.

- [ ] **Step 1: Add Telegram card to the marketing page**

In `src/app/[locale]/(dashboard)/statistics/marketing/page.tsx`, add imports:
```ts
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { telegramChannelConnections } from "@/db/schema/telegram-channel-connection";
import { getTelegramChannelStats } from "@/lib/telegram/channel-stats";
import { TelegramConnectForm } from "@/components/dashboard/statistics/telegram-connect-form";
import { startTelegramConnection, submitTelegramCode, submitTelegramPassword } from "./telegram-actions";
```

Change the existing `await requireOrganization(locale);` line (currently discarding the result) to capture the organization, since the Telegram lookup needs its id:
```ts
const { organization } = await requireOrganization(locale);
```

After `const site = await getSiteAnalytics(...)`, add:
```ts
const [telegramConnection] = await db
  .select()
  .from(telegramChannelConnections)
  .where(eq(telegramChannelConnections.organizationId, organization.id));

const telegramStats =
  telegramConnection?.status === "connected" && telegramConnection.sessionSecretEncrypted
    ? await getTelegramChannelStats(telegramConnection)
    : null;
```

Add a new `<Card>` after the "Sayt" card, before the "channels" placeholder card:
```tsx
<Card>
  <CardHeader>
    <CardTitle>{t("marketing.telegram.title")}</CardTitle>
    <p className="text-sm text-muted-foreground">{t("marketing.telegram.subtitle")}</p>
  </CardHeader>
  <CardContent>
    {telegramConnection?.status === "connected" ? (
      telegramStats?.available ? (
        <div className="flex flex-col gap-3">
          <p className="text-sm">
            {t("marketing.telegram.members")}: <span className="font-medium">{formatNumber(telegramStats.memberCount)}</span>
          </p>
          <ul className="divide-y divide-border rounded-lg border border-border">
            {telegramStats.recentPosts.map((post) => (
              <li key={post.id} className="flex items-center justify-between px-3 py-2 text-sm">
                <span className="text-muted-foreground">#{post.id}</span>
                <span className="font-medium">
                  {formatNumber(post.views)} {t("marketing.telegram.views")}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">{t("marketing.telegram.notEnoughSubscribers")}</p>
      )
    ) : (
      <TelegramConnectForm
        startAction={startTelegramConnection.bind(null, locale)}
        submitCodeAction={submitTelegramCode.bind(null, locale)}
        submitPasswordAction={submitTelegramPassword.bind(null, locale)}
      />
    )}
  </CardContent>
</Card>
```

- [ ] **Step 2: Add translations**

Add to `messages/uz.json` under `statistics.marketing` (alongside the existing `site`/`channels` keys):
```json
"telegram": {
  "title": "Telegram",
  "subtitle": "Kanalingiz a'zolari va postlar statistikasi.",
  "members": "A'zolar",
  "views": "ko'rish",
  "notEnoughSubscribers": "Kanalingiz hali Telegram statistikasiga ega emas (odatda 500+ obunachi kerak).",
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
      "not_channel_admin": "Bu akkaunt ko'rsatilgan kanalga admin emas."
    }
  }
}
```

Add the equivalent `ru` translation to `messages/ru.json`:
```json
"telegram": {
  "title": "Telegram",
  "subtitle": "Статистика участников и постов вашего канала.",
  "members": "Участники",
  "views": "просмотров",
  "notEnoughSubscribers": "У вашего канала пока нет статистики Telegram (обычно нужно 500+ подписчиков).",
  "connect": {
    "riskWarning": "Внимание: это подключит ваш личный аккаунт Telegram. Telegram может ограничить такую автоматизацию — риск касается только подключённого аккаунта.",
    "phoneLabel": "Номер телефона",
    "channelLabel": "Username канала (без @)",
    "codeLabel": "Код из Telegram",
    "passwordLabel": "Пароль двухфакторной аутентификации",
    "start": "Подключить",
    "confirm": "Подтвердить",
    "submitting": "Отправка...",
    "connected": "Telegram-канал подключён.",
    "errors": {
      "missing_fields": "Укажите телефон и username канала.",
      "invalid_code": "Неверный код. Попробуйте ещё раз.",
      "invalid_password": "Неверный пароль. Попробуйте ещё раз.",
      "not_channel_admin": "Этот аккаунт не является администратором указанного канала."
    }
  }
}
```

Add the equivalent `en` translation to `messages/en.json`:
```json
"telegram": {
  "title": "Telegram",
  "subtitle": "Member and post statistics for your channel.",
  "members": "Members",
  "views": "views",
  "notEnoughSubscribers": "Your channel doesn't have Telegram statistics yet (usually needs 500+ subscribers).",
  "connect": {
    "riskWarning": "Note: this connects your personal Telegram account. Telegram may restrict this kind of automation — the risk applies only to the connected account.",
    "phoneLabel": "Phone number",
    "channelLabel": "Channel username (without @)",
    "codeLabel": "Code from Telegram",
    "passwordLabel": "Two-factor password",
    "start": "Connect",
    "confirm": "Confirm",
    "submitting": "Submitting...",
    "connected": "Telegram channel connected.",
    "errors": {
      "missing_fields": "Phone and channel username are required.",
      "invalid_code": "Incorrect code. Try again.",
      "invalid_password": "Incorrect password. Try again.",
      "not_channel_admin": "This account is not an admin of the given channel."
    }
  }
}
```

- [ ] **Step 3: Add env var placeholders**

Add to `.env.example`:
```
TELEGRAM_API_ID=
TELEGRAM_API_HASH=
TELEGRAM_SESSION_ENCRYPTION_KEY=
```

- [ ] **Step 4: Validate JSON and types**

Run:
```bash
for f in messages/en.json messages/ru.json messages/uz.json; do node -e "JSON.parse(require('fs').readFileSync('$f','utf8')); console.log('$f OK')"; done
npx tsc --noEmit
```
Expected: all `OK`, no type errors.

- [ ] **Step 5: Run full test suite + lint**

Run: `npx vitest run && npx eslint src`
Expected: all green.

- [ ] **Step 6: Add an unauthenticated redirect smoke test**

A full connect-flow E2E test needs a real Telegram account and isn't
automatable (per the spec's Test section). The achievable automated
check, matching the existing `tests/e2e/assistants.spec.ts` pattern, is
that the new route is properly gated behind auth. Add to
`tests/e2e/assistants.spec.ts`:

```ts
  test("redirects to sign-in from /statistics/marketing", async ({ page }) => {
    await page.goto("/uz/statistics/marketing");
    await expect(page).toHaveURL(/\/uz\/sign-in/);
  });
```

Run: `npx playwright test tests/e2e/assistants.spec.ts`
Expected: PASS (5 tests). If Playwright browsers aren't installed in
this environment, `npx playwright install` first.

- [ ] **Step 7: Manual browser check**

Start `npm run dev`, sign in, open `/uz/statistics/marketing`. Expected (no `TELEGRAM_API_ID`/`HASH` set locally): the connect form renders (phone + channel inputs, risk warning, "Ulash" button) without crashing. Submitting it is expected to error since no real Telegram API credentials are configured in dev — that's fine; the goal of this check is confirming the page renders and the form is reachable, not a live Telegram login.

- [ ] **Step 8: Commit**

```bash
git add "src/app/[locale]/(dashboard)/statistics/marketing/page.tsx" messages/en.json messages/ru.json messages/uz.json .env.example tests/e2e/assistants.spec.ts
git commit -m "feat(statistics): wire Telegram channel analytics into Marketing kanallari tab"
```
