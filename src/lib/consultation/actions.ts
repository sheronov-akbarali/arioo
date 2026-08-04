"use server";

import { headers } from "next/headers";
import { parseConsultationInput } from "./schema";
import { checkRateLimit } from "./rate-limit";
import { sendLeadNotification } from "./telegram";

export type ConsultationState = {
  status: "idle" | "success" | "error";
  message?: string;
};

export async function submitConsultationAction(
  _prevState: ConsultationState,
  formData: FormData,
): Promise<ConsultationState> {
  const parsed = parseConsultationInput({
    name: formData.get("name"),
    phone: formData.get("phone"),
  });

  if (!parsed.success) {
    return { status: "error", message: "validation" };
  }

  const headerList = await headers();
  const ip = headerList.get("x-forwarded-for") ?? "unknown";

  if (!checkRateLimit(ip)) {
    return { status: "error", message: "rateLimit" };
  }

  // Telegram failures are logged inside sendLeadNotification and never
  // surfaced to the visitor — a lost notification should not look like a
  // broken form.
  await sendLeadNotification(parsed.data);

  return { status: "success" };
}
