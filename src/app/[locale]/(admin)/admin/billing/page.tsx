import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { db } from "@/db/client";
import { organizations } from "@/db/schema/org";
import { creditTransactions } from "@/db/schema/billing";
import { tickets } from "@/db/schema/tickets";
import { desc, sql, eq, like } from "drizzle-orm";
import { CreditCard, Wallet, ArrowUpRight, CheckCircle2, History } from "lucide-react";
import { PayoutApprovalCard } from "@/components/admin/payout-approval-card";

export default async function AdminBillingPage() {
  const allOrgs = await db
    .select()
    .from(organizations)
    .orderBy(desc(organizations.createdAt));

  const totalRevenueResult = await db
    .select({
      total: sql<number>`COALESCE(SUM(${creditTransactions.amount}), 0)`,
    })
    .from(creditTransactions)
    .where(eq(creditTransactions.type, "topup"));

  const totalRevenue = Number(totalRevenueResult[0]?.total || 0);

  // Payout requests (tickets starting with Pul yechish)
  const payoutTickets = await db
    .select({
      ticket: tickets,
      org: organizations,
    })
    .from(tickets)
    .leftJoin(organizations, eq(tickets.organizationId, organizations.id))
    .where(like(tickets.subject, "%yechish%"))
    .orderBy(desc(tickets.createdAt));

  // Recent transactions
  const recentTransactions = await db
    .select({
      tx: creditTransactions,
      org: organizations,
    })
    .from(creditTransactions)
    .leftJoin(organizations, eq(creditTransactions.organizationId, organizations.id))
    .orderBy(desc(creditTransactions.createdAt))
    .limit(20);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-red-500/10 text-red-600">
          <CreditCard className="size-5" />
        </span>
        <div>
          <h1 className="text-xl font-semibold">Moliya, Tranzaksiyalar va To'lovlar Markazi</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Platforma umumiy tushumi, Payme/Click to'lovlari va pul yechish so'rovlarini tasdiqlash
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Wallet className="size-4 text-emerald-600" /> Jami Balans To'ldirishlar
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono">
              {new Intl.NumberFormat("uz-UZ").format(totalRevenue)} UZS
            </div>
            <p className="text-xs text-emerald-600 flex items-center mt-1 font-medium">
              <ArrowUpRight className="size-3 mr-1" /> Real vaqtda yangilanadi
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <CreditCard className="size-4 text-brand" /> Faol Obunalar (PRO / Ent)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono">
              {allOrgs.filter((o) => o.plan === "pro" || o.plan === "enterprise").length} ta
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Jami {allOrgs.length} ta mijozdan
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <CheckCircle2 className="size-4 text-blue-600" /> Pul Yechish So'rovlari
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono">
              {payoutTickets.filter((p) => p.ticket.status === "open").length} ta kutilmoqda
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Referral va Hamkorlik daromadlari
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Payout Withdrawal Requests */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center justify-between">
            <span>Karta Orqali Pul Yechish So'rovlari (Payout Requests)</span>
            <Badge variant="outline">{payoutTickets.length} ta so'rov</Badge>
          </CardTitle>
          <CardDescription>
            Mijozlar referral dasturidan ishlagan pullarini Uzcard/Humo kartalariga yechib olish so'rovlari
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {payoutTickets.map(({ ticket, org }) => (
            <PayoutApprovalCard
              key={ticket.id}
              ticket={{
                id: ticket.id,
                organizationId: ticket.organizationId,
                subject: ticket.subject,
                description: ticket.description || "",
                status: ticket.status,
                createdAt: ticket.createdAt,
              }}
              orgName={org?.name || "Noma'lum"}
            />
          ))}
          {payoutTickets.length === 0 && (
            <div className="text-center py-6 text-sm text-muted-foreground">
              Hozircha yangi pul yechish so'rovlari mavjud emas.
            </div>
          )}
        </CardContent>
      </Card>

      {/* All Transactions Ledger */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <History className="size-4 text-brand" /> Barcha To'lovlar va Balans Harakatlari Jurnali
          </CardTitle>
          <CardDescription>
            Payme, Click, Token sarfi va Admin operatsiyalari
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tashkilot</TableHead>
                <TableHead>Turi</TableHead>
                <TableHead>Summa (UZS)</TableHead>
                <TableHead>Tavsif</TableHead>
                <TableHead>Sana</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentTransactions.map(({ tx, org }) => {
                const isTopup = tx.type === "topup";
                return (
                  <TableRow key={tx.id} className="hover:bg-muted/30">
                    <TableCell className="font-semibold text-sm">
                      {org?.name || "Noma'lum"}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={isTopup ? "default" : "secondary"}
                        className={`text-[10px] ${isTopup ? "bg-emerald-600 hover:bg-emerald-600" : ""}`}
                      >
                        {isTopup ? "To'ldirish" : "Yechish / Sarf"}
                      </Badge>
                    </TableCell>
                    <TableCell className={`font-mono font-bold text-sm ${isTopup ? "text-emerald-600" : "text-foreground"}`}>
                      {isTopup ? "+" : "-"}{new Intl.NumberFormat("uz-UZ").format(tx.amount)} UZS
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-[280px] truncate">
                      {tx.description}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground font-mono">
                      {new Date(tx.createdAt).toLocaleDateString("uz-UZ", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </TableCell>
                  </TableRow>
                );
              })}
              {recentTransactions.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-6 text-muted-foreground">
                    Tranzaksiyalar mavjud emas
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
