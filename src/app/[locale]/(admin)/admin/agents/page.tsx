import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { db } from "@/db/client";
import { aiAgents } from "@/db/schema/agents";
import { organizations } from "@/db/schema/org";
import { desc, eq } from "drizzle-orm";
import { Bot, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";

export default async function AdminAgentsPage() {
  const allAgents = await db.select({
    agent: aiAgents,
    org: organizations
  })
    .from(aiAgents)
    .leftJoin(organizations, eq(aiAgents.organizationId, organizations.id))
    .orderBy(desc(aiAgents.createdAt));

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Bot className="size-5" /> Barcha AI Xodimlar
          </CardTitle>
          <Button variant="default" size="sm">Yangi AI qoshish</Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ismi (Rol)</TableHead>
                <TableHead>Tashkilot</TableHead>
                <TableHead>Holati</TableHead>
                <TableHead>Sana</TableHead>
                <TableHead className="text-right">Boshqaruv</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {allAgents.map(({ agent, org }) => (
                <TableRow key={agent.id}>
                  <TableCell className="font-medium">
                    <div className="flex flex-col">
                      <span>{agent.name}</span>
                      <span className="text-xs text-muted-foreground">{agent.role}</span>
                    </div>
                  </TableCell>
                  <TableCell>{org?.name || "Noma'lum"}</TableCell>
                  <TableCell>
                    <Badge variant={agent.status === "active" ? "default" : "secondary"}>
                      {agent.status === "active" ? "Faol" : "Qoralama"}
                    </Badge>
                  </TableCell>
                  <TableCell>{new Date(agent.createdAt).toLocaleDateString("uz-UZ")}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon">
                      <MoreHorizontal className="size-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {allAgents.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-6 text-muted-foreground">
                    Hali hech qanday AI xodim yaratilmagan.
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
