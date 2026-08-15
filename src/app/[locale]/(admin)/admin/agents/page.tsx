import { Bot, Sparkles, Building2, Calendar } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { db } from "@/db/client";
import { aiAgents } from "@/db/schema/agents";
import { organizations } from "@/db/schema/org";
import { desc, eq } from "drizzle-orm";
import { toggleAgentStatusAction, deleteAgentAction } from "../actions";
import { EditAgentDialog } from "@/components/admin/edit-agent-dialog";

export default async function AdminAgentsPage() {
  const allAgents = await db
    .select({
      agent: aiAgents,
      org: organizations,
    })
    .from(aiAgents)
    .leftJoin(organizations, eq(aiAgents.organizationId, organizations.id))
    .orderBy(desc(aiAgents.createdAt));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-red-500/10 text-red-600">
          <Bot className="size-5" />
        </span>
        <div>
          <h1 className="text-xl font-semibold">Barcha AI Xodimlar va Agentlar</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Platformadagi barcha mijozlarning AI agentlarini ko'rish, promptlarini tahrirlash va holatini boshqarish
          </p>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Sparkles className="size-4 text-brand" /> Yaratilgan AI Xodimlar Ro'yxati
            </CardTitle>
            <CardDescription>
              Har bir agentning roli, tizim prompti va tegishli tashkiloti
            </CardDescription>
          </div>
          <Badge variant="outline">{allAgents.length} ta agent</Badge>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Agent Nomi / Roli</TableHead>
                <TableHead>Tashkilot</TableHead>
                <TableHead>Model / Holati</TableHead>
                <TableHead>Yaratilgan sana</TableHead>
                <TableHead className="text-right">Boshqaruv</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {allAgents.map(({ agent, org }) => (
                <TableRow key={agent.id} className="hover:bg-muted/30">
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2.5">
                      <div className="size-8 rounded-lg bg-brand/10 text-brand flex items-center justify-center font-bold text-xs">
                        <Bot className="size-4" />
                      </div>
                      <div className="flex flex-col">
                        <span className="font-semibold text-sm">{agent.name}</span>
                        <span className="text-xs text-muted-foreground truncate max-w-[220px]">
                          {agent.role}
                        </span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5 text-xs font-medium">
                      <Building2 className="size-3.5 text-muted-foreground" />
                      {org?.name || "Noma'lum"}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1 items-start">
                      <Badge
                        variant={agent.status === "active" ? "default" : "secondary"}
                        className="text-[10px]"
                      >
                        {agent.status === "active" ? "Faol" : "Qoralama"}
                      </Badge>
                      <span className="font-mono text-[10px] text-muted-foreground">
                        {agent.model || "gpt-4o-mini"}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Calendar className="size-3" />
                      {new Date(agent.createdAt).toLocaleDateString("uz-UZ")}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <EditAgentDialog
                        agent={{
                          id: agent.id,
                          name: agent.name,
                          role: agent.role,
                          status: agent.status,
                          systemPrompt: agent.systemPrompt,
                        }}
                      />

                      <form action={toggleAgentStatusAction}>
                        <input type="hidden" name="agentId" value={agent.id} />
                        <Button type="submit" variant="ghost" size="sm" className="h-8 text-xs">
                          {agent.status === "active" ? "To'xtatish" : "Faollashtirish"}
                        </Button>
                      </form>

                      <form action={deleteAgentAction}>
                        <input type="hidden" name="agentId" value={agent.id} />
                        <Button type="submit" variant="ghost" size="sm" className="h-8 text-xs text-destructive hover:bg-destructive/10">
                          O'chirish
                        </Button>
                      </form>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {allAgents.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="text-center py-8 text-muted-foreground"
                  >
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
