import { z } from "zod";

export const announcementSchema = z.object({
  title: z.string().min(3, "Sarlavha kamida 3 ta belgidan iborat bo'lishi kerak").max(200),
  content: z.string().max(2000).optional().nullable(),
  type: z.enum(["info", "warning"]).default("info"),
});

export const promocodeSchema = z.object({
  code: z
    .string()
    .min(2, "Kod kamida 2 ta belgidan iborat bo'lishi kerak")
    .max(30)
    .regex(/^[A-Za-z0-9_-]+$/, "Kodni faqat harf va raqamlardan iborat qiling"),
  discount: z.string().min(1, "Chegirma miqdori kiritilishi shart").max(50),
});

export const ticketStatusSchema = z.enum(["open", "in_progress", "closed"]);

export const orgPlanSchema = z.enum(["freemium", "start", "pro", "enterprise"]);

export const messageTemplateSchema = z.object({
  title: z.string().min(2, "Sarlavha kamida 2 ta belgi bo'lishi kerak").max(100),
  body: z.string().min(5, "Xabar matni kamida 5 ta belgi bo'lishi kerak").max(3000),
  category: z.string().default("general"),
});

export const abTestSchema = z.object({
  name: z.string().min(3, "Test nomi kamida 3 ta belgi bo'lishi kerak").max(100),
  variantAPrompt: z.string().min(10, "Variant A prompti kamida 10 ta belgi bo'lishi kerak"),
  variantBPrompt: z.string().min(10, "Variant B prompti kamida 10 ta belgi bo'lishi kerak"),
  trafficSplit: z.coerce.number().min(10).max(90).default(50),
});

export const whitelabelSchema = z.object({
  appName: z.string().min(2).max(50),
  logoUrl: z.string().url("To'g'ri rasm URL manzilini kiriting").or(z.literal("")),
  primaryColor: z
    .string()
    .regex(/^#([0-9A-Fa-f]{6}|[0-9A-Fa-f]{3})$/, "To'g'ri HEX rang kodini kiriting (masalan, #0f172a)"),
  customDomain: z.string().max(100).optional().nullable(),
});
