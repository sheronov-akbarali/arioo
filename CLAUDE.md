# Arioo

O'zbekiston bizneslari uchun "AI xodim ijaraga olish" B2B SaaS platformasi. worken.ru
konsepsiyasining chuqur mahalliylashtirilgan va kuchaytirilgan versiyasi: bizneslar sotuv,
qo'llab-quvvatlash, HR va marketing uchun AI agentlarni "ishga oladi", agentlar Telegram,
WhatsApp, OLX.uz, CRM kabi tizimlarga ulanadi va mustaqil ishlaydi.

Original tahlil qilingan mahsulot: https://worken.ru (bizniki emas — faqat konsepsiya manbai).

## Nega bu loyiha va nima uchun worken.ru'dan farq qiladi

worken.ru Rossiya bozori uchun qurilgan (RU/EN, rubl narxlash, Avito, rus to'lov tizimlari).
Arioo xuddi shu g'oyani O'zbekiston bozori uchun qayta quradi va 4 ta muhim joyda undan
ustun bo'lishga harakat qiladi:

1. **WhatsApp Business integratsiyasi** — O'zbekistonda Telegramdan ham keng tarqalgan kanal,
   worken.ru'da yo'q.
2. **OLX.uz integratsiyasi** — Avito'ning mahalliy analogi (O'zbekistondagi eng katta
   e'lonlar sayti).
3. **Soha bo'yicha tayyor shablonlar** — do'kon, restoran, ta'lim markazi, ko'chmas mulk kabi
   mahalliy SMB segmentlari uchun tayyor agent konfiguratsiyalari, tezroq ishga tushirish.
4. **Human-in-the-loop rejimi** — AI ishonchsiz holatda avtomatik odamga topshiradi;
   ishonchni oshiradigan xavfsizlik qatlami sifatida alohida ajratib ko'rsatiladi.

Qo'shimcha mahalliylashtirish: 3 til (o'zbek/rus/ingliz, standart — o'zbek), Clerk orqali
autentifikatsiya (Google OAuth + email/parol), Payme/Click mahalliy to'lovlari + Stripe
xalqaro kartalar uchun.

## Raqobatchi chuqur tahlili (worken.ru autentifikatsiyalangan panel)

Marketing saytdan tashqari, worken.ru'ning haqiqiy boshqaruv panelini (foydalanuvchi
o'zining haqiqiy akkaunti bilan tizimga kirgan holda, Chrome orqali) sahifama-sahifa
o'rganib chiqildi — bu shunchaki marketing landingdan ancha boy, to'liq agent-builder
platforma ekan. 2026-08-08'da sidebar'dagi deyarli barcha bo'limlar quriladi — jami 13 ta
yangi/kengaytirilgan sahifa (`/assistants`, `/chats`, `/calls`, `/routines`, `/approvals`,
`/knowledge-bases`, `/products`, `/integrations`, `/statistics`, `/runs`, `/billing`,
`/affiliate-program`, `/referral-program`, `/settings/*`), 8 ta yangi DB jadvali
(`organization_credit`, `credit_transaction`, `routine`, `product`, `organization_referral`,
`referral_operation`, `organization.plan` ustuni). Har bir sahifa **haqiqiy ma'lumot bilan
ishlaydi** (fake/hardcoded emas) — faqat haqiqiy uchinchi-tomon infratuzilmasi (SIP, OAuth,
to'lov shlyuzi) talab qiladigan **harakat tugmalari** (qo'ng'iroq boshlash, integratsiya
ulash, hisobni to'ldirish, mablag' yechish) ataylab disabled/"Tez orada" qoldirilgan — soxta
muvaffaqiyat holatini ko'rsatmaslik uchun. Faqat ikkita bo'lim ataylab qurilmagan: `/bots/:id`
(Assistant tahrirlash — worken'da AI/Chats/Calls/Knowledge bases tablariga ega ulkan sahifa,
o'zi alohida mahsulot, alohida faza sifatida qaraladi) va Code Agent/Preview Environments
(Arioo mahsulot doirasidan tashqari — mos ravishda alohida kod-agent mahsuloti va
Worken'ning ichki CI vositasi).

## Texnik stack

- **Frontend:** Next.js (App Router) + TypeScript + Tailwind + shadcn/ui
- **i18n:** next-intl (uz standart, ru, en)
- **Auth:** Clerk (Vercel Marketplace orqali ulangan) — Google OAuth + email/parol bilan
  kirish/ro'yxatdan o'tish, `<SignIn/>`/`<SignUp/>`/`<UserProfile/>` tayyor componentlari,
  `clerkMiddleware` orqali route himoyasi. Tashkilot/jamoa (`organization`/`membership`/
  `invite`) hamon o'zimizning yengil Drizzle jadvallarimizda saqlanadi — faqat `userId`
  endi Clerk foydalanuvchi ID'siga ishora qiladi, local `users` jadvali yo'q. Dastlabki
  spec (Auth.js-asosida yozilgan, endi eskirgan):
  `docs/superpowers/specs/2026-08-05-auth-cabinet-design.md`
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

- [x] **0 — Fundament**: repo skeleton (Next.js+TS+Tailwind+shadcn), brend/dizayn tizimi
      (Arioo), i18n scaffolding, CI, loyiha konventsiyalari
- [x] **1 — Marketing sayt**: landing (hero, qanday ishlaydi, 4 ish yo'nalishi), narxlash
      sahifasi (UZS+USD), hamkorlik dasturi sahifasi, konsultatsiya lid-formasi, huquqiy
      hujjatlar, til/tema almashtirgich
- [x] **2 — Auth + billing**: ro'yxatdan o'tish/kirish (Clerk — Google OAuth + email/parol,
      akkaunt ulash va faol sessiyalar Clerk'ning `<UserProfile/>` paneli orqali), tashkilot
      yaratish + jamoa taklifi,
      tarif tanlash, Payme/Click + Stripe checkout, obuna boshqaruvi, bo'sh dashboard skeleton,
      **kredit-asosidagi ichki valyuta** (masalan "ARI") + bonus valyuta, xarajat tarixi
      infratuzilmasi (jadval darajasida, UI Phase 3'da)
- [x] **3 — AI agent yadrosi**: agent yaratish ustasi (rol tanlash), bilim bazasi yuklash
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

Hozirgi holat: **0-2 bosqichlar tugallangan (marketing sayt, Clerk auth, onboarding,
dashboard skeleton). 3-bosqich (AI agent yadrosi) amalga oshirilgan** — agent yaratish
ustasi, bilim bazasi (Vercel Blob + pgvector), playground chat (AI Gateway), placeholder
Tools paneli, approvals navbat. **AI Gateway'da to'lov kartasi yo'qligi sababli haqiqiy
model chaqiruvlari (embedding/chat generation) hozircha ishlamayapti** — Vercel
dashboard'da to'lov kartasini qo'shish kerak (https://vercel.com/d?to=%2F%5Bteam%5D%2F%7E%2Fai%3Fmodal%3Dadd-credit-card),
qolgan hamma narsa (UI, DB, marshrutlash, xatoliklarni boshqarish) tayyor va tekshirilgan.
Speclar: `docs/superpowers/specs/2026-08-04-foundation-marketing-site-design.md`,
`docs/superpowers/specs/2026-08-05-auth-cabinet-design.md` (eskirgan, Clerk migratsiyasidan
oldin yozilgan), `docs/superpowers/specs/2026-08-07-ai-agent-core-design.md`

## worken.ru bilan to'liq (birga-bir) parity dasturi — 2026-08-12'dan boshlab

2026-08-12'da worken.ru'ning marketing sayti VA autentifikatsiyalangan paneli Chrome'da
(haqiqiy hisob bilan tizimga kirilgan holda) sahifama-sahifa chuqur tahlil qilindi (audit
natijasi: dizayn token'lari, sidebar tuzilishi, har bir dashboard sahifasining aniq tarkibi,
`/bots/:id` assistant-tahrirlash sahifasining to'liq maydon inventari). Foydalanuvchi
ko'rsatmasi: landing sahifa VA dashboard'ning ichki ko'rinishi **detalma-detal worken.ru
bilan bir xil** bo'lishi kerak, **faqat accent rangi to'q ko'k** (worken'ning to'q sariq
rangi o'rniga). 5-bosqichli dastur (**A va B bosqichlari 2026-08-12'da bajarildi va
tugallandi** — tafsilotlar `docs/superpowers/specs/2026-08-12-worken-parity-phase-a-shell-design.md`,
`docs/superpowers/plans/2026-08-12-worken-parity-phase-a-shell.md`,
`docs/superpowers/specs/2026-08-12-worken-parity-phase-b-marketing-design.md`,
`docs/superpowers/plans/2026-08-12-worken-parity-phase-b-marketing.md` fayllarida saqlangan;
git tarixi: A — `f6d133f` gacha bo'lgan commit'lar, B — `e836a86` gacha). **Ishni shu yerdan,
C-bosqichdan davom ettirish kerak:**

- [ ] **C — Dashboard'ning 13 ta sahifasini worken bilan bittalab solishtirib
      tuzatish**: `/assistants`, `/chats`, `/calls`, `/routines`, `/approvals`,
      `/knowledge-bases`, `/products`, `/integrations`, `/statistics`, `/runs`,
      `/billing`, `/affiliate-program`, `/referral-program`, `/settings/*` — filter-
      pill'lar, empty-state'lar, jadval ustunlari, statistika kartalari worken'ning
      aniq taksonomiyasiga moslashtiriladi. Yangi funksiya qo'shilmaydi, faqat
      mavjud sahifalar jilosi. Katta hajmi sababli bir nechta kichik spec+plan
      tsikliga bo'linishi kerak (masalan, sahifa guruhlari bo'yicha).
- [ ] **D — `/assistants/:id` (Assistant tahrirlash) to'liq qurilishi**: AI/Chats/
      Calls/Knowledge-bases — 20+ sozlama bloki (avval "alohida mahsulot" deb
      chetlab qo'yilgan edi, endi foydalanuvchi so'roviga ko'ra qurilishi rejalashtirilgan)
      + haqiqiy SIP qo'ng'iroq siyosati UI'si
- [ ] **E — Haqiqiy backend funksionallik**: SIP qo'ng'iroq, 13 ta OAuth
      integratsiya, Payme/Click/Stripe to'lov — roadmap'dagi 4-6-bosqichlar bilan
      bir xil, eng oxirida (tashqi provayder tanlovlari kerak)

Har bir bosqich alohida spec (`superpowers:brainstorming`) → reja
(`superpowers:writing-plans`) → ijro (`superpowers:subagent-driven-development`)
tsiklidan o'tadi, xuddi A-bosqich kabi.

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
