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

Qo'shimcha mahalliylashtirish: 3 til (o'zbek/rus/ingliz, standart — o'zbek), Clerk orqali
autentifikatsiya (Google OAuth + email/parol), Payme/Click mahalliy to'lovlari + Stripe
xalqaro kartalar uchun.

## Raqobatchi chuqur tahlili (worken.ru autentifikatsiyalangan panel)

Marketing saytdan tashqari, worken.ru'ning haqiqiy boshqaruv panelini (foydalanuvchi
o'zining haqiqiy akkaunti bilan tizimga kirgan holda, Chrome orqali) sahifama-sahifa
o'rganib chiqildi — bu shunchaki marketing landingdan ancha boy, to'liq agent-builder
platforma ekan. Har bir marshrut, uning tarkibi va bizdagi holati quyida:

| Worken marshruti | Worken tarkibi | Bizda hozir | Holat |
|---|---|---|---|
| `/bots` (Assistants ro'yxati) | Karta grid, "Create assistant" | ✅ `/assistants` mos keladi | Oldindan tayyor |
| `/bots/:id` (Assistant tahrirlash) | **Ulkan**: AI tab (instruktsiya, 54+ model/vendor tanlash, temperature/top-p, token limiti, 6+ integratsiya guruhi bo'yicha tool tanlash, memory/interruption/agent-steps sozlamalari) · Chats tab (profil, salomlashish, ovoz/TTS, limitlar, stop-so'zlar, triggerlar) · **Звонки/Calls tab** (to'liq SIP qo'ng'iroq siyosati) · Knowledge bases tab (vector store RAG sozlamalari) | Nomi/Rol/Prompt/Model/Tools-placeholder bor | **Qurilmagan** — bu bitta sahifa o'zi alohida mahsulot, ochiq qoladi |
| `/threads` (Chats) | Alohida thread ro'yxati + viewer | ✅ **qurildi** — `/chats`, master-detail (ro'yxat + `MessageBubble` viewer), real `conversations`/`messages`dan | Qurildi 2026-08-08 |
| `/realtime` (Calls) | Jonli qo'ng'iroq navbati, kampaniyalar, tarix | ✅ **qurildi** — `/calls`, statistika kartalari + Navbat/Kampaniyalar/Tarix tablari. "Qo'ng'iroq boshlash" ataylab disabled — SIP infratuzilmasi yo'q | Qurildi 2026-08-08 (UI shell, backend yo'q) |
| `/routines` | Jadval: trigger → resurs → status, "Create routine" | ✅ **qurildi** — `/routines`, haqiqiy CRUD + yangi `routine` jadvali. Har doim `status="draft"` — avtomatlashtirish dvigateli yo'qligi ochiq ko'rsatiladi | Qurildi 2026-08-08 (real CRUD, ishga tushmaydi) |
| `/approvals` (Needs review) | Statuslar + manba filtri (Barchasi/Rutinalar/Chat va ovoz) | ✅ **qurildi** — statuslar + manba-filtr tablari (`/approvals?status=&source=`) | Qurildi 2026-08-08 |
| `/vs` (Knowledge bases) | Ro'yxat + "Create base" | ✅ **qurildi** — `/knowledge-bases`, agent bo'yicha guruhlangan hujjatlar ro'yxati (bizda bilim bazasi agent-scoped, worken'da mustaqil) | Qurildi 2026-08-08 |
| `/products` | Commerce katalogi: tur filtri, status, narx, kanallar | ✅ **qurildi** — `/products`, haqiqiy CRUD + yangi `product` jadvali. To'lov yo'llari (Payme/Click) ulanmagani ochiq ko'rsatiladi | Qurildi 2026-08-08 (katalog, sotuv yo'q) |
| `/integrations` | Marketplace: 13 provayder + status dashboard + local MCP CLI | ✅ **qurildi** — `/integrations`, TayanchAI'ning o'z 11 provayderi (Avito/VK/HeadHunter o'rniga WhatsApp+OLX.uz). "Ulash" tugmalari ataylab disabled — real OAuth yo'q | Qurildi 2026-08-08 (katalog, ulanish yo'q) |
| `/stats` (Statistics) | Sana-oralig'i, CSV eksport, xarajat grafigi, prognoz | ✅ **qurildi** — `/statistics`, real `messages.estimatedCostUsd`/`conversations` agregatsiyasi, recharts grafiklar | Qurildi 2026-08-08 |
| `/workflows` (Runs) | Bot execution tarixi jadvali | ✅ **qurildi** — `/runs`, real suhbat/xabar/xarajat jadvali | Qurildi 2026-08-08 |
| `/code` (Code Agent) | GitHub repo'ga ulangan kod-agent task runner | Yo'q | **Doirasidan tashqari** — Claude Code/Devin uslubidagi alohida mahsulot, "AI xodim ijaraga olish" emas |
| `/preview-environments` | PR preview environment boshqaruvi | Yo'q | **Doirasidan tashqari** — Worken'ning ichki CI vositasi, mijozga ko'rinadigan funksiya emas |
| `/billing` | W-kredit, Wb bonus, saqlash xarajati, to'lov tarixi | ✅ **qurildi** — `/billing` + sidebar widget, yangi `organization_credit`/`credit_transaction` jadvallari. "Hisobni to'ldirish" ataylab disabled — real Stripe/Payme oqimi yo'q | Qurildi 2026-08-08 |
| `/affiliate-program` | Hamkor balansi, chegirma %, to'lov tarixi | ✅ **qurildi** — `/affiliate-program`. Real hamkor-akkaunt tizimi yo'qligi sababli soddalashtirilgan: ariza holati + 3 daraja jadvali, real balans/tarix yo'q | Qurildi 2026-08-08 (soddalashtirilgan) |
| `/referral-program` | Foydalanuvchi referali: balans, stavka %, havolalar, limitlar | ✅ **qurildi** — `/referral-program`, yangi `organization_referral`/`referral_operation` jadvallari, avtomatik referral kod, nusxalash tugmalari. "Yechib olish" ataylab disabled | Qurildi 2026-08-08 |
| `/settings` | Tablar: Проект / Пользователи / Лимиты | ✅ **qurildi** — `/settings/{project,team,limits,accounts}` umumiy tab-nav bilan. Limitlar sahifasi haqiqiy AI xodim/jamoa a'zosi sonini tarif limitiga solishtiradi | Qurildi 2026-08-08 |

**Xulosa**: 2026-08-08'da sidebar'dagi deyarli barcha bo'limlar quriladi — jami 13 ta yangi/
kengaytirilgan sahifa, 8 ta yangi DB jadvali (`organization_credit`, `credit_transaction`,
`routine`, `product`, `organization_referral`, `referral_operation`, `organization.plan`
ustuni). Har bir sahifa **haqiqiy ma'lumot bilan ishlaydi** (fake/hardcoded emas) — faqat
haqiqiy uchinchi-tomon infratuzilmasi (SIP, OAuth, to'lov shlyuzi) talab qiladigan **harakat
tugmalari** (qo'ng'iroq boshlash, integratsiya ulash, hisobni to'ldirish, mablag' yechish)
ataylab disabled/"Tez orada" qoldirilgan — soxta muvaffaqiyat holatini ko'rsatmaslik uchun.
Faqat ikkita bo'lim ataylab qurilmagan: `/bots/:id` (Assistant tahrirlash — o'zi alohida
ulkan mahsulot, alohida faza sifatida qaraladi) va Code Agent/Preview Environments
(TayanchAI mahsulot doirasidan tashqari — mos ravishda alohida kod-agent mahsuloti va
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

- [ ] **0 — Fundament**: repo skeleton (Next.js+TS+Tailwind+shadcn), brend/dizayn tizimi
      (TayanchAI), i18n scaffolding, CI, loyiha konventsiyalari
- [ ] **1 — Marketing sayt**: landing (hero, qanday ishlaydi, 4 ish yo'nalishi), narxlash
      sahifasi (UZS+USD), hamkorlik dasturi sahifasi, konsultatsiya lid-formasi, huquqiy
      hujjatlar, til/tema almashtirgich
- [ ] **2 — Auth + billing**: ro'yxatdan o'tish/kirish (Clerk — Google OAuth + email/parol,
      akkaunt ulash va faol sessiyalar Clerk'ning `<UserProfile/>` paneli orqali), tashkilot
      yaratish + jamoa taklifi,
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

Hozirgi holat: **0-2a bosqichlar tugallangan (marketing sayt, Clerk auth, onboarding,
dashboard skeleton). 3-bosqich (AI agent yadrosi) amalga oshirilgan** — agent yaratish
ustasi, bilim bazasi (Vercel Blob + pgvector), playground chat (AI Gateway), placeholder
Tools paneli, approvals navbat. **AI Gateway'da to'lov kartasi yo'qligi sababli haqiqiy
model chaqiruvlari (embedding/chat generation) hozircha ishlamayapti** — Vercel
dashboard'da to'lov kartasini qo'shish kerak (https://vercel.com/d?to=%2F%5Bteam%5D%2F%7E%2Fai%3Fmodal%3Dadd-credit-card),
qolgan hamma narsa (UI, DB, marshrutlash, xatoliklarni boshqarish) tayyor va tekshirilgan.
Speclar: `docs/superpowers/specs/2026-08-04-foundation-marketing-site-design.md`,
`docs/superpowers/specs/2026-08-05-auth-cabinet-design.md` (eskirgan, Clerk migratsiyasidan
oldin yozilgan), `docs/superpowers/specs/2026-08-07-ai-agent-core-design.md`

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
