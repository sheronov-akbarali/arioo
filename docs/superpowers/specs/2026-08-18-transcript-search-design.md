# Barcha suhbatlar bo'yicha full-text transkript qidiruv

Sana: 2026-08-18
Holat: tasdiqlangan, implementatsiya rejasi kutilmoqda

## Muammo

CLAUDE.md'dagi 6-bosqich backlog ro'yxatida (bo'lim G — "Boshqa platforma
takomillashtirish g'oyalari") qolgan yagona amalga oshirilmagan g'oya: **"Barcha
suhbatlar bo'yicha full-text transkript qidiruv (support jamoasi uchun)"**. Ro'yxatdagi
qolgan barcha g'oyalar (sentiment tahlili, A/B testing, xabar shablonlari, multi-agent
handoff, white-label) allaqachon 7.4/8.2/8.3/8.4/9.4 bosqichlari sifatida amalga
oshirilgan.

Hozirgi holat: `/chats` sahifasida (`src/app/[locale]/(dashboard)/chats/page.tsx`)
qidiruv faqat client-side, allaqachon yuklangan thread ro'yxatini agent nomi + oxirgi
xabar preview'i bo'yicha filtrlaydi (`ChatsList` → `ListSearchInput`). Xabar **matnining
o'zi** bo'yicha, barcha suhbatlar bo'yicha, server-side qidiruv yo'q. Support jamoasi
uchun bu muhim bo'shliq: masalan "qaytarish siyosati" haqida qachon va qaysi mijozlar
so'ragan bo'lsa, buni topishning yo'li yo'q.

## Joriy texnik holat (tadqiqot bilan tasdiqlangan)

- `messages` jadvali (`src/db/schema/conversations.ts`): `content: text` — qidiriladigan
  asosiy maydon. Hech qanday index yo'q (na `content`'da, na `conversationId`/`agentId`/
  `startedAt`'da) — hozircha to'liq jadval skanerlash bilan ishlaydi.
- Postgres native full-text search (`tsvector`/`GIN`) hech qayerda ishlatilmagan.
- pgvector faqat bilim bazasi uchun (`knowledgeChunks.embedding`, HNSW index,
  `src/lib/ai/retrieval.ts`) — xabarlar uchun emas.
- Server-side pagination pattern loyihada umuman yo'q — barcha mavjud ro'yxatlar
  (`/chats`, `/knowledge-bases`) to'liq yuklab, client-side filtrlaydi.

## Qamrov qarorlari

- **Joylashuv:** alohida yangi sahifa, `/search` (sidebar'da "Qidiruv" havolasi, lupa
  ikonkasi) — mavjud ⌘K command palette'dan farqli, chunki bu chuqur filtr+pagination
  bilan to'liq natija sahifasi, tezkor navigatsiya emas.
- **Ruxsat qamrovi:** butun tashkilot bo'yicha — support jamoasi a'zosi o'z
  tashkilotidagi BARCHA AI xodimlarning suhbatlarini qidira oladi, agent/kanal
  filtrlari bilan toraytirish mumkin.
- **Qidiruv texnikasi:** Postgres native full-text search (`tsvector` + GIN index),
  semantik (embedding) emas — chunki so'z-asosli aniq moslik yetarli, qo'shimcha
  embedding generatsiya xarajati/murakkabligi shart emas.
- **Til konfiguratsiyasi:** 3 til (uz/ru/en) uchun alohida config kerak (yaxshiroq
  stemming), lekin xabar tilini avtomatik aniqlash (til-detektsiya) qo'shilmaydi —
  buning o'rniga har xabar uchun **3 xil tsvector combined** (`simple` + `russian` +
  `english`), qidiruvda barchasi OR bilan birlashtiriladi. Bu til aniqlash
  murakkabligisiz stemming foydasini beradi.

## Dizayn

### 1. Ma'lumotlar modeli (migratsiya)

`messages` jadvaliga:
- `searchVector` — generated `tsvector` ustuni (Postgres
  `GENERATED ALWAYS AS (...) STORED`), qiymati:
  ```sql
  to_tsvector('simple', content) || to_tsvector('russian', content) || to_tsvector('english', content)
  ```
  Drizzle generated column'ni to'g'ridan-to'g'ri qo'llab-quvvatlamagani uchun bu qo'lda
  yozilgan SQL migratsiya (`drizzle/XXXX_add_message_search_vector.sql`) orqali
  qo'shiladi; schema faylida ustun faqat o'qish uchun (`sql` raw type) e'lon qilinadi,
  ORM orqali yozilmaydi.
- Shu ustunga **GIN index**: `CREATE INDEX message_search_vector_idx ON message USING GIN (search_vector)`.
- Qo'shimcha B-tree indekslar: `message.conversationId`, `conversation.agentId`,
  `conversation.startedAt` — hozircha yo'q, filtrlash/saralash tezligi uchun zarur.

Sof qo'shimcha migratsiya — mavjud `content` ustuniga tegmaydi, orqaga qaytish
(index/ustunni drop qilish) oson.

### 2. Backend qidiruv qatlami

`src/lib/search/transcripts.ts`:

