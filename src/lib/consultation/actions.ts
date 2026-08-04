"use server";

import { headers } from "next/headers";
import { parseConsultationInput } from "./schema";
import { checkRateLimit } from "./rate-limit";
import { sendLeadNotification } from "./telegram";

export type ConsultationState = {
  status: "idle" | "success" | "error";
  message?: "validation" | "invalidPhone" | "rateLimit";
  // Echoed back on error so the form can re-populate its (uncontrolled) inputs
  // — React 19 resets them once the action resolves, which would otherwise
  // force the visitor to retype everything after a validation failure.
  values?: { name: string; phone: string };
  // Bumped on every error so the form can re-key (and therefore remount with
  // fresh `defaultValue`s) even when the visitor resubmits identical input.
  attempt?: number;
};

export async function submitConsultationAction(
  prevState: ConsultationState,
  formData: FormData,
): Promise<ConsultationState> {
  const attempt = (prevState.attempt ?? 0) + 1;
  const rawName = formData.get("name");
  const rawPhone = formData.get("phone");
  const values = {
    name: typeof rawName === "string" ? rawName : "",
    phone: typeof rawPhone === "string" ? rawPhone : "",
  };

  const parsed = parseConsultationInput({ name: rawName, phone: rawPhone });

  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.field === "phone" ? "invalidPhone" : "validation",
      values,
      attempt,
    };
  }

  const headerList = await headers();
  // Prefer `x-real-ip`: it is set by the trusted edge/proxy layer, whereas the
  // leftmost `x-forwarded-for` entry is client-supplied and therefore trivially
  // spoofable. MVP-level mitigation only — Vercel's actual trusted-IP header
  // conventions should be revisited before real launch.
  const ip = headerList.get("x-real-ip") ?? headerList.get("x-forwarded-for") ?? "unknown";

  if (!checkRateLimit(ip)) {
    return { status: "error", message: "rateLimit", values, attempt };
  }

  // Telegram failures are logged inside sendLeadNotification and never
  // surfaced to the visitor — a lost notification should not look like a
  // broken form.
  await sendLeadNotification(parsed.data);

  return { status: "success" };
}
