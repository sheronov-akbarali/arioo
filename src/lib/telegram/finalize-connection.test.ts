import { describe, expect, it, vi, beforeEach } from "vitest";
import type { TelegramClient } from "telegram";

process.env.TELEGRAM_SESSION_ENCRYPTION_KEY = Buffer.alloc(32, 9).toString("base64");

const dbUpdateSet = vi.fn().mockReturnThis();
const dbUpdateWhere = vi.fn().mockResolvedValue(undefined);
// No existing `integrations` row by default — success-path tests exercise the
// insert branch of the integrations sync logic in finalizeConnection().
const dbSelectWhere = vi.fn().mockResolvedValue([]);
const dbInsertReturning = vi.fn().mockResolvedValue([{ id: "integration_1" }]);
const dbInsertValues = vi.fn(() => ({ returning: dbInsertReturning }));
vi.mock("@/db/client", () => ({
  db: {
    update: vi.fn(() => ({ set: dbUpdateSet, where: dbUpdateWhere })),
    select: vi.fn(() => ({ from: vi.fn(() => ({ where: dbSelectWhere })) })),
    insert: vi.fn(() => ({ values: dbInsertValues })),
  },
}));

const invoke = vi.fn();
const sessionSave = vi.fn().mockReturnValue("final-session-string");

function makeClient() {
  return { invoke, session: { save: sessionSave } } as unknown as TelegramClient;
}

import { finalizeConnection } from "./finalize-connection";

beforeEach(() => {
  invoke.mockReset();
  dbUpdateSet.mockClear();
  dbUpdateWhere.mockClear();
  dbSelectWhere.mockClear();
  dbSelectWhere.mockResolvedValue([]);
  dbInsertValues.mockClear();
  dbInsertReturning.mockClear();
  dbInsertReturning.mockResolvedValue([{ id: "integration_1" }]);
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
      expect.objectContaining({ status: "connected", channelTitle: "Arioo kanali", phone: null }),
    );
    expect(invoke).toHaveBeenCalledTimes(2);
  });

  it("rejects and logs out when the account is not an admin", async () => {
    invoke
      .mockResolvedValueOnce({ chats: [{ id: "1", title: "Arioo kanali", accessHash: "h" }] })
      .mockResolvedValueOnce({ participant: { className: "ChannelParticipantSelf" } })
      .mockResolvedValueOnce({});

    const result = await finalizeConnection({
      organizationId: "org_1",
      channelUsername: "arioo_uz",
      client: makeClient(),
    });

    expect(result.status).toBe("error");
    expect(invoke).toHaveBeenCalledTimes(3);
    expect(invoke.mock.calls[2][0].className).toBe("auth.LogOut");
    expect(dbUpdateSet).toHaveBeenCalledWith(expect.objectContaining({ status: "error", phone: null }));
  });

  it("returns channel_not_found when ResolveUsername rejects (typo'd or nonexistent channel)", async () => {
    invoke.mockRejectedValueOnce({ errorMessage: "USERNAME_NOT_OCCUPIED" }); // ResolveUsername

    const result = await finalizeConnection({
      organizationId: "org_1",
      channelUsername: "no_such_channel",
      client: makeClient(),
    });

    expect(result).toEqual({ status: "error", error: "channel_not_found" });
    expect(dbUpdateSet).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "error",
        lastError: "channel_not_found",
        sessionSecretEncrypted: null,
        phoneCodeHash: null,
        phone: null,
      }),
    );
  });

  it("returns channel_not_found when ResolveUsername resolves with an empty chats array", async () => {
    invoke.mockResolvedValueOnce({ chats: [] }); // ResolveUsername

    const result = await finalizeConnection({
      organizationId: "org_1",
      channelUsername: "arioo_uz",
      client: makeClient(),
    });

    expect(result).toEqual({ status: "error", error: "channel_not_found" });
  });

  it("returns channel_not_found when GetParticipant rejects (e.g. CHANNEL_INVALID)", async () => {
    invoke
      .mockResolvedValueOnce({ chats: [{ id: "1", title: "Arioo kanali", accessHash: "h" }] }) // ResolveUsername
      .mockRejectedValueOnce({ errorMessage: "CHANNEL_INVALID" }); // GetParticipant

    const result = await finalizeConnection({
      organizationId: "org_1",
      channelUsername: "arioo_uz",
      client: makeClient(),
    });

    expect(result).toEqual({ status: "error", error: "channel_not_found" });
  });
});
