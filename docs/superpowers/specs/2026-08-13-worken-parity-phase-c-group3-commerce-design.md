# worken.ru Parity — Phase C, Group 3: Commerce Pages — Design

Sahifalar: `/products`, `/billing`.

## Kontekst

Worken.ru'ning haqiqiy paneli 2026-08-13'da qayta ko'rib chiqildi: `/products`
("Продукты") va `/billing`. Ikkalasi ham Arioo'dagi mos sahifalardan sezilarli
darajada boy — lekin ko'p qismi (kanal ulanishlari, real to'lov integratsiyasi,
saqlash o'lchovi) yangi backend infratuzilma talab qiladi va Phase C doirasidan
tashqarida. Bu spec faqat mavjud ma'lumot modeli doirasidagi vizual/filtr
yaxshilanishlariga qaratilgan — Phase C, Group 2 ("Avtomatlashtirish")da
o'rnatilgan naqshlar (status-count badge, GET-form qidiruv, shared `Input`
komponenti) qayta ishlatiladi.

## Sahifa-ma-sahifa o'zgarishlar

### 1. `/products` (worken: "Продукты")

- Sarlavha oldiga rangli kvadrat ichida `Package` ikonkasi qo'shiladi
  (allaqachon import qilingan).
- Status-filtr tugmalari qo'shiladi: Hammasi/Qoralama/Faol/Arxivlangan, har
  birida son-badge — `productStatus` enum (`draft`/`active`/`archived`)
  worken'ning uchta statusiga aniq mos keladi. `/approvals`'dagi
  `statusCounts` grouped-query naqshi qayta ishlatiladi (tashkilot bo'yicha,
  faol filtrlardan mustaqil).
- Tur-filtr tugmalari qo'shiladi: Hammasi + `productType`'ning barcha 6 ta
  qiymati (`item`/`digital`/`service`/`affiliate_offer`/`referral_offer`/
  `lead_magnet`). Worken'da qo'shimcha 7-tur ("Медиа") bor — Arioo'ning
  ma'lumot modelida yo'q, yangi enum qiymati (schema o'zgarishi) talab
  qiladi, shuning uchun **qo'shilmaydi**.
- Nomi bo'yicha qidiruv qo'shiladi — `/approvals`'dagi GET-form pattern
  (shared `Input` komponenti bilan, group 2'da tuzatilgan darsni hisobga
  olib — boshidanoq raw `<input>` emas, `Input` ishlatiladi).
- Jadval ustunlari **o'zgarmaydi** (Nomi/Turi/Holat/Narx) — worken'ning
  qo'shimcha ustunlari (Каналы/Операции/Диалоги/Обновлён) mahsulotni
  kanal/lid/suhbat bilan bog'lash uchun yangi backend jadval/bog'lanish
  talab qiladi, Phase C doirasidan tashqarida.
- Worken'ning elaborate 4-stsenariyli bo'sh holati (kartalar: "Sell a
  product", "Qualify a lead" va h.k., Avito/Robokassa/Telegram Stars kabi
  hali mavjud bo'lmagan integratsiyalarga ishora qiladi) **qo'shilmaydi** —
  bu Arioo'da mavjud bo'lmagan xususiyatlarga oid marketing-uslubidagi
  kontent, mavjud oddiy icon-empty-state saqlanadi.
- Mavjud inline yaratish formasi (nom/tur/narx) o'zgarmaydi.

### 2. `/billing`

- Sarlavha oldiga rangli kvadrat ichida `CreditCard` ikonkasi qo'shiladi.
- Mavjud bitta "To'lovlar tarixi" jadvali **ikkiga bo'linadi**: "To'lovlar
  tarixi" (kredit qo'shilgan operatsiyalar, `tx.amount >= 0`) va "Xarajatlar
  tarixi" (sarflangan operatsiyalar, `tx.amount < 0`) — worken'ning
  "Payment history"/"Expense history" bo'linishiga mos. Bu **faqat
  ko'rsatish qatlamidagi** o'zgarish: bitta mavjud `transactions` so'rovi
  ikkita jadvalga belgi (`amount` ishorasi) bo'yicha bo'linadi, yangi so'rov
  yoki jadval qo'shilmaydi.
- Worken'ning Xarajatlar jadvalidagi qo'shimcha Chat/Model ustunlari
  **qo'shilmaydi** — bu ma'lumot `creditTransactions` jadvalida saqlanmaydi
  (xarajat-suhbat bog'lanishi faqat `messages.estimatedCostUsd`da bor, u
  yerdan bu yerga ko'chirish yangi backend bog'lanish talab qiladi).
- Balans/Bonus/Saqlash 3 ta karta grid'i **o'zgarmaydi** — worken bu
  uchtasini reja kartasi bilan bitta katta blokka birlashtiradi, lekin bu
  Arioo'ning boshqa sahifalarida (masalan statistika) ishlatiladigan
  izchil ko'p-karta grid uslubidan chetga chiqish bo'lardi — faqat vizual
  jilo doirasida bunday katta joylashuv o'zgarishi amalga oshirilmaydi.
- Saqlash kartasidagi "Hali kuzatilmayapti" halolligi saqlanadi (worken'da
  haqiqiy baytlar ko'rsatiladi, lekin Arioo hali saqlashni kuzatmaydi).

## Umumiy komponentlar

Yangi umumiy komponent yaratilmaydi — `/products`'dagi status/tur-filtr
tugmalari va qidiruv formasi `/approvals`'da (Group 2) allaqachon
o'rnatilgan `Button`+`Link` pill-pattern va GET-form+`Input` naqshini
to'g'ridan-to'g'ri qayta ishlatadi.

## Testing

- `messages/messages.test.ts` orqali yangi tarjima kalitlari (filtr
  yorliqlari, "Xarajatlar tarixi" sarlavhasi) uch tilda tekshiriladi.
- Qo'lda tekshirish: dev server'da 2 sahifani bo'sh va to'ldirilgan holatda
  ko'rib chiqish — avtorizatsiya talab qilingani sababli foydalanuvchi
  o'zi tasdiqlashi mumkin, avvalgi guruhlardagi kabi.

## Out of scope

- `/products` jadvaliga Каналы/Операции/Диалоги/Обновлён ustunlarini
  qo'shish — yangi backend bog'lanish.
- Worken'ning "Медиа" mahsulot turi — yangi enum qiymati.
- Worken'ning 4-stsenariyli marketing-uslubidagi bo'sh holati.
- `/billing`'ning Chat/Model xarajat ustunlari.
- Reja+balans+bonus kartalarini bitta blokka birlashtirish (katta
  joylashuv o'zgarishi).
