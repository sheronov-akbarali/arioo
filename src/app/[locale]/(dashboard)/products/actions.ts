"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/db/client";
import { products, productType } from "@/db/schema/products";
import { requireOrganization } from "@/lib/auth/dal";

export async function createProductAction(locale: string, formData: FormData): Promise<void> {
  const { organization } = await requireOrganization(locale);
  const name = String(formData.get("name") ?? "").trim();
  const type = String(formData.get("type") ?? "");
  const rawPrice = formData.get("priceUZS");
  const priceUZS = rawPrice ? Number(rawPrice) : null;

  if (!name || !productType.enumValues.includes(type as never)) {
    return;
  }

  await db.insert(products).values({
    organizationId: organization.id,
    name,
    type: type as (typeof productType.enumValues)[number],
    priceUZS: priceUZS && priceUZS > 0 ? Math.round(priceUZS) : null,
  });

  revalidatePath(`/${locale}/products`);
}

export async function deleteProductAction(locale: string, productId: string): Promise<void> {
  const { organization } = await requireOrganization(locale);
  const { eq, and } = await import("drizzle-orm");

  await db
    .delete(products)
    .where(and(eq(products.id, productId), eq(products.organizationId, organization.id)));

  revalidatePath(`/${locale}/products`);
}
