# Phase F (2-qism) — Telegram kanal analitikasi

## Kontekst

CLAUDE.md Phase F — marketing kanal analitikasi — 5 mustaqil sub-loyihaga
bo'lindi (2026-08-14). 1-qism (sayt analitikasi, Vercel Web Analytics)
`/statistics/marketing` tab'iga qo'shildi va `main`'ga kirdi. Bu spec
2-qism — Telegram kanal analitikasi (a'zolar dinamikasi, post
reach/views, engagement rate) uchun.

**Muhim farq:** bu Phase 4'dagi "Telegram bot connector" (mijoz bilan
suhbat uchun, `INTEGRATION_PROVIDERS` ro'yxatida `telegram`/`chat`
kategoriyasida) bilan **bir xil emas**. U yerda bot mijozlarga javob
beradi. Bu yerda gap tashkilotning o'z marketing/e'lon kanali (masalan
`@arioo_uz`) statistikasi haqida — bular butunlay boshqa Telegram
funksiyalari.

### Nega Bot API yetarli emas

Telegram Bot API kanal a'zolar sonini (`getChatMemberCount`) beradi, lekin
**post reach/views va engagement** faqat quyidagilarda mavjud:
- Telegram ilovasining o'zida, kanal admin panelida ("View Statistics"), YOKI
- MTProto (Telegram Client API) orqali, kanalga admin bo'lgan **shaxsiy
  akkaunt** nomidan `stats.getBroadcastStats` chaqiruvi bilan.

Foydalanuvchi buni tasdiqladi: to'liq statistika uchun MTProto yo'lidan
boramiz.

### Xavf va cheklovlar (foydalanuvchiga ochiq ko'rsatiladi)

1. **ToS xavfi**: Telegram shaxsiy akkauntni rasmiy mijozdan tashqari
   avtomatlashtirishni cheklaydi. Bu ekotizimda keng tarqalgan amaliyot
   (ko'plab "kanal statistikasi" vositalari xuddi shunday ishlaydi), lekin
   xavf ulanadigan Telegram akkauntning o'ziga tegishli — Arioo'ning
   infratuzilmasiga emas. Ulash oqimida bu ochiq ogohlantiriladi.
   Muvofiqlik/huquqiy tekshiruv 6-bosqichda (roadmap) rejalashtirilgan;
   MVP uchun ogohlantirish + foydalanuvchi roziligi yetarli.
2. **Obunachilar chegarasi**: Telegram `getBroadcastStats`'ni faqat
   taxminan 500+ obunachili kanallar uchun beradi. Kichikroq kanallar
   uchun aniq xato qaytadi — bu "ulanmagan" emas, "hali statistika mavjud
   emas" holati sifatida ko'rsatiladi.
3. **Sessiya = parol darajasidagi maxfiy ma'lumot**: MTProto session
   string orqali to'liq akkaunt nazorati olinadi. Shifrlanmagan holda hech
   qachon saqlanmaydi yoki loglanmaydi.

## Doira (scope)

Ichida:
- Bitta tashkilot uchun bitta Telegram kanal ulash oqimi (telefon → kod →
  ixtiyoriy 2FA parol → sessiya saqlash).
- `/statistics/marketing` sahifasida "Sayt" kartasi yonida yangi
  "Telegram" kartasi: ulanmagan holatda "Ulash" tugmasi, ulangan holatda
  a'zolar dinamikasi grafigi + oxirgi postlar ro'yxati (views/forwards).
- Sessiyani uzish ("Uzish" tugmasi — akkauntni butunlay logout qiladi).

Tashqarida (keyingi sub-loyihalarga yoki keyingi bosqichlarga qoldiriladi):
- Bir nechta kanal/tashkilot uchun ko'p akkaunt qo'llab-quvvatlash.
- Post-darajasidagi to'liq tahlil (eng yaxshi vaqt, auditoriya demografiyasi)
  — Telegram bu ma'lumotni har doim ham bermaydi, keyinroq kengaytiriladi.
- YouTube/Instagram/OLX — alohida sub-loyihalar.

## Arxitektura

### Kutubxona

[`telegram`](https://www.npmjs.com/package/telegram) (gramjs) — Node.js
uchun eng ko'p ishlatiladigan MTProto client kutubxonasi. Server-only.

### Ma'lumotlar modeli

Yangi jadval, `src/db/schema/telegram-channel-connection.ts`:

```
telegramChannelConnection
  id: text PK (uuid)
  organizationId: text FK -> organization.id, unique (bitta tashkilot = bitta ulanish, MVP)
  channelUsername: text (masalan "arioo_uz", @ belgisisiz)
  channelTitle: text (nullable, birinchi sinxronizatsiyada to'ldiriladi)
  phoneMasked: text (masalan "+998 90 *** ** 12", faqat ko'rsatish uchun)
  sessionSecretEncrypted: text (AES-256-GCM bilan shifrlangan session string)
  status: pgEnum("telegram_connection_status", ["pending_code", "pending_password", "connected", "error"])
  lastSyncedAt: timestamp (nullable)
  lastError: text (nullable — masalan "kanal juda kichik, statistika yo'q")
  createdAt / updatedAt: timestamp
```

`status = pending_code` / `pending_password` — ulash oqimi tugallanmagan
oraliq holatlar (server action chaqiruvlari orasida saqlanadi, chunki
GramJS login jarayoni bir nechta bosqichli).

### Shifrlash

`src/lib/telegram/session-crypto.ts` — Node `crypto` (AES-256-GCM),
kalit `TELEGRAM_SESSION_ENCRYPTION_KEY` env o'zgaruvchisidan (32 bayt,
base64). Xuddi shu naqsh boshqa hech qayerda yo'q — bu birinchi shifrlangan
maxfiy ma'lumot bizning DB'da, shuning uchun yangi kichik modul sifatida
qo'shiladi (mavjud kod bazasida qayta ishlatiladigan narsa yo'q).

