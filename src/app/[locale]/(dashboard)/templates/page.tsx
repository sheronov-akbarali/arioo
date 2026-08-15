import {
  Sparkles,
  ShoppingBag,
  Utensils,
  GraduationCap,
  Home,
  Headphones,
  Users,
  Download,
  CheckCircle2,
  BookOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { installTemplateAction } from "./actions";

interface TemplateItem {
  id: string;
  name: string;
  role: "sales" | "support" | "hr" | "marketing";
  roleLabel: string;
  industry: string;
  industryLabel: string;
  icon: typeof Sparkles;
  downloads: number;
  description: string;
  highlights: string[];
  systemPrompt: string;
  sampleKnowledge: string;
}

const TEMPLATES: TemplateItem[] = [
  {
    id: "ecommerce-sales",
    name: "Do'kon Sotuv Mutaxassisi",
    role: "sales",
    roleLabel: "Sotuv",
    industry: "retail",
    industryLabel: "Do'kon & Savdo",
    icon: ShoppingBag,
    downloads: 342,
    description: "Mijozlarga tovar tanlashda yordam beradi, narx va chegirmalarni tushuntiradi, buyurtmani qabul qiladi.",
    highlights: ["Mijoz ehtiyojini aniqlash", "Click/Payme orqali to'lov yo'riqnomasi", "Yetkazib berish shartlari"],
    systemPrompt: `Siz professional internet-do'kon sotuv assistentisiz. Vazifangiz mijozlarga tovar tanlashda yordam berish, narxlarni aytish, to'lov va yetkazib berish shartlarini tushuntirish va buyurtmani rasmiylashtirishdir.
Muomala madaniyatingiz xushmuomala, aniq va ishonchli bo'lsin. Har doim o'zbek tilida (yoki mijoz murojaat qilgan tilda) javob bering.`,
    sampleKnowledge: `Bizning do'kon shartlari:
1. Toshkent bo'ylab yetkazib berish 24 soat ichida (25,000 UZS, 300,000 UZS dan yuqori bepul).
2. Viloyatlarga BTS yoki Fargo pochta orqali 2-3 kunda.
3. To'lov turlari: Naqd, Click, Payme, Uzum Nasiya.
4. Kafolat: 14 kun ichida nuqson aniqlansa almashtirib beriladi.`,
  },
  {
    id: "restaurant-host",
    name: "Restoran & Kafe Administratori",
    role: "support",
    roleLabel: "Xizmat",
    industry: "restaurant",
    industryLabel: "Restoran & Kafe",
    icon: Utensils,
    downloads: 215,
    description: "Stol bron qilish, taomlar menyusi, ish vaqti va lokatsiya haqida ma'lumot beruvchi virtual admin.",
    highlights: ["Stol bronini qabul qilish", "Menyu va allergiya ma'lumotlari", "Maxsus tadbirlar"],
    systemPrompt: `Siz zamonaviy restoran administratorisiz. Mehmonlarga menyu taomlari haqida ma'lumot bering, stol bron qilish sanasi, vaqti va odam sonini aniqlab oling. Xushmuomala va mehmondo'st ohangda javob bering.`,
    sampleKnowledge: `Restoran ma'lumotlari:
- Ish vaqti: Har kuni 10:00 dan 23:00 gacha.
- Oshxona: Milliy va Yevropa taomlari. Halol sertifikatiga ega.
- Bron qilish: Kamida 2 soat oldin xabar berish maqsadga muvofiq.
- Depozit: VIP xonalar uchun 500,000 UZS.`,
  },
  {
    id: "education-advisor",
    name: "O'quv Markazi Maslahatchisi",
    role: "sales",
    roleLabel: "Sotuv & Maslahat",
    industry: "education",
    industryLabel: "Ta'lim Markazi",
    icon: GraduationCap,
    downloads: 289,
    description: "O'quv kurslari narxlari, dars jadvali bilan tanishtiradi va birinchi bepul sinov darsiga yozadi.",
    highlights: ["Kurslar bo'yicha maslahat", "Sinov darsiga yozish", "To'lov chegirmalari"],
    systemPrompt: `Siz yetakchi o'quv markazi maslahatchisisiz. Qiziquvchilarga IT, Ingliz tili va Matematika kurslari bo'yicha ma'lumot bering. Ularning maqsadi va boshlang'ich darajasini so'rab, bepul sinov darsiga taklif qiling.`,
    sampleKnowledge: `O'quv markazi kurslari:
1. Frontend & Backend dasturlash: 6 oylik, haftada 3 kun 2 soatdan. Oylik to'lov: 900,000 UZS.
2. General English & IELTS: 3 oylik intensiv, oylik to'lov: 650,000 UZS.
3. Birinchi sinov darsi — mutlaqo bepul!`,
  },
  {
    id: "real-estate-agent",
    name: "Ko'chmas Mulk Agenti (Rieltor)",
    role: "sales",
    roleLabel: "Sotuv",
    industry: "real_estate",
    industryLabel: "Ko'chmas Mulk",
    icon: Home,
    downloads: 178,
    description: "Kvartira va uylar bo'yicha so'rovlarni qabul qiladi, kv.m narxi va ipoteka shartlarini tushuntiradi.",
    highlights: ["Xonadon parametrlarini aniqlash", "Ko'rish vaqtini belgilash", "Ipoteka va muddatli to'lov"],
    systemPrompt: `Siz ko'chmas mulk agentligining yetakchi rieltorisiz. Mijozlarning byudjeti, xonalar soni va lokatsiya talablarini aniqlab, mos ob'yektlarni taklif qiling hamda ko'rish vaqtini belgilang.`,
    sampleKnowledge: `Yangi turar-joy majmuasi ma'lumotlari:
- 1 xonali (42 kv.m): 38,000 USD dan boshlab.
- 2 xonali (65 kv.m): 55,000 USD dan boshlab.
- To'lov: 30% boshlang'ich, qolgani 24 oyga foizsiz muddatli to'lov.
- Topshirish muddati: 2026-yil 4-chorak.`,
  },
  {
    id: "tech-support",
    name: "Texnik Yordam Mutaxassisi",
    role: "support",
    roleLabel: "Qo'llab-quvvatlash",
    industry: "technology",
    industryLabel: "IT & Xizmatlar",
    icon: Headphones,
    downloads: 194,
    description: "Foydalanuvchilarning texnik muammolarini yechishga yordam beradi, tez-tez so'raladigan savollarga javob beradi.",
    highlights: ["Muammoni diagnostika qilish", "Bosqichma-bosqich yechim", "Ticket yaratish"],
    systemPrompt: `Siz IT servisning texnik yordam mutaxassisisiz. Mijozlarga tizimdan foydalanishdagi xatoliklarni bartaraf etishda aniq, qadamma-qadam ko'rsatmalar bering.`,
    sampleKnowledge: `Tez-tez uchraydigan muammolar:
1. Parolni tiklash: "Parolni unutdingizmi?" tugmasini bosib, pochtaga kelgan kodni kiriting.
2. Bot ishlamasa: /start buyrug'ini qayta yuboring yoki botni o'chirib qayta qo'shing.
3. To'lov tasdiqlanmadi: Chek rasmini yuboring, operator 10 daqiqada tekshiradi.`,
  },
  {
    id: "hr-recruiter",
    name: "HR Rezyume Saralovchi",
    role: "hr",
    roleLabel: "HR & Rekruting",
    industry: "hr",
    industryLabel: "Kadrlar Bo'limi",
    icon: Users,
    downloads: 126,
    description: "Nomzodlardan rezyume va portfolio qabul qiladi, boshlang'ich savol-javob o'tkazadi va suhbatga chaqiradi.",
    highlights: ["Rezyume yig'ish", "Nomzod tajribasini baholash", "Intervyu vaqtini belgilash"],
    systemPrompt: `Siz kompaniya HR rekruterisiz. Ochiq vakansiyalarga qiziquvchilardan tajribasi, kutilayotgan maoshi va portfoliosi haqida ma'lumot oling hamda suhbat vaqtini belgilang.`,
    sampleKnowledge: `Ochiq vakansiyalar:
1. Sotuv menejeri: 1+ yil tajriba, o'zbek va rus tillari, oylik: 5,000,000 - 12,000,000 UZS (KPI bilan).
2. Operator (Call-center): 2 smena (09:00-18:00 yoki 14:00-22:00), oylik: 4,000,000 UZS.
Ish joyi: Toshkent sh., Chilonzor tumani.`,
  },
];

export default async function TemplatesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <span className="flex size-9 items-center justify-center rounded-lg bg-brand/10 text-brand">
            <Sparkles className="size-5" />
          </span>
          <div>
            <h1 className="text-xl font-semibold">AI Xodimlar Shablonlar Bozori</h1>
            <p className="text-sm text-muted-foreground">
              O'zbekiston biznesi uchun sohalar bo'yicha maxsus sozlangan tayyor virtual xodimlarni 1-klikda ishga tushiring
            </p>
          </div>
        </div>
      </div>

      {/* Grid of Templates */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {TEMPLATES.map((tmpl) => {
          const Icon = tmpl.icon;
          return (
            <Card key={tmpl.id} className="flex flex-col justify-between hover:border-brand/40 transition-colors shadow-xs">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <span className="flex size-10 items-center justify-center rounded-xl bg-brand/10 text-brand shrink-0">
                    <Icon className="size-5" />
                  </span>
                  <div className="flex items-center gap-1.5">
                    <Badge variant="outline" className="text-[11px]">
                      {tmpl.industryLabel}
                    </Badge>
                    <Badge variant="secondary" className="text-[11px]">
                      {tmpl.roleLabel}
                    </Badge>
                  </div>
                </div>

                <CardTitle className="text-base mt-3">{tmpl.name}</CardTitle>
                <CardDescription className="text-xs line-clamp-2 mt-1">
                  {tmpl.description}
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-3 pb-3">
                <div className="space-y-1.5 border-t pt-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Asosiy imkoniyatlar:
                  </p>
                  <ul className="space-y-1 text-xs text-muted-foreground">
                    {tmpl.highlights.map((h, i) => (
                      <li key={i} className="flex items-center gap-1.5">
                        <CheckCircle2 className="size-3.5 text-emerald-500 shrink-0" />
                        <span>{h}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="flex items-center justify-between text-xs text-muted-foreground pt-1 border-t">
                  <span className="flex items-center gap-1">
                    <Download className="size-3.5" /> {tmpl.downloads} marta o'rnatildi
                  </span>
                  <span className="flex items-center gap-1 text-brand font-medium">
                    <BookOpen className="size-3.5" /> Bilim bazasi bor
                  </span>
                </div>
              </CardContent>

              <CardFooter className="pt-2">
                <form
                  action={installTemplateAction.bind(null, locale, {
                    name: tmpl.name,
                    role: tmpl.role,
                    systemPrompt: tmpl.systemPrompt,
                    sampleKnowledge: tmpl.sampleKnowledge,
                  })}
                  className="w-full"
                >
                  <Button type="submit" className="w-full gap-1.5 text-xs">
                    <Sparkles className="size-3.5" />
                    1-klikda ishga tushirish
                  </Button>
                </form>
              </CardFooter>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
