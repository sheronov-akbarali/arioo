import { desc, eq, and, ilike, sql } from "drizzle-orm";
import { getTranslations } from "next-intl/server";
import { Package } from "lucide-react";
import { db } from "@/db/client";
import { products, productType, productStatus } from "@/db/schema/products";
import { requireOrganization } from "@/lib/auth/dal";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { formatUZS } from "@/lib/pricing-data";
import { createProductAction } from "./actions";

export default async function ProductsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ status?: string; type?: string; search?: string }>;
}) {
  const { locale } = await params;
  const { status, type, search } = await searchParams;
  const { organization } = await requireOrganization(locale);
  const t = await getTranslations("products");
  const action = createProductAction.bind(null, locale);

  const activeStatus = productStatus.enumValues.find((s) => s === status);
  const activeType = productType.enumValues.find((ty) => ty === type);
  const activeSearch = search?.trim() ?? "";

  const rows = await db
    .select()
    .from(products)
    .where(
      and(
        eq(products.organizationId, organization.id),
        activeStatus ? eq(products.status, activeStatus) : undefined,
        activeType ? eq(products.type, activeType) : undefined,
        activeSearch ? ilike(products.name, `%${activeSearch}%`) : undefined,
      ),
    )
    .orderBy(desc(products.createdAt));

  const statusCounts = await db
    .select({ status: products.status, count: sql<number>`count(*)::int` })
    .from(products)
    .where(eq(products.organizationId, organization.id))
    .groupBy(products.status);
  const countByStatus = new Map(statusCounts.map((row) => [row.status, row.count]));
  const totalCount = statusCounts.reduce((sum, row) => sum + row.count, 0);

  function href(next: { status?: string; type?: string; search?: string }) {
    const query = new URLSearchParams();
    const nextStatus = next.status ?? activeStatus;
    const nextType = next.type ?? activeType;
    const nextSearch = next.search ?? activeSearch;
    if (nextStatus) query.set("status", nextStatus);
    if (nextType) query.set("type", nextType);
    if (nextSearch) query.set("search", nextSearch);
    const qs = query.toString();
    return qs ? `/products?${qs}` : "/products";
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand">
          <Package className="size-5" />
        </span>
        <div>
          <h1 className="text-xl font-semibold">{t("title")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("subtitle")}</p>
          <Badge variant="outline" className="mt-3">
            {t("paymentsNotice")}
          </Badge>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant={!activeStatus ? "default" : "outline"}
          nativeButton={false}
          render={
            <Link href={href({ status: "" })}>
              {t("statusFilters.all")} ({totalCount})
            </Link>
          }
        />
        {productStatus.enumValues.map((s) => (
          <Button
            key={s}
            size="sm"
            variant={activeStatus === s ? "default" : "outline"}
            nativeButton={false}
            render={
              <Link href={href({ status: s })}>
                {t(`status.${s}`)} ({countByStatus.get(s) ?? 0})
              </Link>
            }
          />
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant={!activeType ? "default" : "outline"}
          nativeButton={false}
          render={<Link href={href({ type: "" })}>{t("typeFilters.all")}</Link>}
        />
        {productType.enumValues.map((ty) => (
          <Button
            key={ty}
            size="sm"
            variant={activeType === ty ? "default" : "outline"}
            nativeButton={false}
            render={<Link href={href({ type: ty })}>{t(`types.${ty}`)}</Link>}
          />
        ))}
      </div>

      <form action={`/${locale}/products`} method="get" className="flex gap-2">
        {activeStatus && <input type="hidden" name="status" value={activeStatus} />}
        {activeType && <input type="hidden" name="type" value={activeType} />}
        <Input
          type="text"
          name="search"
          defaultValue={activeSearch}
          placeholder={t("search.placeholder")}
          className="max-w-xs"
        />
        <Button type="submit" size="sm" variant="outline">
          {t("search.apply")}
        </Button>
      </form>

      <Card>
        <CardContent className="pt-6">
          <form action={action} className="grid gap-4 sm:grid-cols-3">
            <div className="flex flex-col gap-2">
              <Label htmlFor="name">{t("form.name")}</Label>
              <Input id="name" name="name" required minLength={2} maxLength={100} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="type">{t("form.type")}</Label>
              <select id="type" name="type" required className="rounded-md border border-input px-3 py-2">
                {productType.enumValues.map((value) => (
                  <option key={value} value={value}>
                    {t(`types.${value}`)}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="priceUZS">{t("form.price")}</Label>
              <Input id="priceUZS" name="priceUZS" type="number" min="0" step="1000" />
            </div>
            <Button type="submit" className="w-fit sm:col-span-3">
              {t("form.submit")}
            </Button>
          </form>
        </CardContent>
      </Card>

      {rows.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border py-16 text-center">
          <span className="flex size-12 items-center justify-center rounded-full bg-brand/10 text-brand">
            <Package className="size-6" />
          </span>
          <div>
            <p className="font-medium">{t("empty")}</p>
            <p className="text-sm text-muted-foreground">{t("emptyHint")}</p>
          </div>
        </div>
      ) : (
        <Card className="p-0">
          <CardContent className="overflow-x-auto p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                  <th className="px-4 py-3 font-medium">{t("table.name")}</th>
                  <th className="px-4 py-3 font-medium">{t("table.type")}</th>
                  <th className="px-4 py-3 font-medium">{t("table.status")}</th>
                  <th className="px-4 py-3 text-right font-medium">{t("table.price")}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((product) => (
                  <tr key={product.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-3 font-medium">{product.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{t(`types.${product.type}`)}</td>
                    <td className="px-4 py-3">
                      <Badge variant="outline">{t(`status.${product.status}`)}</Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {product.priceUZS ? formatUZS(product.priceUZS, t("currency")) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
