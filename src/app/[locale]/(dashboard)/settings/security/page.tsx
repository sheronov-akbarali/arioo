import { ShieldCheck, Key } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { requireOrganization } from "@/lib/auth/dal";
import { ExportDataButton } from "@/components/dashboard/settings/export-data-button";
import { DeleteOrganizationDialog } from "@/components/dashboard/settings/delete-organization-dialog";

export default async function SecuritySettingsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const { organization, membership } = await requireOrganization(locale);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold">Xavfsizlik va Muvofiqlik</h1>
        <p className="text-sm text-muted-foreground">Ma'lumotlar xavfsizligi va qonunchilik talablari</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="size-5 text-brand" />
            O'zbekiston Respublikasi Qonunchiligiga Muvofiqlik
          </CardTitle>
          <CardDescription>
            "Shaxsiy ma'lumotlar to'g'risida"gi qonun talablariga asosan
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Arioo platformasi O'zbekiston Respublikasining 2019-yil 2-iyuldagi O'RQ-547-son "Shaxsiy ma'lumotlar to'g'risida"gi qonuni talablariga to'liq javob beradi. Tashkilotingizga tegishli integratsiya kalitlari AES-256-GCM bilan shifrlangan holda saqlanadi.
          </p>
          <ul className="list-disc pl-4 text-sm text-muted-foreground space-y-2">
            <li>Integratsiya kredensiallari (bot token, API kalitlari) AES-256-GCM bilan shifrlangan.</li>
            <li>Tashkilotingizga tegishli barcha ma'lumotlarni pastdagi tugma orqali istalgan vaqtda JSON formatida yuklab olishingiz mumkin.</li>
            <li>"Xavfli hudud" bo'limi orqali barcha ma'lumotlarni bazadan butunlay o'chirib yuborishingiz mumkin.</li>
          </ul>
          <div className="flex justify-end pt-2">
            <ExportDataButton locale={locale} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="size-5 text-muted-foreground" />
            Ikki bosqichli autentifikatsiya (2FA)
          </CardTitle>
          <CardDescription>
            Hisobingizni qo'shimcha himoyalash uchun
          </CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Sizning hisobingiz Google (Clerk) orqali ishonchli himoyalangan. Qo'shimcha 2FA sozlamalarini Clerk profil sozlamalaridan boshqarishingiz mumkin.
          </p>
          <Button variant="outline" render={<Link href="/settings/accounts">Clerk profilni ochish</Link>} />
        </CardContent>
      </Card>

      <Card className="border-red-200 dark:border-red-900/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-600 dark:text-red-500">
            Xavfli Hudud (Danger Zone)
          </CardTitle>
          <CardDescription>
            Tashkilot va barcha tegishli ma'lumotlarni qaytarib bo'lmaydigan qilib o'chirish
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Bu amal orqali sizning tashkilotingiz, AI xodimlaringiz, lidlar va suhbatlar to'liq o'chirib yuboriladi va uni qayta tiklash imkoni bo'lmaydi.
            {membership.role !== "owner" && " Faqat tashkilot egasi (owner) bu amalni bajara oladi."}
          </p>
          <DeleteOrganizationDialog locale={locale} organizationName={organization.name} disabled={membership.role !== "owner"} />
        </CardContent>
      </Card>
    </div>
  );
}
