import { describe, it, expect, vi } from "vitest";
import { generateUzumReviewReply, generateUzumQuestionReply } from "./client";

vi.mock("ai", () => ({
  generateText: vi.fn().mockImplementation(async ({ prompt }: { prompt: string }) => {
    if (prompt.includes("Baho: 5 / 5")) {
      return { text: "Xaridingiz va ijobiy bahoingiz uchun katta rahmat! Do'konimizda sizni yana kutib qolamiz." };
    }
    if (prompt.includes("Baho: 2 / 5")) {
      return { text: "Fikringiz uchun rahmat. Yuzaga kelgan noqulaylik uchun uzr so'raymiz." };
    }
    return { text: "Assalomu alaykum! Mahsulotimiz do'konimizda mavjud, buyurtma berishingiz mumkin." };
  }),
}));

describe("Uzum Market Client & Helpers", () => {
  it("generates positive fallback reply for 5-star review", async () => {
    const reply = await generateUzumReviewReply({
      review: {
        id: "rev_1",
        rating: 5,
        customerName: "Aziz",
        comment: "Juda sifatli ekan, tez yetkazib berishdi!",
        productTitle: "Smart Soat",
        createdAt: "2026-08-16",
      },
      shopName: "TechStore",
    });

    expect(reply).toBeDefined();
    expect(typeof reply).toBe("string");
    expect(reply).toContain("rahmat");
  });

  it("generates polite support-oriented reply for low rating review", async () => {
    const reply = await generateUzumReviewReply({
      review: {
        id: "rev_2",
        rating: 2,
        customerName: "Dilshod",
        comment: "Rangi boshqacha kelib qolibdi",
        productTitle: "Futbolka",
        createdAt: "2026-08-16",
      },
      shopName: "TechStore",
    });

    expect(reply).toBeDefined();
    expect(typeof reply).toBe("string");
    expect(reply).toContain("uzr");
  });

  it("generates question reply for product inquiry", async () => {
    const reply = await generateUzumQuestionReply({
      question: {
        id: "q_1",
        customerName: "Malika",
        productTitle: "Krossovka",
        questionText: "38-razmeri bormi?",
        createdAt: "2026-08-16",
      },
      shopName: "TechStore",
    });

    expect(reply).toBeDefined();
    expect(typeof reply).toBe("string");
    expect(reply).toContain("Assalomu alaykum");
  });
});
