import { describe, expect, it, vi, beforeEach } from "vitest";

const { connectMock, TelegramClientMock } = vi.hoisted(() => {
  const connectMock = vi.fn().mockResolvedValue(undefined);
  const TelegramClientMock = vi.fn(function (this: Record<string, unknown>) {
    this.connect = connectMock;
  });
  return { connectMock, TelegramClientMock };
});

vi.mock("telegram", () => ({ TelegramClient: TelegramClientMock }));
vi.mock("telegram/sessions", () => {
  const StringSessionMock = vi.fn(function (this: Record<string, unknown>, s: string) {
    this.__session = s;
  });
  return { StringSession: StringSessionMock };
});

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
      expect.objectContaining({ connectionRetries: 5, autoReconnect: false }),
    );
    expect(connectMock).toHaveBeenCalledOnce();
    expect(client).toBeDefined();
  });
});
