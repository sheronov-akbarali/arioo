import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { db } from "@/db/client";
import { organizations } from "@/db/schema/org";
import { desc } from "drizzle-orm";
import { CreditCard, Wallet, ArrowUpRight } from "lucide-react";

export default async function AdminBillingPage() {
  // Haqiqiy loyihada bu yerda maxsus 'transactions' yoki 'invoices' jadvaliga so'rov bo'lishi kerak.
  // Hozirgi schema bo'yicha biz tashkilotlarni (organizations) va ularning moliya/tarif holatini ko'rsatamiz.
  const allOrgs = await db.select()
    .from(organizations)
    .orderBy(desc(organizations.createdAt));

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Wallet className="size-4" /> Umumiy Tushum
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">14,250,000 UZS</div>
            <p className="text-xs text-green-500 flex items-center mt-1">
              <ArrowUpRight className="size-3 mr-1" /> +12% o'tgan oydan
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <CreditCard className="size-4" /> Faol Obunalar (PRO)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {allOrgs.filter(o => o.plan === "pro").length} ta
            </div>
            <p className="text-xs text-muted-foreground mt-1">Jami tashkilotlardan</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Mijozlar to'lovi va tariflari</CardTitle>
          <CardDescription>Barcha tashkilotlarning hozirgi billing holati va ularni o'zgartirish.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tashkilot nomi</TableHead>
                <TableHead>Tarifi (Plan)</TableHead>
                <TableHead>Holati</TableHead>
                <TableHead>To'lov sanasi</TableHead>
                <TableHead className="text-right">Boshqaruv</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {allOrgs.map((org) => (
                <TableRow key={org.id}>
                  <TableCell className="font-medium">{org.name}</TableCell>
                  <TableCell>
                    <Badge variant={org.plan === "pro" ? "default" : "outline"} className="uppercase">
                      {org.plan}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="bg-green-500/10 text-green-600 border-none">To'langan</Badge>
                  </TableCell>
                  <TableCell>{new Date(org.createdAt).toLocaleDateString("uz-UZ")}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="outline" size="sm">Tarifni o'zgartirish</Button>
                  </TableCell>
                </TableRow>
              ))}
              {allOrgs.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-6 text-muted-foreground">
                    Ma'lumot topilmadi.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
