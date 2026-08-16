import "server-only";
import { eq, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { messageTemplates } from "@/db/schema/message-templates";

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter((word) => word.length >= 3);
}

/**
 * Finds the org's message template whose title/category best matches the
 * customer's message, via keyword overlap. Not a full embedding search, but
 * a real, cheap, always-available retrieval — replaces the previous no-op
 * where templates were saved but never consulted at chat time.
 */
export async function findMatchingMessageTemplate(
  organizationId: string,
  userMessage: string
): Promise<{ id: string; title: string; body: string } | null> {
  const messageWords = new Set(tokenize(userMessage));
  if (messageWords.size === 0) return null;

  const templates = await db
    .select({ id: messageTemplates.id, title: messageTemplates.title, body: messageTemplates.body, category: messageTemplates.category })
    .from(messageTemplates)
    .where(eq(messageTemplates.organizationId, organizationId));

  let best: { id: string; title: string; body: string } | null = null;
  let bestScore = 0;

  for (const template of templates) {
    const templateWords = tokenize(`${template.title} ${template.category}`);
    const overlap = templateWords.filter((word) => messageWords.has(word)).length;
    if (overlap > bestScore) {
      bestScore = overlap;
      best = { id: template.id, title: template.title, body: template.body };
    }
  }

  if (!best || bestScore === 0) return null;

  await db
    .update(messageTemplates)
    .set({ usageCount: sql`${messageTemplates.usageCount} + 1` })
    .where(eq(messageTemplates.id, best.id));

  return best;
}
