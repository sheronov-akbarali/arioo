import {
  Users,
  Bot,
  Wallet,
  Activity,
  ArrowRight,
  Megaphone,
} from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { db } from "@/db/client";
import { organizations, memberships } from "@/db/schema/org";
import { aiAgents } from "@/db/schema/agents";
import { conversations, messages } from "@/db/schema/conversations";
import { creditTransactions } from "@/db/schema/billing";
import { desc, count, sql, eq } from "drizzle-orm";

export default async function AdminPanelPage() {
  // Counts
  const [[orgCountRow], [memberCountRow], [agentCountRow], [convCountRow], [msgCountRow]] = await Promise.all([
    db.select({ count: count() }).from(organizations),
    db.select({ count: count() }).from(memberships),
    db.select({ count: count() }).from(aiAgents),
    db.select({ count: count() }).from(conversations),
    db.select({ count: count() }).from(messages),
  ]);

  const totalOrgs = orgCountRow.count;
  const totalUsers = memberCountRow.count;
  const totalAgents = agentCountRow.count;
  const totalConversations = convCountRow.count;
  const totalMessages = msgCountRow.count;

  // Total revenue
  const totalRevenueResult = await db
    .select({
      total: sql<number>`COALESCE(SUM(${creditTransactions.amount}), 0)`,
    })
    .from(creditTransactions)
    .where(eq(creditTransactions.type, "topup"));

  const totalRevenue = Number(totalRevenueResult[0]?.total || 0);

  // Recent organizations
  const recentOrgs = await db
    .select()
    .from(organizations)
    .orderBy(desc(organizations.createdAt))
    .limit(6);

  // Recent conversations
  const recentConversations = await db
    .select({
      conv: conversations,
      agent: aiAgents,
    })
    .from(conversations)
    .leftJoin(aiAgents, eq(conversations.agentId, aiAgents.id))
    .orderBy(desc(conversations.startedAt))
    .limit(6);

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Arioo SuperAdmin Boshqaruv Markazi</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Platformaning barcha tashkilotlari, foydalanuvchilari, AI agentlari va moliyaviy oqimlarini boshqaring
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button nativeButton={false} size="sm" variant="outline" className="gap-1.5" render={<Link href="/admin/announcements" />}>
            <Megaphone className="size-3.5" /> E'lon berish
          </Button>
          <Button nativeButton={false} size="sm" className="gap-1.5" render={<Link href="/admin/users" />}>
            <Users className="size-3.5" /> Foydalanuvchilarni tahlil qilish
          </Button>
        </div>
      </div>

      {/* Main KPI Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold uppercase text-muted-foreground flex items-center justify-between">
              <span>Barcha Mijozlar</span>
              <Users className="size-4 text-brand" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{totalOrgs}</p>
            <p className="text-xs text-muted-foreground mt-1">{totalUsers} ta faol jamoa a'zosi</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold uppercase text-muted-foreground flex items-center justify-between">
              <span>AI Agentlar & Suhbatlar</span>
              <Bot className="size-4 text-blue-600" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{totalAgents} ta</p>
            <p className="text-xs text-muted-foreground mt-1">{totalConversations} ta dialog / {totalMessages} ta xabar</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold uppercase text-muted-foreground flex items-center justify-between">
              <span>Umumiy Tushum (Top-up)</span>
              <Wallet className="size-4 text-emerald-600" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-emerald-600 font-mono">
              {new Intl.NumberFormat("uz-UZ").format(totalRevenue)} UZS
            </p>
            <p className="text-xs text-muted-foreground mt-1">Payme / Click orqali to'ldirilgan</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold uppercase text-muted-foreground flex items-center justify-between">
              <span>Tizim Infratuzilmasi</span>
              <Activity className="size-4 text-emerald-600" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <span className="size-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <p className="text-lg font-bold text-emerald-700 dark:text-emerald-400">100% Barqaror</p>
            </div>
            <p className="text-xs text-muted-foreground mt-1">OpenAI, Neon DB, Webhooklar faol</p>
          </CardContent>
        </Card>
      </div>

      {/* Two Column Section */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Organizations */}
        <Card>
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base">Eng So'nggi Qo'shilgan Tashkilotlar</CardTitle>
              <CardDescription>Yangi ro'yxatdan o'tgan mijozlar</CardDescription>
            </div>
            <Button nativeButton={false} size="sm" variant="ghost" className="text-xs gap-1" render={<Link href="/admin/users" />}>
              Barchasi <ArrowRight className="size-3" />
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nomi</TableHead>
                  <TableHead>Soha</TableHead>
                  <TableHead>Tarif</TableHead>
                  <TableHead className="text-right">Sana</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentOrgs.map((org) => (
                  <TableRow key={org.id} className="hover:bg-muted/30">
                    <TableCell className="font-semibold text-sm">{org.name}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{org.industry || "Boshqa"}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="uppercase text-[10px]">
                        {org.plan}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right text-xs text-muted-foreground font-mono">
                      {new Date(org.createdAt).toLocaleDateString("uz-UZ")}
                    </TableCell>
                  </TableRow>
                ))}
                {recentOrgs.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-6 text-muted-foreground">
                      Tashkilotlar yo'q
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Live Conversation Stream */}
        <Card>
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base">Jonli AI Suhbatlar Oqimi</CardTitle>
              <CardDescription>Mijozlarning kanallar orqali kelgan muloqotlari</CardDescription>
            </div>
            <Button nativeButton={false} size="sm" variant="ghost" className="text-xs gap-1" render={<Link href="/admin/agents" />}>
              Agentlar <ArrowRight className="size-3" />
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Agent</TableHead>
                  <TableHead>Kanal</TableHead>
                  <TableHead>Kayfiyat</TableHead>
                  <TableHead className="text-right">Vaqti</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentConversations.map(({ conv, agent }) => (
                  <TableRow key={conv.id} className="hover:bg-muted/30">
                    <TableCell className="font-medium text-sm">
                      {agent?.name || "AI Operator"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="uppercase text-[10px]">
                        {conv.channel}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={conv.sentiment === "positive" ? "default" : "outline"}
                        className="text-[10px]"
                      >
                        {conv.sentiment}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right text-xs text-muted-foreground font-mono">
                      {new Date(conv.startedAt).toLocaleDateString("uz-UZ", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </TableCell>
                  </TableRow>
                ))}
                {recentConversations.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-6 text-muted-foreground">
                      Suhbatlar hali yo'q
                    </TableCell>
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
