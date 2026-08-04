# TayanchAI

O'zbekiston bizneslari uchun "AI xodim ijaraga olish" B2B SaaS platformasi. worken.ru
konsepsiyasining chuqur mahalliylashtirilgan va kuchaytirilgan versiyasi: bizneslar sotuv,
qo'llab-quvvatlash, HR va marketing uchun AI agentlarni "ishga oladi", agentlar Telegram,
WhatsApp, OLX.uz, CRM kabi tizimlarga ulanadi va mustaqil ishlaydi.

Original tahlil qilingan mahsulot: https://worken.ru (bizniki emas — faqat konsepsiya manbai).

## Nega bu loyiha va nima uchun worken.ru'dan farq qiladi

worken.ru Rossiya bozori uchun qurilgan (RU/EN, rubl narxlash, Avito, rus to'lov tizimlari).
TayanchAI xuddi shu g'oyani O'zbekiston bozori uchun qayta quradi va 4 ta muhim joyda undan
ustun bo'lishga harakat qiladi:

1. **WhatsApp Business integratsiyasi** — O'zbekistonda Telegramdan ham keng tarqalgan kanal,
   worken.ru'da yo'q.
2. **OLX.uz integratsiyasi** — Avito'ning mahalliy analogi (O'zbekistondagi eng katta
   e'lonlar sayti).
3. **Soha bo'yicha tayyor shablonlar** — do'kon, restoran, ta'lim markazi, ko'chmas mulk kabi
   mahalliy SMB segmentlari uchun tayyor agent konfiguratsiyalari, tezroq ishga tushirish.
4. **Human-in-the-loop rejimi** — AI ishonchsiz holatda avtomatik odamga topshiradi;
   ishonchni oshiradigan xavfsizlik qatlami sifatida alohida ajratib ko'rsatiladi.

Qo'shimcha mahalliylashtirish: 3 til (o'zbek/rus/ingliz, standart — o'zbek), telefon+SMS OTP
autentifikatsiya, Payme/Click mahalliy to'lovlari + Stripe xalqaro kartalar uchun.

## Raqobatchi chuqur tahlili (worken.ru autentifikatsiyalangan panel)

Marketing saytdan tashqari, worken.ru'ning haqiqiy boshqaruv panelini (`/bots`, `/integrations`,
`/billing`, `/approvals`, `/routines`, `/products`, `/referral-program`) ham o'rganib chiqildi.
Bu shunchaki marketing landingdan ancha boy — to'liq agent-builder platforma ekan. Muhim
topilmalar, ular bizning yo'l xaritamizga quyida integratsiya qilingan:

- **Agent konfiguratsiyasi**: tizim prompti, model tanlash, va **Tools** panelida yoqib-
  o'chiriladigan integratsiya to'plamlari (ichki tizim, 1C, GitHub, Google Sheets/Drive,
  Avito). Har bir integratsiya guruhi o'z ichida alohida vositalar ro'yxatiga ega
  (masalan "Avito Messenger" — 9 ta vosita).
- **Qo'ng'iroq muvofiqlik tizimi**: ish soatlari, oyna tashqarisidagi xatti-harakat, DNC
  ("Не звонить") ro'yxatini hurmat qilish, davr uchun maksimal urinishlar (masalan 3ta/7kun),
  faqat kontekst (thread) mavjud bo'lganda tashqi qo'ng'iroq — cold-dialni bloklaydi.
- **Approvals (human-in-the-loop navbat)**: rutinalar/vositalar/ovoz ssenariylarining tashqi
  harakatlari tasdiqlash navbatiga tushadi; statuslar: kutmoqda/tasdiqlangan/rad
  etilgan/avto-hal qilingan/xato/muddati o'tgan.
- **Kredit-asosidagi shaffof billing**: ichki valyuta (ularda "W"), alohida bonus valyutasi,
  har bir suhbat/model bo'yicha xarajat tarixi, vektor-baza hajmi bo'yicha alohida to'lov,
  bank o'tkazmasi uchun invoys so'rash.
- **Routines**: CRM/integratsiya hodisalariga asoslangan trigger→harakat avtomatlashtirish
  (Zapier uslubida).
- **Ikki qatlamli referral**: ommaviy hamkorlik dasturi (agentliklar, 50%gacha chegirma) +
  ilova ichidagi oddiy foydalanuvchi referral dasturi (5%, kunlik/oylik limit bilan).
- **Products/commerce katalogi**: yagona "offer" ob'ekti, kanallarga (Avito) bog'lanadi,
  to'lov yo'llari (Robokassa, Telegram Stars) ulanadi.
- **Zaif tomoni**: ularning Statistics sahifasi ishlamayotgan/bo'sh edi — bizning tizim
  ishonchliligi va real-time analitika ustunligimiz shu yerda ko'rinishi kerak.

## Texnik stack

