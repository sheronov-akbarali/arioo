import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { db } from "@/db/client";
import { organizations } from "@/db/schema/org";
import { desc } from "drizzle-orm";

export default async function AdminUsersPage() {
  const allOrgs = await db.select()
    .from(organizations)
    .orderBy(desc(organizations.createdAt));

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Barcha Mijozlar va Tashkilotlar</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tashkilot ID</TableHead>
                <TableHead>Nomi</TableHead>
                <TableHead>Tarifi</TableHead>
                <TableHead>Yaratilgan</TableHead>
                <TableHead className="text-right">Harakatlar</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {allOrgs.map((org) => (
                <TableRow key={org.id}>
                  <TableCell className="font-mono text-xs text-muted-foreground">{org.id.split('-')[0]}...</TableCell>
                  <TableCell className="font-medium">{org.name}</TableCell>
                  <TableCell><Badge variant="outline">{org.plan}</Badge></TableCell>
                  <TableCell>{new Date(org.createdAt).toLocaleDateString("uz-UZ")}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="outline" size="sm">Tahrirlash</Button>
                  </TableCell>
                </TableRow>
              ))}
              {allOrgs.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-4 text-muted-foreground">Tashkilotlar topilmadi</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
