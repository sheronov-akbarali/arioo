# TayanchAI — Bosqich 0-1: Fundament va Marketing Sayt

Status: Approved
Sana: 2026-08-04

## Maqsad

Bu spec loyihaning birinchi qurilishi bosqichini qamrab oladi: texnik fundament (repo,
dizayn tizimi, i18n) va to'liq marketing sayt (auth/dashboard/AI-agent funksionalligisiz —
ular keyingi bosqichlarda). Maqsad — worken.ru darajasidagi ishonchli, ko'p tilli, TayanchAI
brendidagi ommaviy sayt: mahsulotni tushuntiradi, narxlarni ko'rsatadi, lidlarni yig'adi.

Doiradan tashqarida (keyingi bosqichlar): foydalanuvchi ro'yxatdan o'tishi, to'lov, dashboard,
haqiqiy AI agent, kanal integratsiyalari.

## Arxitektura

**Loyiha turi:** Bitta Next.js (App Router, TypeScript) ilovasi, hozircha faqat statik/marketing
marshrutlar + bitta lid-yig'ish API route.

```
src/
  app/
    [locale]/
      page.tsx               # Bosh sahifa (hero, qanday ishlaydi, 4 ish yo'nalishi)
      pricing/page.tsx        # Narxlash
      partners/page.tsx       # Hamkorlik dasturi
      legal/[doc]/page.tsx    # Oferta, maxfiylik siyosati va h.k.
      layout.tsx               # Locale-ga bog'liq layout (header/footer)
    api/
      consultation/route.ts   # Lid-forma endpoint (POST)
    layout.tsx                 # Root layout
  components/
    marketing/                # Hero, PricingTable, PartnerStats, WorkZoneCard, LeadForm...
    ui/                        # shadcn primitives
  lib/
    i18n/                      # next-intl config, uz/ru/en messages
    telegram.ts                 # Lid xabarini Telegram'ga yuborish helperi
messages/
  uz.json ru.json en.json
```

**Nega bu tuzilma:** `[locale]` segmenti next-intl'ning standart App Router patterni; bu
Phase 2+da auth/dashboard marshrutlarini xuddi shu locale tuzilmasiga qo'shishni osonlashtiradi.
API route'lar hozircha bittagina — lid-forma — chunki DB hali provisioning qilinmagan (YAGNI:
DB Phase 2'da auth/billing bilan birga qo'shiladi).

## Komponentlar

- **Header/Footer** — til almashtirgich (uz/ru/en), tema almashtirgich (light/dark), asosiy
  navigatsiya (Narxlash, Hamkorlik dasturi), "Konsultatsiya olish" CTA
- **Hero** — worken.ru uslubidagi "AI xodimni ishga oling" xabari, TayanchAI'ga moslashtirilgan
  (frontend-design skill implementatsiya vaqtida vizual yo'nalishni belgilaydi — bu yerda faqat
  tarkib va tuzilma qat'iylashtiriladi, aniq ranglar/tipografiya keyin)
- **4 ish yo'nalishi kartalari** — Sotuv/xizmat, HR/recruiting, Marketing/kontent, Tizim/bilim
- **PricingTable** — Freemium/Business S/M/L/Enterprise, UZS asosiy narx + USD kichik matnda,
  oylik/yillik almashtirgich
- **PartnerStats** — hamkorlik dasturi ko'rsatkichlari (chegirma %, referal %, daraja soni)
- **LeadForm** — Ism, telefon raqami (uz format validatsiyasi), "Konsultatsiya olish" tugmasi

## Ma'lumot oqimi: Lid-forma

1. Foydalanuvchi LeadForm'ni to'ldiradi (ism, telefon) → client-side validatsiya
2. `POST /api/consultation` → server-side validatsiya (Zod) + oddiy rate-limit (IP bo'yicha,
   xotirada/edge-friendly, masalan 1 so'rov/30s)
3. Route Telegram Bot API orqali ichki "sales" chatga xabar yuboradi (`TELEGRAM_BOT_TOKEN`,
   `TELEGRAM_LEADS_CHAT_ID` env o'zgaruvchilari)
4. Muvaffaqiyatli bo'lsa — foydalanuvchiga tasdiq ko'rsatiladi; Telegram xatosi bo'lsa — xato
   log qilinadi (Vercel runtime logs), lekin foydalanuvchiga baribir "qabul qilindi" ko'rsatiladi
   (xabar Vercel loglarida qoladi, keyin qo'lda tekshiriladi) — foydalanuvchi tajribasi hech
   qachon ichki integratsiya nosozligi tufayli buzilmasligi kerak
5. Bu bosqichda DB yo'q — lidlar faqat Telegram orqali kuzatiladi. Phase 2'da DB qo'shilganda,
   lidlar jadvalga ham yoziladi (migratsiya keyingi spec'da rejalashtiriladi)

## Xatoliklarni boshqarish

- Forma validatsiyasi: client + server (Zod), noto'g'ri telefon formatida aniq xatolik matni
- Rate-limit oshib ketsa: foydalanuvchiga "biroz kuting" xabari (429)
- Telegram API mavjud bo'lmasa: yuqorida tasvirlangandek — jim log, foydalanuvchi UI'da
  muvaffaqiyat ko'radi (kichik biznes uchun bitta yo'qolgan lid dashboard nosozligidan yaxshiroq)
- Noma'lum locale route'ga kirilsa: standart `uz` locale'ga redirect

## Test strategiyasi

- TypeScript qat'iy rejim + ESLint — CI'da majburiy tekshiruv
- `/api/consultation` uchun unit test: validatsiya, rate-limit, Telegram xatosi holatida ham
  200 qaytarishi
- Har bir sahifa uchun engil Playwright smoke test (route yuklanadi, asosiy CTA ko'rinadi,
  3 tilda ham matn almashadi)
- Implementatsiya tugagach brauzerda qo'lda tekshirish: barcha sahifalar, til/tema
  almashtirgich, forma yuborish (haqiqiy Telegram chatga yetib borishini tasdiqlash)

## Ochiq savollar / keyingi bosqichda hal qilinadi

- Payme/Click va Stripe integratsiya tafsilotlari — Phase 2 spec'ida
- Haqiqiy vizual dizayn yo'nalishi (ranglar, tipografiya, animatsiyalar) — implementatsiya
  paytida frontend-design skill orqali ishlab chiqiladi, bu spec faqat tarkib/tuzilmani
  qat'iylashtiradi
- OLX.uz'ning ochiq API mavjudligi tasdiqlanmagan — Phase 4'da tekshiriladi, bo'lmasa
  qo'lda/forma-asosidagi integratsiya bilan almashtiriladi
