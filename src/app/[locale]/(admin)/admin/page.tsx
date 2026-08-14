import { notFound } from "next/navigation";
import { currentUser } from "@clerk/nextjs/server";
import { ShieldAlert, Users, Database, Activity } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { db } from "@/db/client";
import { organizations, memberships } from "@/db/schema/org";
import { aiAgents } from "@/db/schema/agents";
import { desc, count, sql } from "drizzle-orm";

export default async function AdminPanelPage() {
  // Barcha tashkilotlar soni
  const [orgCountRow] = await db.select({ count: count() }).from(organizations);
  const totalOrgs = orgCountRow.count;

  // Barcha foydalanuvchilar (membership) soni
  const [memberCountRow] = await db.select({ count: count() }).from(memberships);
  const totalUsers = memberCountRow.count;
  
  // Barcha AI xodimlar soni
  const [agentCountRow] = await db.select({ count: count() }).from(aiAgents);
  const totalAgents = agentCountRow.count;

  // Eng so'nggi ro'yxatdan o'tgan tashkilotlar
  const recentOrgs = await db.select()
    .from(organizations)
    .orderBy(desc(organizations.createdAt))
    .limit(5);

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 sm:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
              <Users className="size-4" /> Barcha Tashkilotlar
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{totalOrgs}</p>
            <p className="text-xs text-muted-foreground">Platformadagi barcha mijozlar</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
              <ShieldAlert className="size-4" /> Foydalanuvchilar
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{totalUsers}</p>
            <p className="text-xs text-muted-foreground">Jamoa a'zolari bilan birga</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
              <Database className="size-4" /> Faol AI Xodimlar
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{totalAgents}</p>
            <p className="text-xs text-muted-foreground">Yaratilgan barcha agentlar</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
              <Activity className="size-4" /> Tizim holati
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">Normal</p>
            <p className="text-xs text-muted-foreground">Barcha xizmatlar ishlamoqda</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Yaqinda qo'shilgan tashkilotlar</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nomi</TableHead>
                <TableHead>Soha</TableHead>
                <TableHead>Tarifi</TableHead>
                <TableHead>Sana</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentOrgs.map((org) => (
                <TableRow key={org.id}>
                  <TableCell className="font-medium">{org.name}</TableCell>
                  <TableCell>{org.industry || "Boshqa"}</TableCell>
                  <TableCell><Badge variant="outline">{org.plan}</Badge></TableCell>
                  <TableCell>{new Date(org.createdAt).toLocaleDateString("uz-UZ")}</TableCell>
                </TableRow>
              ))}
              {recentOrgs.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-4 text-muted-foreground">Hozircha tashkilotlar yo'q</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
