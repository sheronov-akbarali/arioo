import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { organizationReferrals } from "@/db/schema/referrals";

function generateCode(organizationId: string): string {
  return organizationId.replace(/-/g, "").slice(0, 8).toUpperCase();
}

// Every org gets a stable referral code derived from its own id, created
// lazily on first visit to the referral page rather than backfilled for
// every org up front.
export async function getOrCreateReferralAccount(organizationId: string) {
  const [existing] = await db
    .select()
    .from(organizationReferrals)
    .where(eq(organizationReferrals.organizationId, organizationId));
  if (existing) return existing;

  const [created] = await db
    .insert(organizationReferrals)
    .values({ organizationId, code: generateCode(organizationId) })
    .onConflictDoNothing()
    .returning();
  if (created) return created;

  const [row] = await db
    .select()
    .from(organizationReferrals)
    .where(eq(organizationReferrals.organizationId, organizationId));
  return row!;
}
