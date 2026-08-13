# worken.ru Parity — Phase C, Group 1: Agent Flow Pages — Design

Sahifalar: `/assistants`, `/chats`, `/calls`, `/knowledge-bases`.

## Kontekst

Worken.ru'ning haqiqiy (autentifikatsiyalangan) paneli 2026-08-13'da Chrome orqali qayta
ko'rib chiqildi: `/bots` (Assistants), `/threads` (Chats), `/realtime` (Calls),
`/vs` (Knowledge bases). Arioo'dagi mos sahifalar allaqachon haqiqiy DB ma'lumoti bilan
ishlaydi (fake emas) va struktura jihatidan yaqin — bu bosqich faqat **vizual taksonomiya
parity**: ikonkalar, status-belgilar, stat-karta ikonkalari, filter/qidiruv maydonlari.
Yangi backend funksiya yoki jadval qo'shilmaydi. Uchinchi-tomon infratuzilma talab
qiladigan harakatlar (qo'ng'iroq boshlash, real-time contact-list boshqaruvi)
disabled/mavjud bo'lmagan holicha qoladi — `/calls` sahifasidagi mavjud pattern davom
ettiriladi.

## Sahifa-ma-sahifa o'zgarishlar

### 1. `/assistants` (worken: `/bots`, "My assistants")

- Karta dizayni: agent nomining bosh harfidan iborat rangli avatar-belgi (worken'dagi
  "W." belgisiga o'xshash, brand rangida) qo'shiladi.
- Status ko'rsatkichi: `aiAgents.status` (`draft`/`active`) asosida kichik rangli nuqta
  — `active` yashil, `draft` kulrang — karta yuqori o'ng burchagida.
- Agentning qisqartirilgan ID'si (masalan `a1b2...c3d4`) + nusxalash tugmasi (client
  component, `navigator.clipboard`) karta pastida ko'rsatiladi.
- Ro'yxat ustida nom bo'yicha client-side qidiruv maydoni qo'shiladi (allaqachon
  server'dan yuklangan `agents` massivi ustida, qo'shimcha so'rovsiz).
- Sarlavha "AI Xodimlar" o'zgarmaydi (worken'ning "My assistants"i shunchaki inglizcha
  ekvivalenti — mahalliylashtirilgan nom saqlanadi).

### 2. `/chats` (worken: `/threads`, "Chats")

- Ro'yxat panели ustiga agent nomi / oxirgi xabar matni bo'yicha client-side qidiruv
  maydoni qo'shiladi.
- Worken'dagi "All lists" (Whitelist/Ignore) filtri **qo'shilmaydi** — bu Arioo'da mavjud
  bo'lmagan kontakt-ro'yxat boshqaruvi konsepsiyasini talab qiladi, yangi backend
  funksiya bo'lib qoladi.
- "New thread" tugmasi **qo'shilmaydi** — yangi suhbat boshlash haqiqiy funksiya, faqat
  playground orqali mavjud bo'lib qoladi (mavjud "Playgroundda davom ettirish" havolasi
  saqlanadi).
- Qolgan struktura (ro'yxat + xabar paneli, bo'sh holat) o'zgarmaydi.

### 3. `/calls` (worken: `/realtime`, "Calls")

- Sarlavha oldiga rangli kvadrat ichida `Phone` ikonkasi qo'shiladi (worken uslubida).
- Ikkita harakat tugmasi farqlanadi: "Qo'ng'iroq boshlash" — outline + `Phone` ikonkasi,
  "Qo'ng'iroqni rejalashtirish" — brand-rangli filled + `Calendar` ikonkasi. Ikkalasi ham
  `disabled` va "Tez orada" belgisi bilan qoladi — faqat vizual farqlanish, funksiya
  o'zgarmaydi.
- Uch stat-kartaning har biriga rangli ikonka-doira qo'shiladi: Live — ko'k `Radio`,
  Completed today — yashil `PhoneCall`, Failed — qizil `PhoneOff`.
- Tab tugmalariga ikonka qo'shiladi: Navbat — `Phone`, Kampaniyalar — `Megaphone`,
  Tarix — `History`.

### 4. `/knowledge-bases` (worken: `/vs`, "Knowledge bases")

- Arioo'da bilim bazasi **agent-kesimida** (har bir AI xodimning o'z hujjatlari),
  worken'da esa mustaqil/qayta ishlatiluvchi vector store'lar — bu ataylab qilingan
  farq (kod izohida allaqachon hujjatlashtirilgan) va **saqlanadi**. "Create base"
  tugmasi qo'shilmaydi (Arioo'da hujjat yuklash faqat agent sahifasida bo'ladi).
- Fayl nomi bo'yicha client-side qidiruv maydoni qo'shiladi.
- Har bir hujjat qatoridagi status matni (`tStatus`) rangli badge komponentiga
  aylantiriladi (masalan: tayyor — yashil, qayta ishlanmoqda — sariq, xato — qizil) —
  worken'ning status-indikatsiya uslubiga moslashtiriladi.
- Agent-karta sarlavhasiga kichik `BookOpen` ikonkasi qo'shiladi.

## Umumiy komponentlar

Qidiruv maydonlari uchun bitta qayta ishlatiluvchi client component yaratiladi:
`src/components/dashboard/list-search-input.tsx` — matn kiritilganda `onChange` orqali
ota komponentga filtr so'zini uzatadi (server component ichida `use client` bolalar
orqali filtrlanadi). Bu 3 sahifada (`/assistants`, `/chats`, `/knowledge-bases`) qayta
ishlatiladi.

Status-badge uchun mavjud shadcn `Badge` komponenti ishlatiladi (loyihada allaqachon bor
bo'lsa) yoki minimal wrapper yaratiladi.

## Testing

- Mavjud Vitest testlar (agar `/calls`, `/chats` uchun snapshot/render testlari bo'lsa)
  yangilanadi.
- `messages/messages.test.ts` orqali 3 tilning kalit parity'si tekshiriladi — yangi
  tarjima kalitlari (qidiruv placeholder, badge status matnlari) barcha uzb/rus/en
  fayllariga qo'shiladi.
- Qo'lda tekshirish: dev server'da har 4 sahifani bo'sh va to'ldirilgan holatda ko'rib
  chiqish (light/dark tema).

## Out of scope

- Haqiqiy qo'ng'iroq/SIP integratsiyasi (Phase E).
- `/assistants/:id` to'liq tahrirlash sahifasi (Phase D).
- Kontakt-ro'yxat (Whitelist/Ignore) boshqaruvi, yangi suhbat yaratish UI'si.
- Vector-store'ni agentlar orasida qayta ishlatish (data-model o'zgarishi, bu spec
  doirasidan tashqarida).
