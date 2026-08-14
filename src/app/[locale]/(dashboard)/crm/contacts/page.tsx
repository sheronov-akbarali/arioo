import { eq } from "drizzle-orm";
import { requireOrganization } from "@/lib/auth/dal";
import { db } from "@/db/client";
import { crmContacts } from "@/db/schema/crm";
import { channels } from "@/db/schema/channels";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { uz } from "date-fns/locale";

export default async function CrmContactsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const { organization } = await requireOrganization(locale);

  const rawContacts = await db
    .select({
      contact: crmContacts,
      channel: channels,
    })
    .from(crmContacts)
    .leftJoin(channels, eq(crmContacts.channelId, channels.id))
    .where(eq(crmContacts.organizationId, organization.id))
    .orderBy(crmContacts.createdAt);

  return (
    <Card className="flex flex-col overflow-hidden">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Ism</TableHead>
              <TableHead>Telefon/Email</TableHead>
              <TableHead>Manba (Kanal)</TableHead>
              <TableHead>Qo'shilgan sana</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rawContacts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                  Hozircha kontaktlar yo'q
                </TableCell>
              </TableRow>
            ) : (
              rawContacts.map(({ contact, channel }) => (
                <TableRow key={contact.id}>
                  <TableCell className="font-medium">{contact.name}</TableCell>
                  <TableCell>
                    <div className="flex flex-col text-xs text-muted-foreground">
                      <span>{contact.phone || "-"}</span>
                      <span>{contact.email || ""}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {channel ? (
                      <Badge variant="outline" className="capitalize">
                        {channel.type}
                      </Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">Qo'lda qo'shilgan</span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {format(contact.createdAt, "d MMM yyyy, HH:mm", { locale: uz })}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
}
