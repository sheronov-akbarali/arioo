import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { organizationCredits } from "@/db/schema/billing";

// No top-up/checkout flow writes to organization_credit yet, so most orgs
// have no row — treat that as a real, valid zero balance rather than an error.
export async function getOrganizationCredits(organizationId: string) {
  const [row] = await db
    .select()
    .from(organizationCredits)
    .where(eq(organizationCredits.organizationId, organizationId));

  return row ?? { organizationId, balance: 0, bonusBalance: 0, updatedAt: null };
}
