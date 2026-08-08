import { z } from "zod";

// Reject control/format characters (newlines in particular): the name is
// interpolated into a multi-line Telegram notification, so a "\n" inside it
// could forge extra lines in that message.
const NO_CONTROL_CHARS = /^[^\p{Cc}\p{Cf}]+$/u;

const consultationSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2)
    .max(100)
    .regex(NO_CONTROL_CHARS, "Name must not contain control characters"),
  phone: z
    .string()
    .trim()
    .regex(/^\+998\d{9}$/, "Phone must match +998XXXXXXXXX"),
  source: z.string().max(40).optional(),
});

export type ConsultationInput = z.infer<typeof consultationSchema>;

// `field` tells the caller *which* input failed so the UI can show a specific
// message (e.g. the "+998XXXXXXXXX" hint) instead of one generic error.
export type ConsultationParseResult =
  | { success: true; data: ConsultationInput }
  | { success: false; error: string; field: "name" | "phone" | "unknown" };

export function parseConsultationInput(input: unknown): ConsultationParseResult {
  const result = consultationSchema.safeParse(input);
  if (!result.success) {
    const issue = result.error.issues[0];
    const path = issue?.path[0];
    const field = path === "name" || path === "phone" ? path : "unknown";
    return { success: false, error: issue?.message ?? "Invalid input", field };
  }
  return { success: true, data: result.data };
}
