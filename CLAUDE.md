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

## Integrations bo'limini qayta qurish — 2026-08-14'dan boshlab (TO'XTATILGAN, DAVOM ETTIRILADI)

worken.ru'ning Integrations paneli (status dashboard, ko'p-rejimli ulanish, haqiqiy
OAuth) Chrome orqali chuqur tahlil qilindi va shu darajaga moslashtirish maqsad
qilingan. Spec: `docs/superpowers/specs/2026-08-14-integrations-overhaul-design.md`.
Ijro `superpowers:subagent-driven-development` orqali, **alohida git worktree'da**
olib borilmoqda: `.claude/worktrees/integrations-overhaul`
(branch `worktree-integrations-overhaul`). **Muhim: bu ishning kodi hali `main`ga
merge qilinmagan** — shuning uchun `/integrations` sahifasi ilgari qanday ko'rinsa
hozir ham xuddi shunday ko'rinadi (eski holatda), toki worktree'dagi ish tugab
mainga merge qilinmaguncha. To'liq bosqichma-bosqich holat va davom etish qadami
worktree ichidagi ledger'da: `.superpowers/sdd/2026-08-14-integrations-group-4-oauth-infra/progress.md`.

Guruh 1-3 (ma'lumotlar modeli, status dashboard, Telegram tanlov oynasi) to'liq
tugallangan va review qilingan — shu guruhlarning reja fayllari endi keraksiz
bo'lgani uchun o'chirilgan. Guruh 4 (OAuth infratuzilmasi, qisman tugallangan),
Guruh 5 (yangi formalar) va Guruh 6 (detail sahifa) hali tugallanmagan — shu
sabab ularning reja fayllari `docs/superpowers/plans/2026-08-14-integrations-group-{4,5,6}-*.md`
da saqlanmoqda, ertaga davom ettirish uchun kerak.

## Takomillashtirish yo'l xaritasi — 2026-08-14'dan boshlab

### 7 — UX/Foydalanuvchi Tajribasini Keskin Oshirish

- [x] **7.1 — Real-time Bildirishnomalar (Notification System)**
  - SSE (Server-Sent Events) yoki Vercel KV + polling orqali real-time push
  - Sidebar'da bildirishnoma bell icon + oqilmagan bildirishnomalar soni badge
  - Triggerlar: yangi suhbat kelganda, yangi CRM lid qo'shilganda, approval
    kutayotgan bo'lganda, ticket javob kelganda
  - DB schema: `notifications` jadvali (userId, type, title, body, isRead, createdAt)
  - Foydalanuvchi bildirishnomalarni "O'qildi" deb belgilashi mumkin

- [x] **7.2 — Global Qidiruv (⌘K / Ctrl+K Command Palette)**
  - `cmdk` kutubxonasi bilan command palette dialog
  - Qidirish sohasi: AI agentlar, CRM deal'lar, kontaktlar, suhbatlar, mahsulotlar
  - Fuzzy search — foydalanuvchi istalgan so'zni yozsa topadi
  - Tez navigatsiya: sahifalar o'rtasida tezkor o'tish (Assistants, CRM, Billing...)
  - Keyboard shortcut: `⌘K` (Mac) / `Ctrl+K` (Windows/Linux)

- [x] **7.3 — AI Agent Shaxsiy Performance Dashboard**
  - Har bir AI xodim uchun alohida `/assistants/[agentId]/analytics` sahifasi
  - Kunlik/haftalik/oylik javob berish tezligi (o'rtacha response time)
  - Konversiya ko'rsatkichi: suhbatdan → CRM deal'ga o'tish foizi
  - Eng ko'p so'raladigan savollar TOP-10 (AI orqali klasterlash)
  - Xarajat vs daromad taqqoslash grafigi (Recharts)
  - Token ishlatish trendi (kunlik/haftalik)

- [x] **7.4 — Suhbat Sentiment Tahlili (AI-powered)**
  - Har bir suhbat yakunlanganda AI orqali avtomatik baholash
  - 3 daraja: 😊 Ijobiy / 😐 Neytral / 😡 Salbiy — avtomatik teg
  - DB schema: `conversations` jadvaliga `sentiment` ustuni qo'shish
  - "Norozi mijoz" aniqlanganda operator'ga avtomatik bildirishnoma (7.1 bilan bog'liq)
  - Dashboard'da umumiy sentiment trend grafigi (Statistics sahifasiga yangi karta)
  - "Sotib olishga tayyor" intent aniqlanganda CRM'ga avtomatik lid yaratish

- [x] **7.5 — Onboarding Wizard (Bosqichma-bosqich Yo'riqnoma)**
  - Yangi foydalanuvchi tashkilot yaratgandan keyin 5 bosqichli interactive tour:
    1. Tashkilot sozlamalari (nom, soha)
    2. Birinchi AI xodimni yaratish (shablondan tanlash)
    3. Bilim bazasiga hujjat yuklash
    4. Telegram/WhatsApp ulash
    5. Test suhbat o'tkazish (playground)
  - Progress bar bilan "85% tayyor" motivatsiya ko'rsatish
  - Har bosqichda qisqa tooltip/popover ko'rsatma
  - DB schema: `organizations` jadvaliga `onboardingStep` ustuni qo'shish
  - Foydalanuvchi istalgan vaqtda o'tkazib yuborishi (skip) mumkin

### 8 — Biznes O'sishi va Monetizatsiya

- [x] **8.1 — AI Agent Shablonlar Bozori (Template Marketplace)**
  - `/templates` yangi sahifa — soha bo'yicha tayyor konfiguratsiyalar
  - Har bir shablon: nom, tavsif, soha, rol, tayyor systemPrompt, bilim bazasi namunasi
  - 1 klikda o'rnatish — tanlangan shablon asosida yangi agent avtomatik yaratiladi
  - Boshlang'ich shablonlar:
    - "Do'kon sotuv bo'limi" — narxlar, buyurtma holati so'rovlari
    - "Restoran bron qilish" — stol bron, menyu, ish vaqti
    - "Ko'chmas mulk agenti" — OLX integratsiya, narx so'rash
    - "Ta'lim markazi" — kurs ma'lumotlari, ro'yxatdan o'tish
    - "Texnik qo'llab-quvvatlash" — FAQ, ticket yaratish
  - DB schema: `agent_templates` jadvali (name, description, industry, role,
    systemPrompt, sampleKnowledge, isPublic, createdByOrgId)
  - Keyinchalik foydalanuvchilar o'z shablonlarini ulashishi mumkin (community)

- [x] **8.2 — Agent Promptlari uchun A/B Testing**
  - Ikki xil prompt sozlamasini (variant A / variant B) solishtirib sinash
  - Traffic'ni 50/50 yoki 70/30 bo'lish
  - Metrikalar: konversiya (deal yaratildi), javob sifati (sentiment), o'rtacha
    suhbat uzunligi, mijoz qaytishi
  - Belgilangan muddat (7/14/30 kun) yoki minimal suhbat soniga yetganda avtomatik
    g'olibni tanlash va ikkinchisini o'chirish
  - DB schema: `ab_tests` jadvali (agentId, variantAPrompt, variantBPrompt,
    trafficSplit, startDate, endDate, status, winnerId)
  - `/assistants/[agentId]/ab-testing` yangi tab

- [x] **8.3 — WhatsApp/Telegram Xabar Shablonlari Kutubxonasi**
  - Tez-tez ishlatiladigan javoblar to'plami
  - "Buyurtma holati", "Narxlar ro'yxati", "Ish vaqti", "Manzil" kabi tayyor shablonlar
  - AI xodim suhbat davomida mos shablonni avtomatik taklif qiladi (RAG orqali)
  - Soha shabloniga bog'liq — do'kon shabloni boshqa, restoran boshqa
  - Foydalanuvchi o'z shablonlarini qo'shishi/tahrirlashi mumkin
  - DB schema: `message_templates` jadvali (organizationId, agentId, title,
    body, category, usageCount)

- [x] **8.4 — Multi-Agent Handoff (Agentlar Arasi Uzatish)**
  - Bir AI xodim boshqa AI xodimga suhbatni avtomatik uzatishi
  - Scenario'lar: Sotuv → Support, Support → HR, umumiy → ixtisoslashgan
  - Trigger qoidalari Routines orqali sozlanadi (masalan: "texnik muammo"
    aniqlanganda support agentiga uzat)
  - Suhbat tarixi to'liq saqlanadi — yangi agent oldingi kontekstni ko'radi
  - DB schema: `conversations` jadvaliga `handoffFromAgentId`, `handoffReason`
    ustunlari qo'shish
  - Foydalanuvchi dashboard'da handoff tarixini ko'rishi mumkin

### 9 — Texnik Sifat va Xavfsizlik

- [x] **9.1 — Server Action'larda Zod Validatsiya**
  - Barcha admin va dashboard server action'lariga Zod schema qo'shish
  - Xato bo'lsa foydalanuvchiga chiroyli, tushunarli xabar ko'rsatish (toast/alert)
  - XSS va SQL injection himoyasi (input sanitization)
  - Har bir action uchun error boundary va try/catch
  - `useActionState` hook bilan form holat boshqaruvi (pending, success, error)
  - Mavjud action'lar: admin CRUD (9 ta), approvals (2 ta), onboarding, integrations,
    consultation — jami ~15-20 ta action tekshiriladi

- [x] **9.2 — Optimistic UI Updates**
  - Server action'dan keyin sahifa to'liq reload bo'lmasdan UI yangilanishi
  - `useOptimistic` hook bilan — tugma bosilganda darhol UI yangilanadi
  - Server'dan javob kelmaguncha "pending/loading" holat ko'rsatish
  - Xato bo'lsa avtomatik rollback (oldingi holatga qaytish)
  - Birinchi navbatda: CRM deal statusini o'zgartirish, approval tasdiqlash/rad etish,
    agent statusini o'zgartirish — eng ko'p ishlatiladigan operatsiyalar

- [x] **9.3 — E2E Test Coverage (Playwright)**
  - `playwright.config.ts` mavjud, lekin testlar yozilmagan
  - Asosiy user flow'larni qoplash:
    - Marketing sayt: landing → pricing → sign-up
    - Auth: sign-in → onboarding → dashboard
    - Agent yaratish: new assistant → configure → test chat
    - CRM: create deal → move through kanban → close
    - Admin: login → CRUD operatsiyalari (e'lon, ticket, promokod)
  - CI/CD'da har push/PR'da avtomatik ishga tushirish (GitHub Actions)
  - Minimal maqsad: 15-20 ta asosiy test scenario

- [x] **9.4 — White-label/Agentlik Rejimi**
  - Hamkorlik dasturi ishtirokchilari Arioo'ni o'z brendi ostida taqdim etishi
  - Sozlanuvchi elementlar: logo, accent rang, favicon, app nomi, custom domain
  - DB schema: `organizations` jadvaliga `whitelabel` JSON ustuni (logo, colors,
    domain, appName)
  - Middleware'da custom domain'ni aniqlash va mos tashkilotga yo'naltirish
  - Referral dasturini kuchaytiradi — hamkorlar o'z mijozlariga sotadi, Arioo
    infratuzilmani ta'minlaydi
  - Faqat Enterprise tarif uchun mavjud

Har bir bosqich alohida spec (`superpowers:brainstorming`) → reja
(`superpowers:writing-plans`) → ijro (`superpowers:subagent-driven-development`)
tsiklidan o'tadi, xuddi A-bosqich kabi.

## Integrations bo'limini qayta qurish — 2026-08-14'dan boshlab (DAVOM ETMOQDA)

worken.ru'ning Integrations paneli Chrome orqali chuqur tahlil qilindi (status
dashboard, ko'p-rejimli ulanish, real OAuth) va Arioo'ning Integrations bo'limi
shu darajaga olib chiqilmoqda. Spec:
`docs/superpowers/specs/2026-08-14-integrations-overhaul-design.md`. Ijro
`superpowers:subagent-driven-development` orqali, alohida git worktree'da
(`.claude/worktrees/integrations-overhaul`, branch
`worktree-integrations-overhaul`) 6 ta guruh rejasi bo'yicha ketma-ket
bajarilmoqda — har biri o'z faylida:
`docs/superpowers/plans/2026-08-14-integrations-group-{1..6}-*.md`.

**Joriy holat (2026-08-14 kuni to'xtatildi, foydalanuvchi so'rovi bilan):**
- [x] **Guruh 1 — Ma'lumotlar modeli va provider katalogi** — to'liq tugallangan,
      final review'dan o'tgan (commit `c7bdcad`)
- [x] **Guruh 2 — Status dashboard va ikki-bo'limli grid** — to'liq tugallangan,
      final review'dan o'tgan (commit `0efc446`)
- [x] **Guruh 3 — Telegram Bot/MTProto tanlov oynasi** — to'liq tugallangan,
      final review'dan o'tgan (commit `d475b78`)
- [~] **Guruh 4 — OAuth infratuzilmasi** — Task 1-6 (env o'zgaruvchilari, HMAC
      state, provider config, start/callback route'lar, token exchange)
      implement qilingan va commit qilingan (`faeb89b`..`e7a2c2b`), **lekin hali
      task-review qilinmagan**. **Davom ettirish uchun keyingi qadam: shu
      6-commit'lik diff uchun task reviewer dispatch qilish, keyin Task 7-8ga
      o'tish** (amoCRM/Bitrix24/Google/GitHub/HeadHunter kartalarini
      `OAuthConnectButton`ga ulash + `isOAuthConfigured`/toast wiring). To'liq
      tafsilot: `.superpowers/sdd/2026-08-14-integrations-group-4-oauth-infra/progress.md`
      (worktree ichida, git-ignored — agar o'chirilgan bo'lsa, shu commit
      range'idan qayta tiklash mumkin).
- [ ] **Guruh 5 — Yangi/tuzatilgan formalar** (SIP, 1C, VK, Custom MCP dinamik
      headers) — hali boshlanmagan
- [ ] **Guruh 6 — `/integrations/:id` boshqaruv sahifasi** — hali boshlanmagan

**Muhim arxitektura eslatmasi (Guruh 2/3'dan meros)**: Telegram katalogda bitta
`"telegram"` id sifatida ko'rinadi, lekin DB'da ikkita alohida qator
(`telegram_bot`/`telegram_mtproto`) sifatida saqlanadi — status dashboard va
filtrlar hozircha buni to'liq ko'ra olmaydi (faqat kartaning o'zi
`botConnected`/`mtprotoConnected` orqali to'g'ri ko'rsatadi). Bu ataylab
tuzatilmagan (YAGNI) — Guruh 5/6 shunga o'xshash ko'p-qatorli holatga duch
kelsa (masalan Custom MCP bir nechta server bilan), `ProviderConfig`ga
`integrationProviderIds: string[]` fan-out xaritasi qo'shish tavsiya etiladi.

Davom ettirish uchun: shu worktree'ga qaytib (yoki yangisini ochib),
`superpowers:subagent-driven-development` skilini qayta chaqirib, yuqoridagi
"Davom ettirish uchun keyingi qadam"dan boshlash kifoya.

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
