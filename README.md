# Arioo — AI Xodim Ijaraga Olish Platformasi

O'zbekiston bizneslari uchun B2B SaaS platforma: har qanday kompaniya bir necha daqiqada
o'ziga **sun'iy intellekt asosidagi virtual xodim** "ishga oladi" — sotuv, qo'llab-quvvatlash,
HR yoki marketing bo'yicha. Bu AI xodim Telegram, WhatsApp va veb-saytga ulanadi, mijozlar
bilan mustaqil suhbatlashadi, CRM'da lidlarni yuritadi va kerak bo'lganda inson operatorga
topshiradi.

> Konseptual asos — rus bozori uchun qurilgan [worken.ru](https://worken.ru) (Arioo'ga
> tegishli emas, faqat g'oya manbai). Arioo uni O'zbekiston bozori uchun chuqur
> mahalliylashtiradi va 3 ta muhim yo'nalishda undan ustunlashtiradi: **WhatsApp Business**
> integratsiyasi, **tayyor soha shablonlari** (do'kon, restoran, ta'lim markazi, ko'chmas
> mulk) va **inson-nazoratidagi (human-in-the-loop)** xavfsizlik qatlami.

---

## Mundarija

1. [Bu platforma nima qila oladi](#1-bu-platforma-nima-qila-oladi)
2. [Mijozlar paneli — sahifama-sahifa](#2-mijozlar-paneli--sahifama-sahifa)
3. [Marketing sayti](#3-marketing-sayti)
4. [Admin paneli](#4-admin-paneli)
5. [Kanallar va integratsiyalar](#5-kanallar-va-integratsiyalar)
6. [To'lov va monetizatsiya](#6-tolov-va-monetizatsiya)
7. [Texnik stack va arxitektura](#7-texnik-stack-va-arxitektura)
8. [Loyihani ishga tushirish](#8-loyihani-ishga-tushirish)

---

## 1. Bu platforma nima qila oladi

Arioo — bitta tashkilot (kompaniya) uchun bir nechta AI xodimni boshqarish, ularni real
muloqot kanallariga ulash va butun jarayonni CRM + analitika bilan kuzatish imkonini
beruvchi to'liq ekotizim:

- **AI xodim yaratish** — soha shabloni yoki noldan, bilim bazasi (hujjatlar) bilan
  o'qitiladi, xarakteri va javob ohangi sozlanadi.
- **Ko'p kanalli aloqa** — Telegram bot/MTProto, WhatsApp Business, sayt chat-vidjeti,
  SIP telefoniya orqali bitta agent barcha kanallarda ishlaydi.
- **Ichki CRM** — lidlar/bitimlar Kanban doskada, kontaktlar jadvalida, avtomatik
  yaratiladi (AI suhbatdan aniqlaganda) yoki qo'lda kiritiladi.
- **Human-in-the-loop** — AI ishonchsiz holatda (masalan, narx bo'yicha kelishuv yoki
  shikoyat) avtomatik ravishda inson operatorga topshiradi — approvals navbatida.
- **Routines (avtomatlashtirish)** — "agar X hodisa yuz bersa, Y harakatni bajar" tipidagi
  trigger→harakat zanjirlari (masalan: yangi lid kelsa — Telegram'ga xabar yubor).
  Nom "workflow" yoki "automation" emas — mahsulotda "Routines" deb ataladi.
  Multi-agent handoff ham shu mexanizm orqali ishlaydi (masalan sotuv agenti → support
  agentiga suhbatni uzatadi).
- **Real-time analitika** — suhbatlar, konversiya, xarajat (token) va daromad statistikasi,
  har bir AI xodim uchun alohida performance dashboard.
- **Sentiment tahlili** — har bir suhbat AI orqali baholanadi (ijobiy/neytral/salbiy),
  "norozi mijoz" aniqlansa operatorga darhol bildirishnoma boradi.
- **Shablonlar bozori** — tayyor soha konfiguratsiyalari (do'kon, restoran, ko'chmas mulk,
  ta'lim markazi, texnik yordam) 1 klikda o'rnatiladi.
- **A/B testing** — bitta agent uchun ikki xil prompt/sozlama solishtiriladi, konversiya
  bo'yicha g'olib avtomatik tanlanadi.
- **Hamkorlik va referral dasturlari** — ikki qatlamli komissiya tizimi orqali platforma
  o'sishi rag'batlantiriladi.
- **White-label rejimi** — Enterprise mijozlar Arioo'ni o'z brendi (logo, rang, domen)
  ostida taqdim etishi mumkin.
- **3 tilda va mahalliy to'lovlarda** — o'zbek (standart), rus, ingliz; narxlar UZS'da,
  Payme/Click (mahalliy) va Stripe (xalqaro kartalar) orqali to'lanadi.

---

## 2. Mijozlar paneli — sahifama-sahifa

Tizimga kirgan (Clerk orqali autentifikatsiyalangan) foydalanuvchi quyidagi bo'limlarga ega:

### 📊 Dashboard (`/dashboard`)
Tashkilotning umumiy holati bir qarashda: faol AI xodimlar soni, jami suhbatlar,
CRM'dagi ochiq bitimlar, so'nggi faoliyat — barchasi haqiqiy ma'lumotlar bazasidan
real vaqtda hisoblanadi.

### 🤖 AI Xodimlar (`/assistants`)
- Yangi agent yaratish ustasi (`/assistants/new`) — rol tanlash (sotuv, qo'llab-quvvatlash,
  HR, tarjimon), bilim bazasi biriktirish, xarakter/ohang sozlash.
- Har bir agent tahrirlash sahifasi (`/assistants/[agentId]`) — **AI**, **Chats**,
  **Calls**, **Knowledge bases** tablari orqali 20+ sozlama bloki: model tanlash,
  tizim prompti, ijodkorlik darajasi, javob uzunligi, kanal ulanishlari, SIP
  konnektor, ovoz sozlamalari va h.k.
- Har bir agent uchun alohida **Performance Dashboard** (`/assistants/[agentId]/analytics`) —
  javob tezligi, konversiya foizi, TOP-10 ko'p so'raladigan savol, xarajat/daromad
  grafigi, token trendi.
- **A/B Testing** tab'i (`/assistants/[agentId]/ab-testing`) — ikki prompt variantini
  solishtirib, avtomatik g'olibni tanlash.

### 💬 Suhbatlar (`/chats`)
Barcha kanallardagi (Telegram, WhatsApp, sayt vidjeti) suhbatlar bitta oqimda,
AI/inson operator aralashuvi tarixi bilan, sentiment tegi (😊/😐/😡) ko'rsatiladi.

### 📞 Qo'ng'iroqlar (`/calls`)
SIP telefoniya orqali AI xodimning ovozli qo'ng'iroqlari — tarix, yozuvlar, muvofiqlik
tekshiruvi (ish soatlari, "Qo'ng'iroq qilmang" ro'yxati).

### 🗂️ CRM (`/crm`, `/crm/contacts`)
- **Deals Kanban** — Yangi lid → Muzokara → Muvaffaqiyatli → Bekor qilingan bosqichlari,
  drag-and-drop bilan optimistik UI yangilanishi.
- **Kontaktlar jadvali** — barcha mijozlar bir joyda, suhbat va bitim tarixi bilan bog'liq.
- Bitimlar AI orqali avtomatik (suhbatdan "xarid niyati" aniqlanganda) yoki qo'lda
  yaratiladi.

### 📚 Bilim bazasi (`/knowledge-bases`)
PDF, Word, matn hujjatlari yuklanadi (Vercel Blob), embedding orqali AI xodim faqat
shu ma'lumotlarga tayangan holda javob beradi (RAG).

### 🛍️ Mahsulotlar (`/products`)
Kompaniyaning tovar/xizmat katalogi — AI xodim suhbat davomida shu ro'yxatdan
foydalanadi.

### 🔌 Integratsiyalar (`/integrations`, `/integrations/[id]`)
Status-dashboard ko'rinishida ulangan va mavjud integratsiyalar:
- **Telegram** (Bot API va MTProto rejimlari)
- **WhatsApp Business Cloud API** (Meta)
- **amoCRM / Bitrix24** — OAuth orqali
- **Google Workspace** — kalendar bron qilish
- **1C** — forma orqali ulanish
- **SIP telefoniya**
- **Custom MCP Server** — ochiq API/MCP orqali tashqi tizimlarni ulash
- Har bir integratsiya uchun test-connection, arxivlash, o'chirish va audit-log tarixi.

### ⚙️ Routines (`/routines`)
CRM/integratsiya hodisalariga asoslangan trigger→harakat avtomatlashtirish (masalan:
"texnik muammo" aniqlansa — support agentiga uzat; yangi deal yaratilsa — Telegram'ga
bildirishnoma yubor).

### ✅ Tasdiqlashlar (`/approvals`)
AI ishonchsiz bo'lgan holatlarda navbatga qo'yilgan xabarlar — operator ko'rib chiqib
tasdiqlaydi yoki tahrirlaydi (human-in-the-loop).

### 📈 Statistika (`/statistics`, `/statistics/marketing`)
- Umumiy real-time analitika: suhbatlar, konversiya, xarajat, sentiment trend grafigi.
- **Marketing kanallari** tab'i — Telegram kanal analitikasi (a'zolar dinamikasi,
  post reach/engagement), YouTube kanal statistikasi (obunachilar, ko'rishlar), Meta
  (Instagram/Facebook) Insights, sayt trafik→lid conversion funnel.

### 🧩 Shablonlar (`/templates`)
Tayyor soha konfiguratsiyalari galereyasi — 1 klikda tanlangan shablon asosida yangi
AI xodim avtomatik yaratiladi (do'kon, restoran, ko'chmas mulk, ta'lim markazi,
texnik yordam va h.k).

### ✉️ Xabar shablonlari (`/message-templates`)
Tez-tez ishlatiladigan tayyor javoblar kutubxonasi ("Buyurtma holati", "Narxlar
ro'yxati", "Ish vaqti"), AI xodim suhbat davomida mosini avtomatik taklif qiladi.

### 🏃 Runs (`/runs`)
AI xodim va Routines bajargan barcha ishlarning bajarilish jurnali (execution log).

### 💳 Billing (`/billing`)
Tarif tanlash, kredit-asosidagi ichki valyuta ("ARI") balansi, to'lov tarixi,
Payme/Click/Stripe orqali hisobni to'ldirish.

### 🤝 Hamkorlik va referral dasturlari (`/affiliate-program`, `/referral-program`)
Ikki qatlamli komissiya tizimi — hamkorlar Arioo'ni tavsiya qilib komissiya oladi.

### ⚙️ Sozlamalar (`/settings/*`)
Loyiha (`project`), jamoa a'zolari (`team`), akkauntlar (`accounts`), limitlar
(`limits`), xavfsizlik/muvofiqlik (`security` — O'zbekiston shaxsiy ma'lumotlar
qonuniga moslik), va Enterprise uchun **white-label** (`whitelabel` — logo, accent
rang, domen, ilova nomi) sozlamalari.

### 🧑‍💻 Code Agent (`/code-agent`)
Alohida mahsulot yo'nalishi sifatida ajratilgan — kod generatsiyasi bo'yicha eksperimental
bo'lim (asosiy Arioo mahsulot doirasidan tashqarida).

---

## 3. Marketing sayti

Tizimga kirmagan tashrifchilar uchun ochiq qism:
- Landing sahifa — mahsulot tavsifi, imkoniyatlar, ishonch signallari.
- Narxlash (`/pricing`) — tariflar UZS'da, USD ikkinchi darajali.
- Hamkorlar (`/partners`) — hamkorlik dasturi tavsifi.
- Huquqiy hujjatlar (`/legal/[doc]`) — foydalanish shartlari, maxfiylik siyosati.
- Ro'yxatdan o'tish/kirish (`/sign-up`, `/sign-in`) — Clerk orqali, Google OAuth yoki
  email/parol bilan.
- **Onboarding wizard** — yangi tashkilot uchun 5 bosqichli interaktiv yo'riqnoma
  (tashkilot sozlash → birinchi AI xodim yaratish → hujjat yuklash → kanal ulash →
  test suhbat), progress-bar bilan, istalgan vaqtda o'tkazib yuborish mumkin.
- Til/tema almashtirgich — 3 til (uz/ru/en), yorug'/qorong'i rejim.

---

## 4. Admin paneli

Arioo tizimi egalari uchun markaziy boshqaruv (`/admin`):
- **Foydalanuvchilar** (`/admin/users`) — barcha tashkilotlar va akkauntlar monitoringi.
- **AI xodimlar** (`/admin/agents`) — token sarfi va faollik bo'yicha global nazorat.
- **Billing** (`/admin/billing`) — barcha to'lovlar va obunalar.
- **Marketing** (`/admin/marketing`) — lid-forma murojaatlari.
- **E'lonlar** (`/admin/announcements`) — platforma bo'ylab bildirishnomalar.
- **Tickets** (`/admin/tickets`) — qo'llab-quvvatlash murojaatlari.
- **Sozlamalar** (`/admin/settings`) — tizim darajasidagi konfiguratsiya.

---

## 5. Kanallar va integratsiyalar

| Kanal / Tizim | Holat |
|---|---|
| Telegram (Bot API + MTProto) | ✅ To'liq ishlaydi |
| WhatsApp Business Cloud API (Meta) | ✅ To'liq ishlaydi |
| Sayt chat-vidjeti (`public/widget.js`) | ✅ To'liq ishlaydi |
| SIP telefoniya (ovozli qo'ng'iroq) | ✅ Muvofiqlik tizimi bilan |
| amoCRM / Bitrix24 | ✅ OAuth orqali |
| Google Workspace (kalendar) | ✅ |
| YouTube Data API | ✅ Kanal analitikasi uchun |
| Instagram / Facebook (Meta Insights) | ✅ WhatsApp bilan bitta Meta App orqali |
| 1C | ✅ Forma orqali |
| Ochiq API / Custom MCP Server | ✅ |

---

## 6. To'lov va monetizatsiya

- **Payme** va **Click** — O'zbekiston mahalliy to'lov tizimlari (qo'lda API
  integratsiyasi, Vercel Marketplace'da tayyor konnektor yo'q).
- **Stripe** — xalqaro kartalar uchun.
- **ARI** — kredit-asosidagi ichki valyuta, AI model chaqiruvlari va boshqa
  resurslar shunga nisbatan hisoblanadi.
- Ikki qatlamli **affiliate** va **referral** dasturlari orqali o'sish rag'batlantiriladi.

---

## 7. Texnik stack va arxitektura

| Qatlam | Texnologiya |
|---|---|
| Frontend | Next.js (App Router) + TypeScript + Tailwind + shadcn/ui |
| i18n | next-intl (standart — `uz`, keyin `ru`, `en`) |
| Autentifikatsiya | Clerk (Google OAuth + email/parol, `clerkMiddleware`) |
| Ma'lumotlar bazasi | Neon Postgres + Drizzle ORM |
| AI | Vercel AI SDK + AI Gateway (multi-model, xarajat nazorati) |
| Fayl/bilim bazasi | Vercel Blob |
| Uzoq jarayonlar | Vercel Workflow (lid pipeline, onboarding) |
| To'lovlar | Stripe + Payme/Click (mahalliy, qo'lda integratsiya) |
| Kanallar | Telegram Bot API, WhatsApp Business Cloud API, sayt vidjeti, SIP |
| Hosting | Vercel |

**Asosiy data-model:** Tashkilot (tenant) → Foydalanuvchilar → Obuna/tarif →
AI Xodimlar (rol: sotuv/HR/marketing) → Kanallar → Suhbatlar/xabarlar → Bilim
bazasi hujjatlari → Lidlar/deals (ichki CRM) → Hamkor/referal hisoblari.

Loyihaning to'liq bosqichma-bosqich yo'l xaritasi, dizayn spec'lari va implementatsiya
rejalari `docs/superpowers/specs/` va `docs/superpowers/plans/` papkalarida, shuningdek
`CLAUDE.md` faylida saqlanadi.

---

## 8. Loyihani ishga tushirish

```bash
npm install
npm run dev       # http://localhost:3000
```

Boshqa buyruqlar:

```bash
npm run build      # production build
npm run lint        # ESLint
npm run test         # Vitest (unit)
npm run test:e2e      # Playwright (E2E)
```

Muhit o'zgaruvchilari (`DATABASE_URL`, Clerk, Vercel Blob, AI Gateway va h.k.) uchun
Vercel loyihasiga ulangan `.env` fayllarini `vercel env pull` orqali torting.
