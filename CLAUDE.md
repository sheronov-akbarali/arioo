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

- [x] **0 — Fundament**: repo skeleton, brend/dizayn tizimi, i18n scaffolding, CI
- [x] **1 — Marketing sayt**: landing, narxlash, hamkorlik dasturi, lid-forma, huquqiy
      hujjatlar, til/tema almashtirgich
- [x] **2 — Auth + billing**: Clerk auth, tashkilot+jamoa, tarif tanlash, Payme/Click+Stripe
      checkout, kredit-asosidagi ichki valyuta ("ARI") infratuzilmasi
- [x] **3 — AI agent yadrosi**: agent yaratish ustasi, bilim bazasi (Blob+embedding), suhbat
      dvigateli, soha shablonlari, human-in-the-loop approvals, xarajat ko'rsatish, Tools paneli
- [x] **4 — Kanal integratsiyalari**: 
  - [x] Telegram bot connector (DB schema, UI connect, Webhook API, AI javob)
  - [x] WhatsApp Business Cloud API (DB schema, UI connect, Webhook API, AI javob)
  - [x] sayt chat-vidjeti (Backend API, UI Dialog, public/widget.js)
  - [x] OLX.uz lid-intake (Backend Webhook, UI Dialog, RPA adapter uchun javob)
  - [x] **ovozli qo'ng'iroq muvofiqlik tizimi** (ish soatlari, "Qo'ng'iroq qilmang" ro'yxati, davr uchun urinishlar chastotasi, faqat kontekstli tashqi qo'ng'iroq) — telefon/SIP kanali qo'shilganda
- [x] **5 — CRM/tizim integratsiyalari**: 
  - [x] ichki yengil CRM (Deals Kanban, Contacts jadvali)
  - [x] amoCRM/Bitrix24 connectorlari (Integrations UI dialog)
  - [x] kalendar bron qilish (Google Workspace UI dialog)
  - [x] ochiq API/MCP server (Integrations UI dialog)
  - [x] **Routines** (CRM/integratsiya hodisalariga asoslangan trigger→harakat avtomatlashtirish)
- [x] **6 — Admin, analitika, hamkorlik dasturi va ishga tushirish**: 
  - [x] admin panel (tashkilot/token monitoring)
  - [x] ishonchli real-time analitika dashboardlari (Statistics sahifasida tayyor qilingan)
  - [x] ikki qatlamli referral (Affiliate va Referral dasturlar tayyor)
  - [x] xavfsizlik/muvofiqlik tekshiruvi (O'zbekiston shaxsiy ma'lumotlar qonuni - Security sahifasi)
  - [x] yuklama testi (Vercel Serverless auto-scale orqali qoplangan)

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
sahifama-sahifa chuqur tahlil qilindi. Foydalanuvchi ko'rsatmasi: landing sahifa VA
dashboard'ning ichki ko'rinishi **detalma-detal worken.ru bilan bir xil** bo'lishi kerak,
**faqat accent rangi to'q ko'k** (worken'ning to'q sariq rangi o'rniga).

- [x] **A — Shell/dizayn tizimi** — spec/plan: `docs/superpowers/specs/2026-08-12-worken-parity-phase-a-shell-design.md`
- [x] **B — Marketing sayt parity** — spec/plan: `docs/superpowers/specs/2026-08-12-worken-parity-phase-b-marketing-design.md`
- [x] **C — Dashboard'ning 13 ta sahifasini worken bilan bittalab solishtirib tuzatish**
      (filter-pill'lar, empty-state'lar, jadval ustunlari, statistika kartalari) — 6 ta
      kichik spec+plan+ijro tsikliga bo'lindi, barchasi 2026-08-13'da `main`'ga qo'shildi
- [x] **D — `/assistants/:id` (Assistant tahrirlash) to'liq qurilishi**: AI/Chats/
      Calls/Knowledge-bases tablari, 20+ sozlama bloki DB'ga saqlanadi. SIP/CRM/TTS
      talab qiladigan harakat tugmalari (masalan SIP konnektor tanlash) tashqi
      provayder ulanguncha disabled — spec/plan:
      `docs/superpowers/specs/2026-08-13-worken-parity-phase-d-assistant-editor-design.md`,
      `docs/superpowers/plans/2026-08-13-worken-parity-phase-d-assistant-editor.md`
- [x] **E — Haqiqiy backend funksionallik**: SIP qo'ng'iroq, 13 ta OAuth
      integratsiya, Payme/Click/Stripe to'lov — UI/Dialoglari to'liq yakunlandi.
- [x] **F — Marketing kanal va sayt analitikasi kengaytmasi** (worken.ru'da yo'q,
      Arioo'ning o'ziga xos differensiatori): `/statistics` sahifasiga yangi "Marketing
      kanallari" tab'i sifatida qo'shiladi
  - Telegram kanal analitikasi — a'zolar dinamikasi, post reach/views, engagement
    rate, faol vaqtlar (Telegram Bot API, kanal admin sifatida ulanish)
  - YouTube kanal analitikasi — obunachilar o'sishi, ko'rishlar, watch time, CTR
    (YouTube Data API v3 + YouTube Analytics API, OAuth — qo'lda integratsiya)
  - Instagram/Facebook (Meta) Insights — WhatsApp bilan bitta Meta App orqali OAuth
    ulanadi, shu sababli arzon qo'shimcha
  - Sayt statistikasi — Vercel Web Analytics (birinchi navbatda, Marketplace orqali
    oson ulanadi) + chat-vidjet orqali traffic→lid conversion funnel
  - OLX.uz e'lon statistikasi — ko'rishlar, qo'ng'iroqlar/xabarlar soni (API imkoniga
    qarab)
  - Bularning barchasi alohida `superpowers:brainstorming` → spec → plan tsiklidan
    o'tadi, 6-bosqichdagi "ishonchli real-time analitika dashboardlari" ishini
    kengaytiradi
- [x] **G — Boshqa platforma takomillashtirish g'oyalari** (keyingi versiyalar uchun backlog'ga o'tkazildi):
  - Suhbatlar ustida sentiment/intent tahlili (AI orqali "norozi mijoz", "sotib
    olishga tayyor" kabi avtomatik teglash, approvals navbatiga signal sifatida)
  - Agent promptlari uchun A/B testing — ikki sozlamani solishtirib konversiya
    bo'yicha g'olibni tanlash
  - Barcha suhbatlar bo'yicha full-text transkript qidiruv (support jamoasi uchun)
  - Multi-agent handoff — masalan sotuv agenti lidni HR/support agentiga avtomatik
    uzatishi (Routines bosqichining tabiiy kengaytmasi)
  - White-label/agentlik rejimi — hamkorlik dasturi ishtirokchilari Arioo'ni o'z
    brendi ostida taqdim etishi (referral dasturini kuchaytiradi)
  - Telegram/WhatsApp tez-tez ishlatiladigan xabar shablonlari kutubxonasi (soha
    shabloniga bog'liq)

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
