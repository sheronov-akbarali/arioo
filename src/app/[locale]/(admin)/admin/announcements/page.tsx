import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Megaphone } from "lucide-react";

import { db } from "@/db/client";
import { announcements } from "@/db/schema/announcements";
import { desc } from "drizzle-orm";

export default async function AdminAnnouncementsPage() {
  const allAnnouncements = await db.select().from(announcements).orderBy(desc(announcements.createdAt));

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Megaphone className="size-5" /> Yangi E'lon Yuborish
          </CardTitle>
          <CardDescription>
            Barcha mijozlarning shaxsiy kabinetida ko'rinadigan global bildirishnoma yaratish.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>E'lon sarlavhasi</Label>
            <Input placeholder="Masalan: Tizimda yangilanishlar bo'ldi..." />
          </div>
          <div className="space-y-2">
            <Label>Batafsil matn (ixtiyoriy)</Label>
            <Input placeholder="E'lon haqida to'liq ma'lumot..." />
          </div>
        </CardContent>
        <CardFooter>
          <Button>Barchaga yuborish</Button>
        </CardFooter>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Yuborilgan E'lonlar</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Sarlavha</TableHead>
                <TableHead>Turi</TableHead>
                <TableHead>Sana</TableHead>
                <TableHead>Holati</TableHead>
                <TableHead className="text-right">Harakat</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {allAnnouncements.map((a) => (
                <TableRow key={a.id}>
                  <TableCell className="font-medium">{a.title}</TableCell>
                  <TableCell>
                    {a.type === "info" && <Badge className="bg-blue-500 hover:bg-blue-600">Ma'lumot</Badge>}
                    {a.type === "warning" && <Badge className="bg-orange-500 hover:bg-orange-600">Ogohlantirish</Badge>}
                  </TableCell>
                  <TableCell>{new Date(a.createdAt).toLocaleDateString("uz-UZ")}</TableCell>
                  <TableCell>
                    {a.isActive ? <Badge variant="outline" className="border-green-500 text-green-600">Faol (Ko'rinmoqda)</Badge> : <Badge variant="secondary">Eski</Badge>}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" className="text-red-500">O'chirish</Button>
                  </TableCell>
                </TableRow>
              ))}
              {allAnnouncements.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-6 text-muted-foreground">Hozircha hech qanday e'lon yo'q.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
