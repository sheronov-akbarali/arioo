# worken.ru Parity — Phase C, Group 5: Partnership Pages — Design

Sahifalar: `/affiliate-program`, `/referral-program`.

## Kontekst

Worken.ru'ning haqiqiy paneli 2026-08-13'da qayta ko'rib chiqildi: `/affiliate-program`
("Partner program") va `/referral-program`. Ikkalasi ham faol hamkor/referral
hisobi uchun to'liq boshqaruv panelini ko'rsatadi (mablag', komissiya,
mijozlar ro'yxati, davr bo'yicha filtrlangan operatsiyalar).

**`/affiliate-program`**: worken'ning ko'rinishi (Funds on account + Top up,
Partner discount, Commission rate, Paying clients, Payment history jadvali,
Clients/Notifications/Description tab'lari) **faol hamkor hisobi**ni
taqdim etadi. Arioo'da hamkor-hisob backend'i (balans, mijozlar, to'lov
tarixi) umuman mavjud emas — Arioo'ning joriy sahifasi ataylab boshqacha
holatni ko'rsatadi: "hali hamkor emassiz" + ariza qoldirish CTA'si + tarif
darajalari jadvali (marketing `/partners` sahifasidan qayta ishlatilgan
`levels` ma'lumoti). Bu ikkalasi turli holatlar (faol hamkor vs. hali ariza
bermagan) uchun mo'ljallangan, shuning uchun to'g'ridan-to'g'ri solishtirish
noto'g'ri bo'lardi. Worken'ning faol-hamkor ko'rinishini takrorlash yangi
backend (hamkor-hisob, mijozlar ro'yxati, to'lov tarixi) talab qiladi —
Phase C doirasidan tashqarida. Bu sahifada faqat sarlavha ikonkasi
qo'shiladi.

**`/referral-program`**: Arioo'ning joriy sahifasi worken'ga juda yaqin —
balans/stavka/taklif qilinganlar/ishlangan kartalari, referral havolalar,
kunlik/oylik limit progress-bar'lari va operatsiyalar ro'yxati allaqachon
mavjud va ishlaydi. Farqlar:
- Worken'da har bir havola ustida yorliq bor ("Home page"/"Sign-up page")
  — Arioo'da yo'q, lekin ma'lumot allaqachon mavjud (ikkala havola ham
  hisoblanadi, faqat matn yorliq qo'shiladi).
- Worken'da operatsiyalar ro'yxati davr bo'yicha filtrlanadi (All time/
  Today/Yesterday/Week/Month/Select dates) — Arioo'da yo'q. Bu yangi
  so'rov filtri, lekin mavjud `/statistics`'dagi davr-tugma patterniga
  o'xshash tarzda amalga oshirilishi mumkin (yangi ma'lumot modeli emas,
  faqat `createdAt` bo'yicha filtr).
- Worken'da "Referral list" (taklif qilingan foydalanuvchilar ro'yxati)
  alohida tab — Arioo'ning `referralOperations` jadvali qaysi tashkilot
  taklif qilinganini saqlamaydi (faqat `description`/`amount`), shuning
  uchun bu ro'yxatni ko'rsatib bo'lmaydi — yangi ustun/bog'lanish talab
  qiladi, **qo'shilmaydi**.

## Sahifa-ma-sahifa o'zgarishlar

### 1. `/affiliate-program`

- Sarlavha oldiga rangli kvadrat ichida `Handshake` ikonkasi qo'shiladi
  (allaqachon import qilingan, hozir faqat CTA kartasi ichida ishlatiladi).
- Boshqa hech narsa o'zgarmaydi — tarif darajalari jadvali va "ariza
  qoldirish" CTA'si saqlanadi.

### 2. `/referral-program`

- Sarlavha oldiga rangli kvadrat ichida `Link2` (yoki `Share2`) ikonkasi
  qo'shiladi.
- Ikkala referral havola ustiga qisqa matn-yorliq qo'shiladi: "Bosh sahifa"
  / "Ro'yxatdan o'tish sahifasi" (worken'ning "Home page"/"Sign-up page"ga
  mos).
- Operatsiyalar ro'yxati ustiga davr-filtr tugmalari qo'shiladi: Barchasi/
  Bugun/Bu hafta/Bu oy — `/statistics`'dagi mavjud davr-tugma patternига
  o'xshash (URL query-parametr, server-side `createdAt` filtri). Worken'ning
  "Yesterday" va kalendar-picker ("Select dates") qo'shilmaydi — bular
  qo'shimcha murakkablik va Arioo'ning boshqa joylarida ishlatilmagan
  interaktsiya turi (kalendar-picker).
- Worken'ning "Referral list" tab'i **qo'shilmaydi** — `referralOperations`
  jadvalida taklif qilingan tashkilotga bog'lanish ustuni yo'q.

## Testing

- `messages/messages.test.ts` orqali yangi tarjima kalitlari uch tilda
  tekshiriladi.
- Qo'lda tekshirish: dev server'da 2 sahifani bo'sh va to'ldirilgan holatda
  ko'rib chiqish — avtorizatsiya talab qilingani sababli foydalanuvchi
  o'zi tasdiqlashi mumkin, avvalgi guruhlardagi kabi.

## Out of scope

- `/affiliate-program`ning faol-hamkor ko'rinishi (Funds/Top up, Commission
  rate, Paying clients, Payment history, Clients/Notifications tab'lari) —
  yangi hamkor-hisob backend'i.
- `/referral-program`'dagi "Referral list" tab'i — yangi bog'lanish ustuni.
- Kalendar-uslubidagi sana-oralig'i tanlagichi ("Select dates").
