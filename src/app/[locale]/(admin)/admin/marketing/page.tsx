import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Gift, TrendingUp, Users } from "lucide-react";

import { db } from "@/db/client";
import { promocodes } from "@/db/schema/marketing";
import { organizationReferrals } from "@/db/schema/referrals";
import { desc, sql } from "drizzle-orm";
import { createPromocodeAction, deletePromocodeAction } from "../actions";

export default async function AdminMarketingPage() {
  const allCodes = await db.select().from(promocodes).orderBy(desc(promocodes.createdAt));
  const activeCount = allCodes.filter(c => c.status === "active").length;

  const referralsResult = await db.select({ count: sql<number>`count(*)` }).from(organizationReferrals);
  const totalReferrals = referralsResult[0]?.count || 0;

  const totalDiscountValue = allCodes.reduce((acc, code) => {
    const discountVal = parseInt(code.discount) || 0;
    return acc + (discountVal * code.usageCount);
  }, 0);

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Gift className="size-4" /> Faol Promokodlar
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeCount} ta</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="size-4" /> Chegirmalar qadri
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalDiscountValue.toLocaleString("uz-UZ")} UZS</div>
            <p className="text-xs text-muted-foreground mt-1">Ushbu oyda berilgan chegirmalar</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Users className="size-4" /> Referal orqali
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalReferrals} ta mijoz</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Yangi Promokod Yaratish</CardTitle>
            <CardDescription>
              Mijozlarni jalb qilish uchun maxsus chegirma kodini yarating.
            </CardDescription>
          </CardHeader>
          <form action={createPromocodeAction}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Promokod (Masalan: VIP20)</Label>
                <Input name="code" placeholder="Kodni kiriting..." className="uppercase" required />
              </div>
              <div className="space-y-2">
                <Label>Chegirma miqdori (%) yoki so'm</Label>
                <Input name="discount" placeholder="20" type="number" required />
              </div>
            </CardContent>
            <CardFooter>
              <Button type="submit">Yaratish</Button>
            </CardFooter>
          </form>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Promokodlar Tarixi</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Kod</TableHead>
                  <TableHead>Chegirma</TableHead>
                  <TableHead>Ishlatildi</TableHead>
                  <TableHead>Holati</TableHead>
                  <TableHead className="text-right">Harakat</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {allCodes.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-mono font-medium">{c.code}</TableCell>
                    <TableCell>{c.discount}</TableCell>
                    <TableCell>{c.usageCount} marta</TableCell>
                    <TableCell>
                      {c.status === "active" ? (
                        <Badge variant="outline" className="border-green-500 text-green-600">Faol</Badge>
                      ) : (
                        <Badge variant="secondary">Eski</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <form action={deletePromocodeAction.bind(null, c.id)}>
                        <Button type="submit" variant="ghost" size="sm" className="text-red-500">O'chirish</Button>
                      </form>
                    </TableCell>
                  </TableRow>
                ))}
                {allCodes.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-6 text-muted-foreground">Hozircha hech qanday promokod yo'q.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
