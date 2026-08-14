import { describe, expect, it, vi, beforeEach } from "vitest";
import type { TelegramClient } from "telegram";

process.env.TELEGRAM_SESSION_ENCRYPTION_KEY = Buffer.alloc(32, 9).toString("base64");

const dbUpdateSet = vi.fn().mockReturnThis();
const dbUpdateWhere = vi.fn().mockResolvedValue(undefined);
vi.mock("@/db/client", () => ({
  db: {
    update: vi.fn(() => ({ set: dbUpdateSet, where: dbUpdateWhere })),
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
});