- **Frontend:** Next.js (App Router) + TypeScript + Tailwind + shadcn/ui
- **i18n:** next-intl (uz standart, ru, en)
- **Auth:** Telefon raqami + SMS OTP, email zaxira varianti
- **DB:** Neon Postgres (Vercel Marketplace) + Drizzle ORM
- **AI:** Vercel AI SDK + AI Gateway (multi-model, xarajat nazorati)
- **Fayl/bilim bazasi:** Vercel Blob
- **Uzoq muddatli jarayonlar:** Vercel Workflow (lid pipeline, onboarding)
- **To'lovlar:** Stripe (xalqaro) + Payme/Click (mahalliy, maxsus integratsiya — Vercel
  Marketplace'da yo'q, qo'lda API integratsiyasi kerak)
- **Kanallar:** Telegram Bot API, WhatsApp Business Cloud API (Meta), sayt vidjeti, OLX.uz
  (ochiq API yo'qligi taxmin qilinadi — forma/lid asosida boshlanadi, keyin qayta tekshiriladi)
- **Hosting:** Vercel

## Asosiy data-model (yuqori darajadagi)

Tashkilot (tenant) → Foydalanuvchilar → Obuna/tarif → AI Xodimlar (rol: sotuv/HR/marketing)
→ Kanallar (ulanган integratsiyalar) → Suhbatlar/xabarlar → Bilim bazasi hujjatlari →
Lidlar/deals (ichki yengil CRM) → Hamkor/referal hisoblari

## Bosqichma-bosqich yo'l xaritasi

Har bir bosqich alohida `docs/superpowers/specs/` hujjati va implementatsiya rejasi oladi.
Bitta katta rejaga hammasini oldindan batafsil yozish amaliy emas — har bosqich boshlanishidan
oldin qayta ko'rib chiqiladi.

- [ ] **0 — Fundament**: repo skeleton (Next.js+TS+Tailwind+shadcn), brend/dizayn tizimi
      (TayanchAI), i18n scaffolding, CI, loyiha konventsiyalari
- [ ] **1 — Marketing sayt**: landing (hero, qanday ishlaydi, 4 ish yo'nalishi), narxlash
      sahifasi (UZS+USD), hamkorlik dasturi sahifasi, konsultatsiya lid-formasi, huquqiy
      hujjatlar, til/tema almashtirgich
- [ ] **2 — Auth + billing**: ro'yxatdan o'tish/kirish (telefon OTP), tashkilot yaratish,
      tarif tanlash, Payme/Click + Stripe checkout, obuna boshqaruvi, bo'sh dashboard skeleton,
      **kredit-asosidagi ichki valyuta** (masalan "TAY") + bonus valyuta, xarajat tarixi
      infratuzilmasi (jadval darajasida, UI Phase 3'da)
- [ ] **3 — AI agent yadrosi**: agent yaratish ustasi (rol tanlash), bilim bazasi yuklash
      (fayl→Blob→embedding), suhbat dvigateli (AI SDK, tool calling), soha shablonlari,
      **human-in-the-loop approvals navbati** (kutmoqda/tasdiqlangan/rad etilgan/avto-hal
      qilingan/muddati o'tgan statuslari bilan), **har suhbat/model bo'yicha xarajat
      ko'rsatish**, agentga integratsiyalarni yoqib-o'chirish paneli (Tools)
- [ ] **4 — Kanal integratsiyalari**: Telegram bot connector, WhatsApp Business Cloud API,
      sayt chat-vidjeti, OLX.uz lid-intake, **ovozli qo'ng'iroq muvofiqlik tizimi** (ish
      soatlari, "Qo'ng'iroq qilmang" ro'yxati, davr uchun urinishlar chastotasi, faqat
      kontekstli tashqi qo'ng'iroq) — telefon/SIP kanali qo'shilganda
- [ ] **5 — CRM/tizim integratsiyalari**: ichki yengil CRM, amoCRM/Bitrix24 connectorlari,
      kalendar bron qilish, ochiq API/MCP server, **Routines** (CRM/integratsiya hodisalariga
      asoslangan trigger→harakat avtomatlashtirish)
- [ ] **6 — Admin, analitika, hamkorlik dasturi va ishga tushirish**: admin panel
      (tashkilot/token monitoring), **ishonchli real-time analitika dashboardlari**
      (raqobatchining bo'sh/buzilgan Statistics sahifasidan ustunlik), ikki qatlamli referral
      (agentlik hamkorlik dasturi + oddiy foydalanuvchi referral, limitlar bilan), xavfsizlik/
      muvofiqlik tekshiruvi (O'zbekiston shaxsiy ma'lumotlar qonuni), yuklama testi

Hozirgi holat: **0-1 bosqichlar uchun spec yozilmoqda/qurilmoqda.**
Batafsil spec: `docs/superpowers/specs/2026-08-04-foundation-marketing-site-design.md`

## Rivojlantirish konventsiyalari

- Barcha foydalanuvchiga ko'rinadigan matn uch tilda: `uz` (standart), `ru`, `en`
- Narxlar UZS'da asosiy, USD ikkinchi darajali ko'rsatiladi (xalqaro mijozlar uchun)
- Har bir yangi bosqich boshlanishidan oldin: superpowers:brainstorming → spec →
  superpowers:writing-plans → amalga oshirish
- Design spec'lar: `docs/superpowers/specs/YYYY-MM-DD-<mavzu>-design.md`
- Implementatsiya rejalari: `docs/superpowers/plans/`

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
