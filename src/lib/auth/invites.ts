import "server-only";
import { z } from "zod";

const emailSchema = z.email();

export function parseInviteEmail(
  input: unknown,
): { success: true; data: string } | { success: false; error: string } {
  const result = emailSchema.safeParse(input);
  if (!result.success) {
    return { success: false, error: result.error.issues[0]?.message ?? "Invalid email" };
  }
  return { success: true, data: result.data };
}

export function isInviteValid(invite: { status: string; expiresAt: Date }): boolean {
  return invite.status === "pending" && invite.expiresAt.getTime() > Date.now();
}
