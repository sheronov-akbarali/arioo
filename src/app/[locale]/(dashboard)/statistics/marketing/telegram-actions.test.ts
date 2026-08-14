import { describe, expect, it, vi, beforeEach } from "vitest";
import { encryptSessionSecret } from "@/lib/telegram/session-crypto";

process.env.TELEGRAM_SESSION_ENCRYPTION_KEY = Buffer.alloc(32, 3).toString("base64");
process.env.TELEGRAM_API_ID = "111";
process.env.TELEGRAM_API_HASH = "hash";

vi.mock("@/lib/auth/dal", () => ({
  requireOrganization: vi.fn().mockResolvedValue({ organization: { id: "org_1" } }),
}));

// vi.mock factories are hoisted above all other top-level statements
// (including local `const`s) once the real module under test is imported,
// because that import is itself hoisted ahead of local code. Referencing a
// plain `const` from inside a factory then hits the TDZ. `vi.hoisted()` is
// vitest's documented escape hatch: it hoists the variable initialization
// together with the mock factories that need it.
const { sendCode, invoke, disconnect, sessionSave } = vi.hoisted(() => ({
  sendCode: vi.fn().mockResolvedValue({ phoneCodeHash: "hash123" }),
  invoke: vi.fn(),
  disconnect: vi.fn(),
  sessionSave: vi.fn().mockReturnValue("mid-session-string"),
}));

vi.mock("@/lib/telegram/client", () => ({
  openTelegramClient: vi.fn().mockResolvedValue({
    sendCode,
    invoke,
    disconnect,
    session: { save: sessionSave },
  }),
  telegramApiCredentials: vi.fn().mockReturnValue({ apiId: 111, apiHash: "hash" }),
}));

const { dbValues, dbOnConflict, dbReturning, dbSelectWhere } = vi.hoisted(() => ({
  dbValues: vi.fn().mockReturnThis(),
  dbOnConflict: vi.fn().mockReturnThis(),
  dbReturning: vi.fn().mockResolvedValue([{ id: "conn_1" }]),
  // Resolved value is filled in below, once TELEGRAM_SESSION_ENCRYPTION_KEY
  // is guaranteed to be set — vi.hoisted() runs before the process.env
  // assignments at the top of this file, so calling encryptSessionSecret()
  // here would throw "TELEGRAM_SESSION_ENCRYPTION_KEY is not set".
  dbSelectWhere: vi.fn(),
}));
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

dbSelectWhere.mockResolvedValue([
  {
    id: "conn_1",
    organizationId: "org_1",
    phoneCodeHash: "hash123",
    // Must be a real ciphertext, not null: loadConnection() requires a
    // truthy sessionSecretEncrypted, and submitTelegramCode/Password pass it
    // straight into the real (unmocked) decryptSessionSecret().
    sessionSecretEncrypted: encryptSessionSecret("mid-session-string"),
    channelUsername: "arioo_uz",
    phoneMasked: "+998***67",
  },
]);

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
