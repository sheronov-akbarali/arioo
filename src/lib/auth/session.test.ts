import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { afterEach, describe, expect, it } from "vitest";
import { db } from "@/db/client";
import { accounts, sessions, users } from "@/db/schema/auth";
import { completeLogin, linkProviderToUser, unlinkProvider } from "./session";

const createdUserIds: string[] = [];

afterEach(async () => {
  for (const userId of createdUserIds.splice(0)) {
    await db.delete(users).where(eq(users.id, userId));
  }
});

describe("completeLogin", () => {
  it("creates a new user and account on first login", async () => {
    const providerAccountId = randomUUID();
    const result = await completeLogin({
      provider: "google",
      providerAccountId,
      email: `${providerAccountId}@example.com`,
      name: "Akbarali",
      image: null,
    });
    createdUserIds.push(result.userId);

    const [session] = await db
      .select()
      .from(sessions)
      .where(eq(sessions.sessionToken, result.sessionToken));
    expect(session?.userId).toBe(result.userId);

    const [account] = await db
      .select()
      .from(accounts)
      .where(eq(accounts.providerAccountId, providerAccountId));
    expect(account?.userId).toBe(result.userId);
  });

  it("reuses the same user on a second login with the same provider account", async () => {
    const providerAccountId = randomUUID();
    const first = await completeLogin({
      provider: "google",
      providerAccountId,
      email: null,
      name: null,
      image: null,
    });
    createdUserIds.push(first.userId);

    const second = await completeLogin({
      provider: "google",
      providerAccountId,
      email: null,
      name: null,
      image: null,
    });

    expect(second.userId).toBe(first.userId);
    expect(second.sessionToken).not.toBe(first.sessionToken);
  });
});

describe("linkProviderToUser / unlinkProvider", () => {
  it("links a second provider to an existing user", async () => {
    const login = await completeLogin({
      provider: "google",
      providerAccountId: randomUUID(),
      email: null,
      name: null,
      image: null,
    });
    createdUserIds.push(login.userId);

    const result = await linkProviderToUser({
      userId: login.userId,
      provider: "github",
      providerAccountId: randomUUID(),
      email: null,
      name: null,
      image: null,
    });

    expect(result).toEqual({ ok: true });
    const linked = await db
      .select()
      .from(accounts)
      .where(eq(accounts.userId, login.userId));
    expect(linked).toHaveLength(2);
  });

  it("refuses to link a provider account already owned by someone else", async () => {
    const providerAccountId = randomUUID();
    const ownerLogin = await completeLogin({
      provider: "github",
      providerAccountId,
      email: null,
      name: null,
      image: null,
    });
    createdUserIds.push(ownerLogin.userId);

    const otherLogin = await completeLogin({
      provider: "google",
      providerAccountId: randomUUID(),
      email: null,
      name: null,
      image: null,
    });
    createdUserIds.push(otherLogin.userId);

    const result = await linkProviderToUser({
      userId: otherLogin.userId,
      provider: "github",
      providerAccountId,
      email: null,
      name: null,
      image: null,
    });

    expect(result).toEqual({ ok: false, error: "already_linked_to_another_user" });
  });

  it("refuses to unlink the last remaining provider", async () => {
    const login = await completeLogin({
      provider: "google",
      providerAccountId: randomUUID(),
      email: null,
      name: null,
      image: null,
    });
    createdUserIds.push(login.userId);

    const [onlyAccount] = await db
      .select()
      .from(accounts)
      .where(eq(accounts.userId, login.userId));

    const result = await unlinkProvider({
      userId: login.userId,
      provider: onlyAccount!.provider,
      providerAccountId: onlyAccount!.providerAccountId,
    });

    expect(result).toEqual({ ok: false, error: "last_account" });
  });

  it("unlinks a provider when at least one other remains", async () => {
    const login = await completeLogin({
      provider: "google",
      providerAccountId: randomUUID(),
      email: null,
      name: null,
      image: null,
    });
    createdUserIds.push(login.userId);
    const githubAccountId = randomUUID();
    await linkProviderToUser({
      userId: login.userId,
      provider: "github",
      providerAccountId: githubAccountId,
      email: null,
      name: null,
      image: null,
    });

    const result = await unlinkProvider({
      userId: login.userId,
      provider: "github",
      providerAccountId: githubAccountId,
    });

    expect(result).toEqual({ ok: true });
    const remaining = await db
      .select()
      .from(accounts)
      .where(eq(accounts.userId, login.userId));
    expect(remaining).toHaveLength(1);
  });
});
