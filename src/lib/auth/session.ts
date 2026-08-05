import "server-only";
import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { accounts, sessions, users } from "@/db/schema/auth";

const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

type ProviderInput = {
  provider: string;
  providerAccountId: string;
  email: string | null;
  name: string | null;
  image: string | null;
};

// Thrown instead of letting the `users.email` unique-index violation bubble
// up raw. We deliberately do NOT auto-link a new provider identity to an
// existing user just because the emails match (an attacker who controls a
// victim's email at a *different* provider could otherwise hijack the
// account) — so first-time sign-in with a second provider that happens to
// share an email must fail safely, not silently join accounts and not crash.
export class EmailAlreadyInUseError extends Error {
  constructor(email: string) {
    super(`A user with email ${email} already exists`);
    this.name = "EmailAlreadyInUseError";
  }
}

async function createSessionForUser(
  userId: string,
  meta?: { userAgent?: string | null; ipAddress?: string | null },
) {
  const sessionToken = randomUUID();
  const expires = new Date(Date.now() + SESSION_TTL_MS);
  await db.insert(sessions).values({
    sessionToken,
    userId,
    expires,
    userAgent: meta?.userAgent ?? null,
    ipAddress: meta?.ipAddress ?? null,
  });
  return { sessionToken, userId, expires };
}

export async function completeLogin(
  input: ProviderInput,
  meta?: { userAgent?: string | null; ipAddress?: string | null },
) {
  const [existingAccount] = await db
    .select()
    .from(accounts)
    .where(
      and(
        eq(accounts.provider, input.provider),
        eq(accounts.providerAccountId, input.providerAccountId),
      ),
    );

  if (existingAccount) {
    return createSessionForUser(existingAccount.userId, meta);
  }

  if (input.email) {
    const [existingUser] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, input.email));
    if (existingUser) {
      throw new EmailAlreadyInUseError(input.email);
    }
  }

  const [user] = await db
    .insert(users)
    .values({ name: input.name, email: input.email, image: input.image })
    .returning();

  await db.insert(accounts).values({
    userId: user!.id,
    type: "oauth",
    provider: input.provider,
    providerAccountId: input.providerAccountId,
  });

  return createSessionForUser(user!.id, meta);
}

export async function linkProviderToUser(
  input: ProviderInput & { userId: string },
): Promise<{ ok: true } | { ok: false; error: "already_linked_to_another_user" }> {
  const [existingAccount] = await db
    .select()
    .from(accounts)
    .where(
      and(
        eq(accounts.provider, input.provider),
        eq(accounts.providerAccountId, input.providerAccountId),
      ),
    );

  if (existingAccount && existingAccount.userId !== input.userId) {
    return { ok: false, error: "already_linked_to_another_user" };
  }
  if (existingAccount) {
    return { ok: true }; // already linked to this same user — idempotent
  }

  await db.insert(accounts).values({
    userId: input.userId,
    type: "oauth",
    provider: input.provider,
    providerAccountId: input.providerAccountId,
  });
  return { ok: true };
}

export async function unlinkProvider(input: {
  userId: string;
  provider: string;
  providerAccountId: string;
}): Promise<{ ok: true } | { ok: false; error: "last_account" }> {
  const linkedAccounts = await db
    .select()
    .from(accounts)
    .where(eq(accounts.userId, input.userId));

  if (linkedAccounts.length <= 1) {
    return { ok: false, error: "last_account" };
  }

  await db
    .delete(accounts)
    .where(
      and(
        eq(accounts.provider, input.provider),
        eq(accounts.providerAccountId, input.providerAccountId),
        eq(accounts.userId, input.userId),
      ),
    );
  return { ok: true };
}
