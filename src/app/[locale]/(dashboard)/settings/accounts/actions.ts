"use server";

import { revalidatePath } from "next/cache";
import { verifySession } from "@/lib/auth/dal";
import { unlinkProvider } from "@/lib/auth/session";

export async function unlinkAccountAction(
  locale: string,
  provider: string,
  providerAccountId: string,
): Promise<{ ok: boolean; error?: string }> {
  const { user } = await verifySession(locale);
  const result = await unlinkProvider({ userId: user.id, provider, providerAccountId });
  if (result.ok) revalidatePath(`/${locale}/settings/accounts`);
  return result.ok ? { ok: true } : { ok: false, error: result.error };
}
