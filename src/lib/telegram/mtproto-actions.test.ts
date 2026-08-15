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

const { dbValues, dbOnConflict, dbReturning, dbSelectWhere, dbDeleteWhere } = vi.hoisted(() => ({
  dbValues: vi.fn().mockReturnThis(),
  dbOnConflict: vi.fn().mockReturnThis(),
  dbReturning: vi.fn().mockResolvedValue([{ id: "conn_1" }]),
  // Resolved value is filled in below, once TELEGRAM_SESSION_ENCRYPTION_KEY
  // is guaranteed to be set — vi.hoisted() runs before the process.env
  // assignments at the top of this file, so calling encryptSessionSecret()
  // here would throw "TELEGRAM_SESSION_ENCRYPTION_KEY is not set".
  dbSelectWhere: vi.fn(),
  dbDeleteWhere: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("@/db/client", () => ({
  db: {
    insert: vi.fn(() => ({ values: dbValues, onConflictDoUpdate: dbOnConflict, returning: dbReturning })),
    select: vi.fn(() => ({ from: vi.fn(() => ({ where: dbSelectWhere })) })),
    update: vi.fn(() => ({ set: vi.fn().mockReturnThis(), where: vi.fn().mockResolvedValue(undefined) })),
    delete: vi.fn(() => ({ where: dbDeleteWhere })),
  },
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const { finalizeConnection } = vi.hoisted(() => ({
  finalizeConnection: vi.fn().mockResolvedValue({ status: "connected" }),
}));
vi.mock("@/lib/telegram/finalize-connection", () => ({ finalizeConnection }));

import { startTelegramConnection, submitTelegramCode, disconnectTelegramChannel } from "./mtproto-actions";

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
    // Real, unmasked phone — required for Api.auth.SignIn's phoneNumber to
    // match what sendCode() was originally called with. phoneMasked is
    // display-only and must never be sent back to Telegram's API.
    phone: "+998901234567",
  },
]);

beforeEach(() => {
  invoke.mockReset();
  sendCode.mockClear();
  disconnect.mockClear();
  finalizeConnection.mockClear();
  finalizeConnection.mockResolvedValue({ status: "connected" });
  dbDeleteWhere.mockClear();
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

  it("normalizes a pasted t.me link into a bare username before storing/sending it", async () => {
    const formData = new FormData();
    formData.set("phone", "+998901234567");
    formData.set("channelUsername", "https://t.me/Avtotest_Plus_Uz");

    const result = await startTelegramConnection("uz", { status: "idle" }, formData);

    expect(result).toEqual({ status: "pending_code" });
    expect(dbValues).toHaveBeenCalledWith(expect.objectContaining({ channelUsername: "Avtotest_Plus_Uz" }));
  });

  it("rejects a private invite link without ever calling sendCode", async () => {
    const formData = new FormData();
    formData.set("phone", "+998901234567");
    formData.set("channelUsername", "https://t.me/+AbCdEf123");

    const result = await startTelegramConnection("uz", { status: "idle" }, formData);

    expect(result).toEqual({ status: "idle", error: "invalid_channel_format" });
    expect(sendCode).not.toHaveBeenCalled();
  });
});

describe("submitTelegramCode", () => {
  it("returns connected when SignIn succeeds without 2FA", async () => {
    invoke.mockResolvedValueOnce({}); // Api.auth.SignIn resolves without SESSION_PASSWORD_NEEDED

    const formData = new FormData();
    formData.set("code", "12345");

    const result = await submitTelegramCode("uz", { status: "pending_code" }, formData);

    expect(result).toEqual({ status: "connected" });
    // Api.auth.SignIn must receive the real phone number, not the
    // display-formatted phoneMasked string — Telegram matches it against
    // the number sendCode() was originally called with.
    expect(invoke).toHaveBeenCalledWith(
      expect.objectContaining({ phoneNumber: "+998901234567", phoneCode: "12345" }),
    );
  });

  it("returns pending_password when Telegram requires 2FA", async () => {
    invoke.mockRejectedValueOnce({ errorMessage: "SESSION_PASSWORD_NEEDED" });

    const formData = new FormData();
    formData.set("code", "12345");

    const result = await submitTelegramCode("uz", { status: "pending_code" }, formData);

    expect(result).toEqual({ status: "pending_password" });
  });

  it("awaits finalizeConnection before disconnecting the client (regression: `return finalizeConnection(...)` in a try block does not await before `finally` runs)", async () => {
    invoke.mockResolvedValueOnce({}); // Api.auth.SignIn resolves without SESSION_PASSWORD_NEEDED

    const callOrder: string[] = [];
    finalizeConnection.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          setTimeout(() => {
            callOrder.push("finalizeConnection");
            resolve({ status: "connected" });
          }, 0);
        }),
    );
    disconnect.mockImplementationOnce(async () => {
      callOrder.push("disconnect");
    });

    const formData = new FormData();
    formData.set("code", "12345");

    const result = await submitTelegramCode("uz", { status: "pending_code" }, formData);

    expect(result).toEqual({ status: "connected" });
    expect(disconnect).toHaveBeenCalledTimes(1);
    expect(callOrder).toEqual(["finalizeConnection", "disconnect"]);
  });
});

describe("disconnectTelegramChannel", () => {
  it("still deletes the connection row when Api.auth.LogOut throws (revoked session, AUTH_KEY_UNREGISTERED, etc.)", async () => {
    invoke.mockRejectedValueOnce({ errorMessage: "AUTH_KEY_UNREGISTERED" }); // Api.auth.LogOut

    await disconnectTelegramChannel("uz");

    expect(dbDeleteWhere).toHaveBeenCalledTimes(1);
    expect(disconnect).toHaveBeenCalledTimes(1);
  });
});
