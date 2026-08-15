import { desc, eq } from "drizzle-orm";
import { MessageSquareText, Plus, Trash2 } from "lucide-react";
import { db } from "@/db/client";
import { messageTemplates } from "@/db/schema/message-templates";
import { requireOrganization } from "@/lib/auth/dal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { createMessageTemplateAction, deleteMessageTemplateAction } from "./actions";
import { CopyLinkButton } from "@/components/dashboard/copy-link-button";

const CATEGORIES = [
  { key: "greeting", label: "Salomlashuv" },
  { key: "pricing", label: "Narx va To'lov" },
  { key: "delivery", label: "Yetkazib berish" },
  { key: "schedule", label: "Ish vaqti" },
  { key: "faq", label: "Ko'p so'raladigan" },
  { key: "general", label: "Umumiy" },
];

export default async function MessageTemplatesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const { organization } = await requireOrganization(locale);

  const templates = await db
    .select()
    .from(messageTemplates)
    .where(eq(messageTemplates.organizationId, organization.id))
    .orderBy(desc(messageTemplates.createdAt));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <span className="flex size-9 items-center justify-center rounded-lg bg-brand/10 text-brand">
            <MessageSquareText className="size-5" />
          </span>
          <div>
            <h1 className="text-xl font-semibold">Xabar Shablonlari Kutubxonasi</h1>
            <p className="text-sm text-muted-foreground">
              Telegram va WhatsApp kanallarida tez-tez ishlatiladigan tezkor javob shablonlari
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        {/* Templates List */}
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Mavjud Shablonlar ({templates.length})
          </h2>

          {templates.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-center border rounded-xl border-dashed bg-muted/10">
              <MessageSquareText className="size-10 text-muted-foreground mb-3 opacity-20" />
              <p className="font-medium text-sm">Hozircha shablonlar yo'q</p>
              <p className="text-xs text-muted-foreground max-w-sm mt-1">
                O'ng tarafdagi forma orqali birinchi tezkor javob shabloningizni qo'shing.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {templates.map((tmpl) => (
                <Card key={tmpl.id} className="flex flex-col justify-between shadow-xs hover:border-brand/30 transition-colors">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-sm font-semibold">{tmpl.title}</CardTitle>
                      <Badge variant="outline" className="text-[10px] capitalize">
                        {CATEGORIES.find((c) => c.key === tmpl.category)?.label || tmpl.category}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="pb-3">
                    <p className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-md font-mono whitespace-pre-wrap line-clamp-4">
                      {tmpl.body}
                    </p>
                  </CardContent>
                  <CardFooter className="pt-2 border-t flex items-center justify-between">
                    <CopyLinkButton path={tmpl.body} label="Nusxa olish" copiedLabel="Nusxalandi!" />
                    <form action={deleteMessageTemplateAction.bind(null, locale, tmpl.id)}>
                      <Button type="submit" variant="ghost" size="icon" className="size-7 text-muted-foreground hover:text-red-600">
                        <Trash2 className="size-3.5" />
                      </Button>
                    </form>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Create Form */}
        <div>
          <Card className="sticky top-20 shadow-xs border-brand/20">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Plus className="size-4 text-brand" /> Yangi Shablon Qo'shish
              </CardTitle>
              <CardDescription className="text-xs">
                Mijozlarga yuboriladigan tayyor matn shablonini saqlang
              </CardDescription>
            </CardHeader>
            <form action={createMessageTemplateAction.bind(null, locale)}>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="tmpl-title">Shablon Nomi</Label>
                  <Input
                    id="tmpl-title"
                    name="title"
                    placeholder="Masalan: Click/Payme rekvizitlari"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tmpl-category">Kategoriya</Label>
                  <select
                    id="tmpl-category"
                    name="category"
                    defaultValue="general"
                    className="w-full rounded-md border border-input bg-background p-2 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c.key} value={c.key}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tmpl-body">Xabar Matni</Label>
                  <textarea
                    id="tmpl-body"
                    name="body"
                    placeholder="Mijozga yuboriladigan to'liq matn..."
                    rows={5}
                    className="w-full rounded-md border border-input bg-background p-3 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    required
                  />
                </div>
              </CardContent>
              <CardFooter>
                <Button type="submit" className="w-full gap-1.5 text-xs">
                  <Plus className="size-3.5" />
                  Shablonni saqlash
                </Button>
              </CardFooter>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
}
