# worken.ru Parity — Phase C, Group 4: Integrations & Analytics Pages — Design

Sahifalar: `/integrations`, `/statistics`.

## Kontekst

Worken.ru'ning haqiqiy paneli 2026-08-13'da qayta ko'rib chiqildi: `/integrations`
va `/stats`. Ikkalasi ham Arioo'dagi mos sahifalardan sezilarli darajada boy —
lekin ko'p qismi (haqiqiy ulanish holati kuzatuvi, CLI orqali local tool
nashr qilish) yangi backend infratuzilma yoki butunlay yangi mahsulot
xususiyati (MCP tool publishing) talab qiladi va Phase C doirasidan
tashqarida. Bu spec faqat mavjud ma'lumot modeli doirasidagi vizual/filtr
yaxshilanishlariga qaratilgan.

## Sahifa-ma-sahifa o'zgarishlar

### 1. `/integrations`

- Sarlavha oldiga rangli kvadrat ichida ikonka qo'shiladi (`Puzzle` yoki
  mavjud sidebar ikonkasiga mos — `LayoutGrid`).
- Kategoriya-filtr tugmalari qo'shiladi: Hammasi + `INTEGRATION_PROVIDERS`
  massividagi har bir provayderning `categories` maydonidan olingan noyob
  kategoriyalar (bu ma'lumot allaqachon mavjud, yangi backend kerak emas).
- Provayder nomi bo'yicha qidiruv qo'shiladi — statik massiv ustida
  client-side filtr (`ListSearchInput`, Phase C group 1'da yaratilgan
  umumiy komponent qayta ishlatiladi).
- Worken'ning 5 ta ulanish-holati stat-kartasi (Active/Need attention/
  Verifying/In setup/Archived), "Your integrations"/"Discover more"
  bo'linishi va "Local tools (CLI)" bo'limi **qo'shilmaydi** — bularning
  barchasi haqiqiy per-tashkilot ulanish yozuvlarini talab qiladi
  (Arioo'da bunday jadval hali mavjud emas), fabrikatsiya qilingan "0"
  holatlar CLAUDE.md'ning "soxta muvaffaqiyat holatini ko'rsatmaslik"
  qoidasiga zid bo'lardi — bu Phase 4/5'ga tegishli haqiqiy integratsiya
  ishi.

### 2. `/statistics`

Arioo'ning statistika sahifasi allaqachon worken'ga juda yaqin (3 ta stat
karta, kunlik xarajat grafigi, davr taqqoslash, prognoz, CSV eksport —
bularning barchasi mavjud va ishlaydi). Qo'shiladigan yagona yangi bo'lim:

- **"Model bo'yicha xarajat"** kartasi — worken'ning "Spend by model" pie
  chart'iga mos, lekin soddaroq (mavjud dashboard uslubiga mos ravishda
  foiz-progress-bar ro'yxati, yangi diagramma turi kiritmasdan). Ma'lumot
  allaqachon mavjud: har bir xabar `conversations→aiAgents` orqali
  agentning `model` maydoniga bog'langan, xarajat esa
  `messages.estimatedCostUsd`da — yangi ustun yoki jadval kerak emas,
  faqat qo'shimcha agregatsiya so'rovi.
- Sarlavha oldiga rangli kvadrat ichida `BarChart3` ikonkasi qo'shiladi
  (mavjud sidebar ikonkasiga mos).
- Worken'ning "Spend by assistant" alohida diagrammasi, "Average message
  cost" kartasi, "Top chats by spend" jadvali va sana-oralig'i
  kalendar-picker'i **qo'shilmaydi** — bular Arioo'da allaqachon mavjud
  funksiyalarni (davr tugmalari, /runs sahifasidagi suhbat-xarajat
  jadvali) qisman takrorlaydi va bu bosqichning hajmini keraksiz
  kengaytiradi; keyingi qo'shimcha jilo tsiklida ko'rib chiqiladi.

## Umumiy komponentlar

`/integrations`'dagi qidiruv `ListSearchInput` (Phase C group 1) ni qayta
ishlatadi. Kategoriya-filtr tugmalari uchun yangi komponent yaratilmaydi —
bu sahifada ma'lumot statik (DB so'rovsiz) bo'lgani uchun filtrlash
client-side state bilan amalga oshiriladi (URL query emas), shuning uchun
bitta kichik client component (`IntegrationsGrid`) qidiruv+kategoriya
state'ini birgalikda boshqaradi.

## Testing

- `messages/messages.test.ts` orqali yangi tarjima kalitlari uch tilda
  tekshiriladi.
- Qo'lda tekshirish: dev server'da 2 sahifani bo'sh va to'ldirilgan holatda
  ko'rib chiqish — avtorizatsiya talab qilingani sababli foydalanuvchi
  o'zi tasdiqlashi mumkin, avvalgi guruhlardagi kabi.

## Out of scope

- `/integrations`'dagi haqiqiy ulanish-holati kuzatuvi (Active/Need
  attention/Verifying/In setup/Archived) — yangi DB jadval.
- "Your integrations" / "Discover more" bo'linishi.
- "Local tools (CLI)" / MCP tool nashr qilish bo'limi.
- `/statistics`dagi "Spend by assistant" diagrammasi, "Average message
  cost" kartasi, "Top chats by spend" jadvali, kalendar-picker.