### Ulash oqimi (server actions, `statistics/marketing/telegram-actions.ts`)

1. `startTelegramConnection({ phone, channelUsername })` — kanal
   username'i telefon raqami bilan bir vaqtda, boshlang'ich formada
   so'raladi (auth kodidan oldin — shunda oxirgi qadamda qo'shimcha forma
   kerak bo'lmaydi). GramJS `client.start()`ni qo'lda bosqichma-bosqich
   chaqiradi (`sendCode`), natijani `pending_code` holatida DB'ga yozadi
   (server action'lar orasida in-memory holat saqlanmaydi — har bir so'rov
   yangi funksiya chaqiruvi).
2. `submitTelegramCode({ code })` — kodni tasdiqlaydi. Agar 2FA yoqilgan
   bo'lsa `pending_password`ga o'tadi, aks holda to'g'ridan-to'g'ri
   3-qadamga o'tadi.
3. `submitTelegramPassword({ password })` — faqat 2FA yoqilgan hisoblar
   uchun chaqiriladi; 2FA yo'q bo'lsa bu qadam butunlay o'tkazib
   yuboriladi.
4. Kod (yoki parol) tasdiqlangach, avtomatik ravishda 1-qadamda
   kiritilgan `channelUsername`ga nisbatan akkaunt admin ekanini
   tekshiradi (`channels.getParticipant`); muvaffaqiyatli bo'lsa
   `status = connected`, aks holda `status = error` va sessiya
   saqlanmaydi (darhol logout qilinadi).
5. `disconnectTelegramChannel()` — GramJS orqali logout, DB yozuvini
   o'chiradi.

Bu oqim worken.ru'dagi yoki boshqa hech qanday mavjud naqshga mos
kelmaydi (Arioo'da birinchi ko'p bosqichli tashqi auth oqimi) — shuning
uchun UI holat mashinasi sifatida sodda qilib qurilishi kerak: bitta
client component (`telegram-connect-dialog.tsx`) `status` maydoniga qarab
tegishli formani (telefon / kod / parol / kanal username) ko'rsatadi.

### Statistikani o'qish (`src/lib/telegram/channel-stats.ts`)

- `getChannelStats(connection)` — saqlangan sessiyani deshifrlaydi,
  vaqtinchalik `StringSession` bilan GramJS client yaratadi, quyidagilarni
  oladi:
  - `channels.getFullChannel` → joriy a'zolar soni
  - `stats.getBroadcastStats` → o'sish grafigi + so'nggi postlar ro'yxati
    (agar mavjud bo'lmasa, `lastError`ga yozadi, "hali mavjud emas" UI
    holatini qaytaradi)
- Natija kesh qilinmaydi DB'da (real-time so'rov, chunki Telegram
  tomonidan rate-limit past emas); sahifa yuklanishda to'g'ridan-to'g'ri
  chaqiriladi, xuddi `getSiteAnalytics` kabi.

## UI

`/statistics/marketing`dagi "Sayt" kartasidan keyin yangi "Telegram"
kartasi:
- Ulanmagan: qisqa tavsif + xavf haqida ogohlantirish matni + "Ulash"
  tugmasi → `TelegramConnectDialog` ochiladi.
- Ulanish jarayonida: dialog ichida bosqichma-bosqich forma (telefon +
  kanal username → kod → parol, agar 2FA yoqilgan bo'lsa).
- Ulangan: a'zolar soni + o'zgarish, so'nggi 5 ta post (views/forwards),
  "Uzish" tugmasi.
- Kanal juda kichik (statistika yo'q): "Kanalingiz hali Telegram
  statistikasiga ega emas (odatda 500+ obunachi kerak)" xabari.

## Xatoliklarni boshqarish

- Noto'g'ri kod/parol → forma ichida xatolik, qayta urinish imkoniyati.
- Akkaunt kanalga admin emas → aniq xabar, ulash bekor qilinadi
  (sessiya saqlanmaydi).
- Telegram tomonidan flood-wait (rate limit) → "biroz kuting" xabari,
  texnik tafsilotlar loglanadi lekin foydalanuvchiga ko'rsatilmaydi.

## Test

- `session-crypto.test.ts` — shifrlash/deshifrlash round-trip, noto'g'ri
  kalit bilan xato.
- Server action'lar uchun GramJS'ni mock qilib holat o'tishlarini
  (pending_code → pending_password → connected) tekshiruvchi unit testlar.
- E2E: ulanmagan holatning UI'da to'g'ri ko'rinishini tekshiruvchi mavjud
  `assistants.spec.ts` naqshiga o'xshash yengil smoke test (haqiqiy
  Telegram akkaunti bilan to'liq oqimni avtomatlashtirish mumkin emas).

## Ochiq savol

Session encryption key rotatsiyasi (agar `TELEGRAM_SESSION_ENCRYPTION_KEY`
kelajakda almashtirilsa, mavjud ulanishlar buziladi) — MVP doirasidan
tashqarida, foydalanuvchi shunchaqa qayta ulanadi. Kelajakda kerak bo'lsa,
alohida migratsiya vositasi sifatida qo'shiladi.
