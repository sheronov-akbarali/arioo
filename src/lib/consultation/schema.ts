import { z } from "zod";

const consultationSchema = z.object({
  name: z.string().trim().min(2).max(100),
  phone: z
    .string()
    .trim()
    .regex(/^\+998\d{9}$/, "Phone must match +998XXXXXXXXX"),
});

export type ConsultationInput = z.infer<typeof consultationSchema>;

export function parseConsultationInput(
  input: unknown,
):
  | { success: true; data: ConsultationInput }
  | { success: false; error: string } {
  const result = consultationSchema.safeParse(input);
  if (!result.success) {
    return { success: false, error: result.error.issues[0]?.message ?? "Invalid input" };
  }
  return { success: true, data: result.data };
}
