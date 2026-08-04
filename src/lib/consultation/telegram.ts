// Hard-fails the build if this module is ever pulled into a client bundle —
// it reads TELEGRAM_BOT_TOKEN and must stay server-side.
import "server-only";

export async function sendLeadNotification(lead: {
  name: string;
  phone: string;
}): Promise<{ ok: boolean }> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_LEADS_CHAT_ID;

  if (!token || !chatId) {
    console.error("TELEGRAM_BOT_TOKEN or TELEGRAM_LEADS_CHAT_ID is not set");
    return { ok: false };
  }

  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: `Yangi lid — TayanchAI\nIsm: ${lead.name}\nTelefon: ${lead.phone}`,
      }),
    });
    return { ok: response.ok };
  } catch (error) {
    console.error("Failed to send lead notification to Telegram", error);
    return { ok: false };
  }
}
