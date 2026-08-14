import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MessageSquare, CheckCircle2, Clock } from "lucide-react";

import { db } from "@/db/client";
import { tickets } from "@/db/schema/tickets";
import { organizations } from "@/db/schema/org";
import { desc, eq, count } from "drizzle-orm";

export default async function AdminTicketsPage() {
  const allTickets = await db.select({
    ticket: tickets,
    org: organizations
  })
    .from(tickets)
    .leftJoin(organizations, eq(tickets.organizationId, organizations.id))
    .orderBy(desc(tickets.createdAt));

  const openCount = allTickets.filter(t => t.ticket.status === "open").length;
  const inProgressCount = allTickets.filter(t => t.ticket.status === "in_progress").length;
  const closedCount = allTickets.filter(t => t.ticket.status === "closed").length;

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <MessageSquare className="size-4" /> Yangi murojaatlar
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{openCount} ta</div>
            <p className="text-xs text-muted-foreground mt-1">Kutish rejimida</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Clock className="size-4" /> Ko'rib chiqilmoqda
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{inProgressCount} ta</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <CheckCircle2 className="size-4" /> Yopilgan
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{closedCount} ta</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Mijozlar Murojaatlari (Tickets)</CardTitle>
          <CardDescription>Platforma foydalanuvchilaridan kelgan savol va muammolarni hal qilish.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ticket ID</TableHead>
                <TableHead>Mijoz</TableHead>
                <TableHead>Mavzu</TableHead>
                <TableHead>Sana</TableHead>
                <TableHead>Holati</TableHead>
                <TableHead className="text-right">Harakat</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {allTickets.map(({ ticket, org }) => (
                <TableRow key={ticket.id}>
                  <TableCell className="font-mono text-xs">{ticket.id.slice(0, 8)}</TableCell>
                  <TableCell className="font-medium">{org?.name || "Noma'lum"}</TableCell>
                  <TableCell>{ticket.subject}</TableCell>
                  <TableCell>{new Date(ticket.createdAt).toLocaleDateString("uz-UZ")}</TableCell>
                  <TableCell>
                    {ticket.status === "open" && <Badge variant="destructive">Yangi</Badge>}
                    {ticket.status === "in_progress" && <Badge variant="secondary" className="bg-yellow-500/10 text-yellow-600 border-none">Jarayonda</Badge>}
                    {ticket.status === "closed" && <Badge variant="outline" className="text-muted-foreground">Yopilgan</Badge>}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="outline" size="sm">Javob berish</Button>
                  </TableCell>
                </TableRow>
              ))}
              {allTickets.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-6 text-muted-foreground">Hozircha hech qanday murojaat yo'q.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
