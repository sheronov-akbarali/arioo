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

  it("includes a Manba line when source is present", async () => {
    vi.stubEnv("TELEGRAM_BOT_TOKEN", "test-token");
    vi.stubEnv("TELEGRAM_LEADS_CHAT_ID", "12345");
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);

    await sendLeadNotification({
      name: "Akbarali",
      phone: "+998901234567",
      source: "partners",
    });

    const [, init] = fetchMock.mock.calls[0];
    const body = JSON.parse(init.body);
    expect(body.text).toBe(
      "Yangi lid — Arioo\nIsm: Akbarali\nTelefon: +998901234567\nManba: partners",
    );
  });

  it("omits the Manba line when source is absent", async () => {
    vi.stubEnv("TELEGRAM_BOT_TOKEN", "test-token");
    vi.stubEnv("TELEGRAM_LEADS_CHAT_ID", "12345");
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);

    await sendLeadNotification({ name: "Akbarali", phone: "+998901234567" });

    const [, init] = fetchMock.mock.calls[0];
    const body = JSON.parse(init.body);
    expect(body.text).toBe("Yangi lid — Arioo\nIsm: Akbarali\nTelefon: +998901234567");
  });
});
