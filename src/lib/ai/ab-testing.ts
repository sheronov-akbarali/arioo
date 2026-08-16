import "server-only";
import { eq, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { aiAgents } from "@/db/schema/agents";
import { conversations } from "@/db/schema/conversations";
import { abTests } from "@/db/schema/ab-tests";

const MIN_SAMPLE_TO_AUTO_CONCLUDE = 25;

export function readConversationMetadata(raw: string | null): Record<string, string> {
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

/** Sticky per-conversation variant assignment — a conversation keeps the
 * same prompt variant for its whole lifetime instead of re-rolling every
 * message. */
export async function assignAbVariant(
  conversationId: string,
  currentMetadata: Record<string, string>,
  activeTest: typeof abTests.$inferSelect
): Promise<"A" | "B"> {
  if (currentMetadata.abVariant === "A" || currentMetadata.abVariant === "B") {
    return currentMetadata.abVariant;
  }

  const variant: "A" | "B" = Math.random() * 100 < activeTest.trafficSplit ? "A" : "B";
  await db
    .update(abTests)
    .set({
      variantAConversations: variant === "A" ? sql`${abTests.variantAConversations} + 1` : abTests.variantAConversations,
      variantBConversations: variant === "B" ? sql`${abTests.variantBConversations} + 1` : abTests.variantBConversations,
    })
    .where(eq(abTests.id, activeTest.id));

  await db
    .update(conversations)
    .set({ metadata: JSON.stringify({ ...currentMetadata, abVariant: variant, abTestId: activeTest.id }) })
    .where(eq(conversations.id, conversationId));

  return variant;
}

async function maybeAutoConclude(testId: string): Promise<void> {
  const [test] = await db.select().from(abTests).where(eq(abTests.id, testId));
  if (!test || test.status !== "running") return;
  if (test.variantAConversations < MIN_SAMPLE_TO_AUTO_CONCLUDE || test.variantBConversations < MIN_SAMPLE_TO_AUTO_CONCLUDE) {
    return;
  }

  const rateA = test.variantAConversions / Math.max(1, test.variantAConversations);
  const rateB = test.variantBConversions / Math.max(1, test.variantBConversations);
  if (rateA === rateB) return;
  const winner: "A" | "B" = rateA > rateB ? "A" : "B";

  const winningPrompt = winner === "A" ? test.variantAPrompt : test.variantBPrompt;
  await db.update(aiAgents).set({ systemPrompt: winningPrompt }).where(eq(aiAgents.id, test.agentId));
  await db
    .update(abTests)
    .set({ status: "concluded", winnerVariant: winner, endedAt: new Date() })
    .where(eq(abTests.id, testId));
}

/** A conversation "converts" once, the first time it produces a real signal
 * of purchase intent (e.g. a payment invoice was created in-chat). */
export async function recordConversationConversion(conversationId: string): Promise<void> {
  const [conversation] = await db.select().from(conversations).where(eq(conversations.id, conversationId));
  if (!conversation) return;

  const metadata = readConversationMetadata(conversation.metadata);
  if (metadata.abConversionCounted === "1") return;
  const testId = metadata.abTestId;
  const variant = metadata.abVariant;
  if (!testId || (variant !== "A" && variant !== "B")) return;

  await db
    .update(abTests)
    .set({
      variantAConversions: variant === "A" ? sql`${abTests.variantAConversions} + 1` : abTests.variantAConversions,
      variantBConversions: variant === "B" ? sql`${abTests.variantBConversions} + 1` : abTests.variantBConversions,
    })
    .where(eq(abTests.id, testId));

  await db
    .update(conversations)
    .set({ metadata: JSON.stringify({ ...metadata, abConversionCounted: "1" }) })
    .where(eq(conversations.id, conversationId));

  await maybeAutoConclude(testId);
}
