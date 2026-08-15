import { ShieldCheck, Key, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default async function SecuritySettingsPage() {
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
            Arioo platformasi O'zbekiston Respublikasining 2019-yil 2-iyuldagi O'RQ-547-son "Shaxsiy ma'lumotlar to'g'risida"gi qonuni talablariga to'liq javob beradi. Barcha shaxsiy ma'lumotlar ruxsatsiz kirishdan himoyalangan va faqat belgilangan maqsadda qayta ishlanadi.
          </p>
          <ul className="list-disc pl-4 text-sm text-muted-foreground space-y-2">
            <li>Ma'lumotlaringiz to'liq shifrlangan (encrypted) holda saqlanadi.</li>
            <li>Siz o'zingiz va mijozlaringiz ma'lumotlarini istalgan vaqtda yuklab olish (eksport) huquqiga egasiz.</li>
            <li>Shuningdek, barcha ma'lumotlarni jismonan o'chirib yuborish huquqiga egasiz.</li>
          </ul>
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
          <Button variant="outline">Clerk profilni ochish</Button>
        </CardContent>
      </Card>

      <Card className="border-red-200 dark:border-red-900/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-600 dark:text-red-500">
            <Trash2 className="size-5" />
            Xavfli Hudud (Danger Zone)
          </CardTitle>
          <CardDescription>
            Tashkilot va barcha tegishli ma'lumotlarni qaytarib bo'lmaydigan qilib o'chirish
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Bu amal orqali sizning tashkilotingiz, AI xodimlaringiz, lidlar va suhbatlar to'liq o'chirib yuboriladi. Qonunchilikka ko'ra, ma'lumotlar serverdan jismonan o'chiriladi va uni qayta tiklash imkoni bo'lmaydi.
          </p>
          <Button variant="destructive">Tashkilotni O'chirish (Delete Data)</Button>
        </CardContent>
      </Card>
    </div>
  );
}
