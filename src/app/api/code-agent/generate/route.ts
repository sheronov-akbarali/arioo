import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { generateText } from "ai";
import { db } from "@/db/client";
import { memberships } from "@/db/schema/org";
import { resolveModel } from "@/lib/ai/gateway";

const SYSTEM_PROMPT = `Siz Arioo platformasi (arioo.uz) uchun integratsiya kodi yozuvchi yordamchisiz.
Arioo — O'zbekiston bizneslari uchun AI xodim ijaraga olish B2B SaaS platformasi.

Foydalanuvchi tavsiflagan integratsiya stsenariysi uchun ishlaydigan, ixcham kod yozing.
Qoidalar:
- Faqat bitta kod bloki qaytaring, izohsiz muqaddima yoki xulosa yozmang.
- Kod tilini stsenariydan kelib chiqib tanlang (odatda Node.js/TypeScript), agar foydalanuvchi
  boshqa til so'rasa o'sha tilda yozing.
- Arioo REST API bazasi: https://arioo.uz/api. Agent bilan suhbat: POST
  /api/agents/{agentId}/chat, Authorization: Bearer <API_KEY>. Webhook qabul qilish:
  POST /api/webhooks/{channel}/{CHANNEL_ID}.
- Kodda qisqa, foydali izohlar bo'lishi mumkin, lekin ortiqcha bo'lmasin.
- Xayoliy funksiyalar yoki mavjud bo'lmagan Arioo endpoint'larini o'ylab topmang.`;

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 401 });
  }

  const [membership] = await db
    .select()
    .from(memberships)
    .where(eq(memberships.userId, userId));
  if (!membership) {
    return NextResponse.json({ error: "Tashkilot topilmadi" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const prompt = typeof body?.prompt === "string" ? body.prompt.trim() : "";
  if (!prompt) {
    return NextResponse.json({ error: "So'rov matni kiritilmagan" }, { status: 400 });
  }
  if (prompt.length > 1000) {
    return NextResponse.json({ error: "So'rov matni juda uzun (max 1000 belgi)" }, { status: 400 });
  }

  try {
    const { text } = await generateText({
      model: resolveModel("anthropic/claude-sonnet-4.5"),
      system: SYSTEM_PROMPT,
      prompt,
    });

    const code = text.replace(/^```[\w-]*\n?/, "").replace(/```\s*$/, "").trim();
    return NextResponse.json({ code });
  } catch (error) {
    console.error("code-agent generate failed", error);
    return NextResponse.json({ error: "Kod generatsiyasi muvaffaqiyatsiz tugadi, qayta urinib ko'ring" }, { status: 502 });
  }
}
