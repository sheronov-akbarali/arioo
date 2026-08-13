# worken.ru Parity — Phase C, Group 2: Automation Pages — Design

Sahifalar: `/routines`, `/approvals`, `/runs`.

## Kontekst

Worken.ru'ning haqiqiy paneli 2026-08-13'da qayta ko'rib chiqildi: `/routines`
("Рутины"), `/approvals` ("На проверку"), `/workflows` ("Запуски"). Arioo'dagi
`/routines` va `/approvals` allaqachon DB bilan real ishlaydi va struktura
jihatidan yaqin. `/runs` esa **kontseptual jihatdan boshqacha**: worken'ning
`/workflows` sahifasi bot-ijro logini (har bir ishga tushirish: rejim, holat,
bot, thread, xato) ko'rsatadi, Arioo'ning `/runs` sahifasi esa suhbat-darajasidagi
xarajat/faollik xulosasini (agent, boshlangan vaqt, xabarlar soni, xarajat)
ko'rsatadi. Bu farqni to'liq yopish (Mode/Status/Error ustunlari) yangi
kuzatuv infratuzilmasi (har bir workflow ijrosini alohida yozib borish)
talab qiladi — bu Phase C doirasidan tashqarida (backend funksiya, C-bosqich
esa faqat vizual jilo). Shuning uchun `/runs` uchun faqat mavjud ma'lumot
modeli doirasidagi vizual/filtr yaxshilanishlari qilinadi.

## Sahifa-ma-sahifa o'zgarishlar

### 1. `/routines` (worken: "Рутины")

- Sarlavha oldiga rangli kvadrat ichida `Repeat2` ikonkasi qo'shiladi.
- Jadvalga yangi ustun: "So'nggi ishga tushish" (worken'ning "Сработала"
  ustuniga mos). Avtomatlashtirish dvigateli hali ishlamagani uchun
  (`engineNotice` matni tasdiqlaydi) bu ustun har doim `—` ko'rsatadi —
  `/calls`'dagi "0" statistikalar bilan bir xil "hali ishlamaydi" konvensiyasi.
- Jadval ustida topilgan rutinalar soni matn sifatida ko'rsatiladi (masalan
  "3 ta rutina topildi"), worken'ning "Найдено N рутин" satriga mos.
- Mavjud icon-based bo'sh holat (dashed border + icon) o'zgarmaydi — bu
  Arioo dashboard'ining barcha sahifalarida ishlatiladigan izchil dizayn
  tili, worken'ning oddiy matn-bo'sh-holatidan ustun.
- Mavjud inline yaratish formasi (nom/trigger/resurs) **o'zgarmaydi** —
  worken'da bu alohida "Создать рутину" tugma orqali ochiladigan oqim, lekin
  Arioo'ning inline forma yondashuvi allaqachon ishlaydigan funksiya va uni
  qayta qurish Phase C doirasidan tashqarida (funksional o'zgarish, vizual
  jilo emas).

### 2. `/approvals` (worken: "На проверку")

- Sarlavha oldiga rangli kvadrat ichida `CheckCircle2` ikonkasi qo'shiladi.
- Har bir status-filtr tugmasiga (`pending`/`approved`/`rejected`/
  `auto_resolved`/`expired`) son-badge qo'shiladi — worken'dagi "Ожидают 8"
  uslubida. Sonlar bitta qo'shimcha `GROUP BY status` so'rovi orqali
  hisoblanadi (mavjud filtrlangan ro'yxatdan mustaqil, chunki barcha
  status bo'yicha sonlar bir vaqtda ko'rinishi kerak).
- `type` maydoni bo'yicha client-side qidiruv maydoni qo'shiladi (allaqachon
  yuklangan `rows` massivi ustida, `ListSearchInput` komponenti qayta
  ishlatiladi).
- Worken'ning 3-turdagi manba filtri (Все/Рутины/Чаты и голос/**Вопросы
  агентов**) Arioo'da 2 turga ega (`routines`/`chats`) — "agent savollari"
  alohida kategoriya sifatida Arioo ma'lumot modelida mavjud emas (bu
  `knowledge-bases`'dagi kabi hujjatlashtirilgan, ataylab qilingan farq).
  Bu 3-turni qo'shish yangi taksonomiya/backend belgilash talab qiladi —
  qo'shilmaydi.

### 3. `/runs` (worken: "Запуски" / `/workflows`)

- Sarlavha oldiga rangli kvadrat ichida `Activity` ikonkasi qo'shiladi.
- Mavjud ustunlar (Agent, Boshlangan, Oxirgi faollik, Xabarlar, Xarajat)
  **saqlanadi** — bular Arioo'da real ishlaydigan, foydali metrikalar va
  worken'da yo'q, lekin ularni olib tashlash foydali funksiyani yo'qotadi.
- Agent bo'yicha filter-pill qatori qo'shiladi (`/approvals`'dagi
  source-filter patterniga o'xshash: "Hammasi" + har bir agent nomi tugma
  sifatida, URL query-parametr orqali), worken'ning "Все боты" filtr
  o'lchamiga mos.
- Mode/Status/Error ustunlari va thread_id bo'yicha matn-filtri
  **qo'shilmaydi** — bular yangi ijro-kuzatuv ma'lumot modelini talab
  qiladi, Phase C doirasidan tashqarida (keyingi bosqichlarda ko'rib
  chiqiladi).

## Umumiy komponentlar

`/approvals` va `/runs`dagi filter-pill qatorlari uchun mavjud pattern
(`/approvals`'da allaqachon `href()` helper va `Button` + `Link` orqali
amalga oshirilgan) qayta ishlatiladi — yangi umumiy komponent yaratishga
hojat yo'q, chunki naqsh allaqachon bitta joyda to'g'ri ishlaydi va faqat
ikkinchi joyda takrorlanadi (ikki marta takrorlanish YAGNI nuqtai nazaridan
hali abstraksiyaga arzimaydi).

## Testing

- `messages/messages.test.ts` orqali yangi tarjima kalitlari (ustun sarlavhasi,
  qidiruv placeholder'i, badge son formatlari) uch tilda tekshiriladi.
- Qo'lda tekshirish: dev server'da 3 sahifani bo'sh va to'ldirilgan holatda
  ko'rib chiqish (light/dark tema) — avtorizatsiya talab qilingani sababli
  buni foydalanuvchi o'zi tasdiqlashi mumkin, C-1 guruhidagi kabi.

## Out of scope

- `/runs`ni worken'ning bot-ijro logi modeliga to'liq aylantirish (Mode/
  Status/Error kuzatuvi) — yangi backend infratuzilma, Phase E'ga yaqinroq.
- Worken'ning 3-turdagi approval manba filtri ("Вопросы агентов").
- Rutina yaratish oqimini worken'ning modal/alohida-sahifa uslubiga
  o'zgartirish — mavjud inline forma funksional, faqat vizual emas.
