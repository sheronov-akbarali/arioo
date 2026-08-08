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