```ts
searchTranscripts({ orgId, query, agentId?, channel?, dateFrom?, dateTo?, page, pageSize }): Promise<{
  results: { messageId, conversationId, agentId, agentName, channel, snippet, createdAt, role }[];
  totalCount: number;
}>
```

- `orgId` har doim serverdan (Clerk session) olinadi, `agents` jadvaliga join qilib
  org-scoping majburiy — client'dan yuborilgan `agentId` boshqa tashkilotga tegishli
  bo'lsa natija bo'sh qaytadi (0-natija natijasi, xatolik emas — ma'lumot sizib
  chiqmasligi uchun).
- Query: `search_vector @@ (websearch_to_tsquery('simple', q) || websearch_to_tsquery('russian', q) || websearch_to_tsquery('english', q))`,
  natijalar `ts_rank(search_vector, tsquery)` bo'yicha kamayish tartibida saralanadi.
- Har natija uchun `ts_headline('simple', content, tsquery, 'StartSel=<mark>,StopSel=</mark>,MaxWords=25,MinWords=15')`
  orqali qidiruv so'zi atrofidagi qisqa parcha (snippet), mos so'zlar `<mark>`ga o'ralgan.
- **Offset-based pagination** (`page`/`pageSize=20`) — cursor-pagination pattern
  loyihada yo'q, offset hozirgi hajm uchun yetarli.
- Validatsiya: `query.trim().length < 2` bo'lsa server action darajasida rad etiladi,
  `{ error: "..." }` qaytadi (foydalanuvchiga "kamida 2 belgi kiriting").
- DB xatosi (kutilmagan holat — `websearch_to_tsquery` odatda avtomatik hal qiladi)
  try/catch bilan tutiladi, umumiy "Qidiruvda xatolik yuz berdi" xabari qaytadi.

Server action (`"use server"`) sifatida `/search` sahifasidan chaqiriladi.

### 3. UI / sahifa

Yangi sahifa: `src/app/[locale]/(dashboard)/search/page.tsx`, sidebar'ga "Qidiruv"
havolasi qo'shiladi.

- Yuqorida: matn input (submit-on-enter, debounce bilan server so'rov yuboradi) +
  filtrlar: Agent dropdown (org'dagi barcha AI xodimlar), Kanal dropdown
  (Telegram/WhatsApp/Widget), sana oralig'i (ixtiyoriy).
- Natijalar: har biri card — agent nomi + kanal badge + sana + `<mark>` bilan
  highlight qilingan snippet (`dangerouslySetInnerHTML` o'rniga xavfsiz parser — snippet
  server tomonidan generatsiya qilingani va faqat `<mark>`/`</mark>` teglarini
  o'z ichiga olishi kafolatlangani uchun oddiy split-and-render bilan render qilinadi,
  XSS oldini olish uchun `content`ning o'zi hech qachon raw HTML sifatida
  qo'yilmaydi).
- Bosilganda `/chats?conversationId=X&messageId=Y`ga o'tadi. `/chats` sahifasiga kichik
  qo'shimcha: URL param mavjud bo'lsa avtomatik shu conversation'ni tanlaydi va
  `messageId`ga scroll qiladi (`scrollIntoView`).
- Pastda: "Oldingi/Keyingi" pagination tugmalari + "N natija topildi" hisoblagich.
- Bo'sh natija holati: "Hech narsa topilmadi" + filtrlarni kengaytirish tavsiyasi.
- Bo'sh boshlang'ich holat (hali qidiruv kiritilmagan): qisqa tushuntirish matni +
  misol so'rovlar.

### 4. Xatoliklarni boshqarish va test

- Validatsiya va xavfsizlik yuqorida (bo'lim 2) yozilgan.
- **Test qamrovi:**
  - Vitest: `transcripts.ts` uchun unit test — org-scoping ishlashini (boshqa
    tashkilot `agentId`si bilan bo'sh natija qaytishini), snippet highlight to'g'ri
    qaytishini, pagination hisobini (`totalCount`, `page`/`pageSize` chegaralari)
    tekshiradi.
  - Playwright: `/search` sahifasida so'rov kiritish → natija chiqishi → natijaga
    bosib `/chats`ga o'tib to'g'ri xabar scroll qilinishini tekshiruvchi 1 e2e test.
  - Regressiya: mavjud `messages`/`conversations`ga bog'liq testlar (agar bo'lsa)
    to'liq vitest suite bilan qayta tekshiriladi.

## Nima qilinmaydi (ataylab)

- Semantik/embedding-asosli qidiruv — so'z-asosli FTS yetarli, xarajat/murakkablik
  qo'shilmaydi.
- Xabar tilini avtomatik aniqlash — combined 3-tsvector yondashuvi bilan bypass
  qilinadi.
- Cursor-based pagination, alohida denormalized qidiruv jadvali (Approach B) — hozirgi
  hajm uchun ortiqcha murakkablik, keyinchalik hajm o'sganda qayta ko'rib chiqiladi.
- SIP qo'ng'iroq transkriptlari alohida hech narsa qilinmaydi — ular ham `messages`
  jadvalida `content` sifatida saqlanadigan bo'lsa, avtomatik qidiruv qamroviga kiradi
  (alohida ishlov berish shart emas).
