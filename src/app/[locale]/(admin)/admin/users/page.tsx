import { clerkClient } from "@clerk/nextjs/server";
import { Users, Building2, Calendar, Mail } from "lucide-react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { db } from "@/db/client";
import { organizations } from "@/db/schema/org";
import { organizationCredits } from "@/db/schema/billing";
import { aiAgents } from "@/db/schema/agents";
import { desc, eq, count } from "drizzle-orm";
import { UserRowActions } from "@/components/admin/user-row-actions";
import { AdjustBalanceDialog } from "@/components/admin/adjust-balance-dialog";
import { EditOrgDialog } from "@/components/admin/edit-org-dialog";

export default async function AdminUsersPage() {
  // 1. Fetch Clerk Users
  const client = await clerkClient();
  const clerkUsersResponse = await client.users.getUserList({
    limit: 100,
    orderBy: "-created_at",
  });
  const clerkUsers = clerkUsersResponse.data;

  // 2. Fetch Organizations with Credit Balances & Agents Count
  const allOrgs = await db
    .select({
      org: organizations,
      credit: organizationCredits,
    })
    .from(organizations)
    .leftJoin(organizationCredits, eq(organizations.id, organizationCredits.organizationId))
    .orderBy(desc(organizations.createdAt));

  // Count agents per org
  const agentCounts = await db
    .select({
      orgId: aiAgents.organizationId,
      count: count(),
    })
    .from(aiAgents)
    .groupBy(aiAgents.organizationId);

  const agentCountMap = new Map(agentCounts.map((a) => [a.orgId, a.count]));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-red-500/10 text-red-600">
          <Users className="size-5" />
        </span>
        <div>
          <h1 className="text-xl font-semibold">Foydalanuvchilar va Tashkilotlar Markazi</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Barcha ro'yxatdan o'tgan foydalanuvchilar parolini boshqarish, tashkilotlar balansi va tariflarini sozlash
          </p>
        </div>
      </div>

      <Tabs defaultValue="users" className="w-full">
        <TabsList className="grid grid-cols-2 max-w-[400px]">
          <TabsTrigger value="users" className="gap-2">
            <Users className="size-4" /> Foydalanuvchilar ({clerkUsers.length})
          </TabsTrigger>
          <TabsTrigger value="orgs" className="gap-2">
            <Building2 className="size-4" /> Tashkilotlar ({allOrgs.length})
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: CLERK USERS */}
        <TabsContent value="users" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center justify-between">
                <span>Barcha Ro'yxatdan O'tgan Foydalanuvchilar</span>
                <Badge variant="outline">{clerkUsers.length} ta hisob</Badge>
              </CardTitle>
              <CardDescription>
                Foydalanuvchi hisoblarini tahlil qilish, parolini yangilash yoki bloklash
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Foydalanuvchi / Email</TableHead>
                    <TableHead>User ID</TableHead>
                    <TableHead>Holati</TableHead>
                    <TableHead>Oxirgi faollik</TableHead>
                    <TableHead>Ro'yxatdan o'tgan</TableHead>
                    <TableHead className="text-right">Boshqaruv</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clerkUsers.map((user) => {
                    const primaryEmail =
                      user.emailAddresses.find((e) => e.id === user.primaryEmailAddressId)?.emailAddress ||
                      user.emailAddresses[0]?.emailAddress ||
                      "Email yo'q";
                    const isBanned = user.banned;
                    const fullName = [user.firstName, user.lastName].filter(Boolean).join(" ") || "Nomsiz foydalanuvchi";

                    return (
                      <TableRow key={user.id} className="hover:bg-muted/30">
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="size-8 rounded-full bg-brand/10 text-brand flex items-center justify-center font-bold text-xs">
                              {user.imageUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={user.imageUrl} alt="" className="size-8 rounded-full object-cover" />
                              ) : (
                                fullName.charAt(0)
                              )}
                            </div>
                            <div className="flex flex-col">
                              <span className="font-semibold text-sm">{fullName}</span>
                              <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <Mail className="size-3" /> {primaryEmail}
                              </span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">
                          {user.id.slice(0, 14)}...
                        </TableCell>
                        <TableCell>
                          <Badge variant={isBanned ? "destructive" : "default"} className="text-[11px]">
                            {isBanned ? "Bloklangan" : "Faol"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {user.lastSignInAt
                            ? new Date(user.lastSignInAt).toLocaleDateString("uz-UZ", {
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            : "Kirilmagan"}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="size-3" />
                            {new Date(user.createdAt).toLocaleDateString("uz-UZ")}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <UserRowActions
                            userId={user.id}
                            userEmail={primaryEmail}
                            isBanned={!!isBanned}
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {clerkUsers.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-6 text-muted-foreground">
                        Foydalanuvchilar topilmadi
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 2: ORGANIZATIONS & TENANTS */}
        <TabsContent value="orgs" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center justify-between">
                <span>Tashkilotlar va Balanslar</span>
                <Badge variant="outline">{allOrgs.length} ta tashkilot</Badge>
              </CardTitle>
              <CardDescription>
                Tashkilotlarning kredit balansi, tariflari va agent limitlarini boshqarish
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tashkilot</TableHead>
                    <TableHead>Soha</TableHead>
                    <TableHead>Tarif (Plan)</TableHead>
                    <TableHead>ARI Balansi</TableHead>
                    <TableHead>Agentlar</TableHead>
                    <TableHead className="text-right">Boshqaruv</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allOrgs.map(({ org, credit }) => {
                    const balance = credit?.balance || 0;
                    const agentsCount = agentCountMap.get(org.id) || 0;

                    return (
                      <TableRow key={org.id} className="hover:bg-muted/30">
                        <TableCell className="font-medium">
                          <div className="flex flex-col">
                            <span className="font-semibold text-sm">{org.name}</span>
                            <span className="font-mono text-[11px] text-muted-foreground">
                              ID: {org.id.slice(0, 8)}...
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {org.industry || "Ko'rsatilmagan"}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={org.plan === "pro" ? "default" : org.plan === "enterprise" ? "outline" : "secondary"}
                            className="uppercase text-[11px]"
                          >
                            {org.plan}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="font-bold text-sm text-brand font-mono">
                            {new Intl.NumberFormat("uz-UZ").format(balance)} UZS
                          </span>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground font-mono">
                          {agentsCount} ta
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <AdjustBalanceDialog
                              orgId={org.id}
                              orgName={org.name}
                              currentBalance={balance}
                            />
                            <EditOrgDialog
                              org={{
                                id: org.id,
                                name: org.name,
                                industry: org.industry,
                                plan: org.plan,
                              }}
                            />
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {allOrgs.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-6 text-muted-foreground">
                        Tashkilotlar topilmadi
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
