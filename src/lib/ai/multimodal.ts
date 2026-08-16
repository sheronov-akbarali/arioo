import "server-only";
import { generateText } from "ai";
import { resolveModel } from "./gateway";

/**
 * Multimodal AI Helper for Arioo
 * Handles Speech-to-Text (transcription) and Vision (Image/Receipt OCR & Analysis)
 */

export type ImageAnalysisResult = {
  description: string;
  isReceipt?: boolean;
  receiptData?: {
    amount?: number;
    currency?: string;
    transactionId?: string;
    date?: string;
    status?: "success" | "pending" | "failed";
  };
};

/**
 * Transcribe Audio Buffer/URL using OpenAI Whisper or Fallback
 */
export async function transcribeAudio(params: {
  audioBuffer?: Buffer;
  audioUrl?: string;
  mimeType?: string;
  language?: string;
}): Promise<string> {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey && !params.audioBuffer && !params.audioUrl) {
      return "[Ovozli xabar qabul qilindi, ammo audio transkripsiya kaliti sozlanmagan]";
    }

    if (params.audioUrl && !params.audioBuffer) {
      const audioRes = await fetch(params.audioUrl);
      const arrayBuffer = await audioRes.arrayBuffer();
      params.audioBuffer = Buffer.from(arrayBuffer);
    }

    if (params.audioBuffer && apiKey) {
      const formData = new FormData();
      const blob = new Blob([new Uint8Array(params.audioBuffer)], {
        type: params.mimeType || "audio/ogg",
      });
      formData.append("file", blob, "voice.ogg");
      formData.append("model", "whisper-1");
      if (params.language) {
        formData.append("language", params.language);
      }

      const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        return data.text || "[Ovozli xabar bo'sh]";
      }
    }

    return "[Ovozli xabar: Audio transkripsiya qilindi]";
  } catch (error) {
    console.error("Failed to transcribe audio:", error);
    return "[Ovozli xabar: audioni eshitishda texnik xatolik yuz berdi]";
  }
}

/**
 * Analyze Image (Receipt, Product, Screenshot) using Vision AI
 */
export async function analyzeImageWithVision(params: {
  imageUrl?: string;
  imageBuffer?: Buffer;
  mimeType?: string;
  prompt?: string;
  modelId?: string;
}): Promise<ImageAnalysisResult> {
  const customPrompt =
    params.prompt ||
    `Ushbu tasvirni diqqat bilan tahlil qiling. Agar bu to'lov cheki bo'lsa (Payme, Click, Uzum, bank cheki):
1. To'lov summasi
2. Tranzaksiya/Chek raqami
3. Sana va vaqti
4. Holati (Muvaffaqiyatli/Kutilmoqda)
haqida ma'lumot bering. Agar bu mahsulot yoki tovar rasmi bo'lsa, mahsulot turi, rangi, modeli haqida qisqa va aniq ma'lumot bering. O'zbek tilida javob bering.`;

  try {
    let base64Image = "";
    const mime = params.mimeType || "image/jpeg";

    if (params.imageBuffer) {
      base64Image = `data:${mime};base64,${params.imageBuffer.toString("base64")}`;
    } else if (params.imageUrl) {
      if (params.imageUrl.startsWith("data:")) {
        base64Image = params.imageUrl;
      } else {
        const res = await fetch(params.imageUrl);
        const arrayBuf = await res.arrayBuffer();
        base64Image = `data:${mime};base64,${Buffer.from(arrayBuf).toString("base64")}`;
      }
    }

    if (!base64Image) {
      return { description: "[Rasm yuklandi, ammo tahlil qilib bo'lmadi]" };
    }

    const { text } = await generateText({
      model: resolveModel(params.modelId || "openai/gpt-5.4"),
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: customPrompt },
            { type: "image", image: base64Image },
          ],
        },
      ],
    });

    const isReceipt =
      /to'lov|chek|summa|so'm|uzs|tranzaksiya|payme|click|uzum|bank/i.test(text);

    // Extract amount if present
    const amountMatch = text.match(/([\d\s.,]{3,})\s*(so'm|uzs|sum)/i);
    const amount = amountMatch
      ? Number(amountMatch[1].replace(/[\s,.]/g, ""))
      : undefined;

    return {
      description: text,
      isReceipt,
      receiptData: isReceipt
        ? {
            amount: isNaN(amount as number) ? undefined : amount,
            currency: "UZS",
            status: /muvaffaqiyatli|tasdiqlandi|o'tdi/i.test(text)
              ? "success"
              : "pending",
          }
        : undefined,
    };
  } catch (error) {
    console.error("Failed to analyze image with vision:", error);
    return {
      description:
        "[Yuborilgan rasm qabul qilindi. Tasvir tahlili vaqtinchalik mavjud emas]",
    };
  }
}
