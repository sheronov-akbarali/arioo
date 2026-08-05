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

async function createSessionForUser(userId: string) {
  const sessionToken = randomUUID();
  const expires = new Date(Date.now() + SESSION_TTL_MS);
  await db.insert(sessions).values({ sessionToken, userId, expires });
  return { sessionToken, userId };
}

export async function completeLogin(input: ProviderInput) {
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
    return createSessionForUser(existingAccount.userId);
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

  return createSessionForUser(user!.id);
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
