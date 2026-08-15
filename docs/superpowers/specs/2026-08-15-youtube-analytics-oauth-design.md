# YouTube Analytics — haqiqiy OAuth integratsiya

Sana: 2026-08-15
Holat: tasdiqlangan, implementatsiya rejasi kutilmoqda

## Muammo

`/statistics/marketing` sahifasidagi "Marketing kanallari" bo'limida YouTube
Analytics kartasi to'liq hardcoded (`12,450` obunachi, `1.2M` ko'rish, `45K
soat` watch time) va `MockConnectButton` — bosilganda 1.5 soniyadan keyin
haqiqiy ulanishsiz "Ulangan" holatini ko'rsatadi. Bu foydalanuvchiga yolg'on
muvaffaqiyat holatini ko'rsatadi.

Bu spec — Statistika bo'limini to'liq real qilish ishining 1-sub-loyihasi
(3 tadan: YouTube, Instagram/Facebook, OLX.uz — har biri alohida spec/plan
tsiklidan o'tadi).

## Maqsad

YouTube kartasini haqiqiy Google OAuth ulanishi va haqiqiy YouTube Data API
v3 ma'lumotlari bilan almashtirish, `TelegramConnectForm`/`telegram_channel_
connection` naqshiga mos ravishda: bitta tashkilot uchun bitta ulanish,
shifrlangan credential'lar, ulash/uzish, xato holatlarini honest ko'rsatish.

## Qamrov ichida

- Umumiy OAuth token shifrlash moduli (`INTEGRATION_TOKEN_ENCRYPTION_KEY`),
  keyingi Instagram bosqichi ham shundan foydalanadi
- `youtube_channel_connection` DB jadvali (bitta tashkilot = bitta ulanish)
- `GET /api/oauth/youtube/start` va `GET /api/oauth/youtube/callback` route
  handler'lari (HMAC-imzolangan `state`, CSRF himoyasi)
- Token yangilash (`refresh_token` orqali, muddati tuganda avtomatik)
- YouTube Data API v3 orqali: `subscriberCount`, `viewCount` (lifetime),
  `videoCount`, so'nggi 5 ta video sarlavhasi + ko'rishlar soni
- `/statistics/marketing` sahifasida real karta: ulanmagan → "Google orqali
  ulash" tugmasi; ulangan → statistika + "Uzish" tugmasi; xato → honest xabar
- `.env.example`ga yangi o'zgaruvchilar + Google Cloud Console sozlash
  ko'rsatmasi (README yoki spec ichida)

## Qamrov tashqarisida (keyingi bosqichlarga)

- **Watch time (soat)** — YouTube Analytics API (`youtubeAnalytics.reports.
  query`) talab qiladi, alohida sensitive scope va Google app tekshiruvi
  murakkabligi bor. Hozircha faqat Data API'dagi ma'lumotlar bilan
  cheklanamiz. Kerak bo'lsa alohida keyingi sub-loyiha bo'ladi.
- Instagram/Facebook va OLX.uz — alohida spec'lar

## Ma'lumotlar modeli

`src/db/schema/youtube-channel-connection.ts`:

```ts
export const youtubeConnectionStatus = pgEnum("youtube_connection_status", [
  "connected",
  "error",
]);

export const youtubeChannelConnections = pgTable("youtube_channel_connection", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  organizationId: text("organizationId")
    .notNull()
    .unique()
    .references(() => organizations.id, { onDelete: "cascade" }),
  channelId: text("channelId").notNull(),
  channelTitle: text("channelTitle"),
  accessTokenEncrypted: text("accessTokenEncrypted").notNull(),
  refreshTokenEncrypted: text("refreshTokenEncrypted").notNull(),
  tokenExpiresAt: timestamp("tokenExpiresAt", { mode: "date" }).notNull(),
  status: youtubeConnectionStatus("status").notNull().default("connected"),
  lastSyncedAt: timestamp("lastSyncedAt", { mode: "date" }),
  lastError: text("lastError"),
  createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
});
```

`onConflictDoUpdate` bilan `organizationId` unique key'ga yoziladi (qayta
ulanganda eski qatorni yangilaydi) — Telegram jadvali bilan bir xil naqsh.

## Umumiy shifrlash moduli

Hozirgi `src/lib/telegram/session-crypto.ts` `TELEGRAM_SESSION_ENCRYPTION_
KEY`ga qattiq bog'langan. Yangi `src/lib/crypto/token-crypto.ts` yaratiladi:

```ts
export function encryptToken(plaintext: string): string;
export function decryptToken(ciphertext: string): string;
```

AES-256-GCM, `INTEGRATION_TOKEN_ENCRYPTION_KEY` (base64, 32 bayt) — Telegram
moduli bilan bir xil algoritm, lekin generic va Telegram'ga bog'liq emas.
`session-crypto.ts` o'zgarishsiz qoladi (Telegram allaqachon ishlayotgan
kodni bezovta qilmaslik uchun) — YouTube va keyingi Instagram bosqichi yangi
modulni ishlatadi.

## OAuth oqimi

**1. `GET /api/oauth/youtube/start`**
- `requireOrganization`ga o'xshash, lekin Route Handler ichida (redirect()
  ishlamaydi) — `auth()` orqali Clerk userId tekshiradi, org'ni topadi,
  bo'lmasa 401.
- `state = HMAC-SHA256(organizationId + locale + nonce + timestamp,
  INTEGRATION_TOKEN_ENCRYPTION_KEY)` — base64url, 5 daqiqa TTL.
- Google OAuth URL'ga redirect:
  `https://accounts.google.com/o/oauth2/v2/auth` — `client_id`, `redirect_
  uri=${APP_URL}/api/oauth/youtube/callback`, `response_type=code`,
  `scope=https://www.googleapis.com/auth/youtube.readonly`,
  `access_type=offline`, `prompt=consent`, `state`.

**2. `GET /api/oauth/youtube/callback`**
- `state`ni tekshiradi (imzo + TTL), noto'g'ri bo'lsa xato bilan
  `/statistics/marketing`ga redirect.
- `code`ni Google token endpoint'iga (`https://oauth2.googleapis.com/
  token`) almashtiradi → `access_token`, `refresh_token`, `expires_in`.
- YouTube Data API `channels?part=snippet,statistics&mine=true` chaqiradi
  → `channelId`, `channelTitle`.
- Token'larni shifrlab `onConflictDoUpdate` bilan yozadi, `status=
  "connected"`.
- `/${locale}/statistics/marketing?youtube=connected` ga redirect (toast
  uchun query param, mavjud xabar ko'rsatish naqshiga mos).
- Xato holatlarida (`code` yo'q, token almashish muvaffaqiyatsiz, API xatosi)
  → `?youtube=error`ga redirect, sahifa honest xato xabarini ko'rsatadi.

## Ma'lumot olish

`src/lib/youtube/channel-stats.ts`:

```ts
export async function getYoutubeChannelStats(connection: YoutubeConnection):
  Promise<YoutubeStatsResult>
```
- `tokenExpiresAt < now`bo'lsa avval `refresh_token` bilan yangi
  `access_token` oladi, DB'ga yozadi.
- `channels?part=statistics` → `subscriberCount`, `viewCount`, `videoCount`.
- `search?forMine=true&type=video&order=date&maxResults=5` → so'nggi 5 video
  ID → `videos?part=snippet,statistics` → sarlavha + `viewCount`.
- Google API xato qaytarsa (`invalid_grant` va h.k.) — connection'ni
  `status="error"`, `lastError`ga yozadi, `{ available: false, reason }`
  qaytaradi (Telegram naqshiga mos — mock emas, honest "xatolik" holati).

## UI

`/statistics/marketing/page.tsx`dagi YouTube mock kartasi
`YoutubeAnalyticsCard` server komponenti bilan almashtiriladi:
- Ulanmagan → "Google orqali ulash" tugmasi, `<a href="/api/oauth/youtube/
  start">` (server action emas, to'g'ridan-to'g'ri Route Handler'ga link,
  chunki tashqi redirect kerak).
- Ulangan + `available: true` → obunachilar, umumiy ko'rishlar, video soni,
  so'nggi videolar ro'yxati (sarlavha + ko'rishlar), "Uzish" tugmasi
  (server action, Telegram'dagi `disconnectTelegramChannel`ga o'xshash).
- Ulangan + `available: false` (xato) → honest xato xabari + "Qayta ulash"
  tugmasi.
- `?youtube=connected`/`?youtube=error` query param asosida qisqa toast/xabar
  (mavjud sahifa naqshlariga mos, alohida toast kutubxonasi kerak bo'lsa
  mavjudini tekshirib ishlatish).

`MockConnectButton` faqat Instagram/OLX kartalarida hali ham ishlatilgani
uchun hozircha o'chirilmaydi — keyingi sub-loyihalarda ular ham real bo'lgach
butunlay o'chiriladi.

## Xatoliklarni boshqarish

- OAuth `state` yaroqsiz/eskirgan → xato bilan qaytish, hech narsa yozilmaydi.
- Token almashish muvaffaqiyatsiz (foydalanuvchi consent bermadi, kod
  muddati tugadi) → `?youtube=error`, DB'ga yozilmaydi.
- `refresh_token` Google tomonidan bekor qilingan (`invalid_grant`) →
  connection `status="error"`ga o'tadi, UI foydalanuvchidan qayta ulanishni
  so'raydi.
- YouTube API kvota tugashi (`quotaExceeded`) → `lastError`ga yoziladi,
  UI "vaqtincha ma'lumot yo'q" xabarini ko'rsatadi, hardcoded raqam
  qaytarilmaydi.

## Test qamrovi

- `token-crypto.test.ts` — encrypt/decrypt round-trip (Telegram
  `session-crypto.test.ts` naqshiga mos)
- `channel-stats.test.ts` — token yangilash logikasi, xato holatlari
  (mock fetch)
- `youtube-actions.test.ts` (agar disconnect uchun server action ajratilsa)
- OAuth route handler'lar uchun `state` imzo/TTL tekshiruvi test qilinadi

## Yangi env o'zgaruvchilar (`.env.example`)

```
GOOGLE_OAUTH_CLIENT_ID=
GOOGLE_OAUTH_CLIENT_SECRET=
INTEGRATION_TOKEN_ENCRYPTION_KEY=
APP_URL=
```

**Google Cloud Console sozlash ko'rsatmasi** (implementatsiya
tugagach README yoki shu spec'ga qo'shiladi):
1. https://console.cloud.google.com → yangi loyiha → "APIs & Services" →
   "YouTube Data API v3"ni yoqish.
2. "OAuth consent screen" — "External", test rejimida (verification shart
   emas, chunki `youtube.readonly` sensitive emas, restricted emas).
3. "Credentials" → "Create OAuth client ID" → "Web application" →
   "Authorized redirect URIs"ga `${APP_URL}/api/oauth/youtube/callback`
   qo'shiladi (masalan `https://arioo.uz/api/oauth/youtube/callback` yoki
   local test uchun `http://localhost:3000/api/oauth/youtube/callback`).
4. Client ID/Secret'ni `.env.local`ga qo'yish.
5. `INTEGRATION_TOKEN_ENCRYPTION_KEY` — 32 bayt tasodifiy qiymat, base64:
   `openssl rand -base64 32`.

## Ochiq savollar / taxminlar

- `youtube.readonly` scope "sensitive" toifasida, lekin Google tomonidan
  majburiy tekshiruv talab qilinmaydi (faqat "restricted" scope'lar
  tekshiruv talab qiladi) — test rejimida 100 tagacha test-foydalanuvchi
  bilan ishlaydi, production uchun consent screen'ni "In production"ga
  o'tkazish kifoya.
- Bir tashkilot — bitta YouTube kanal (Telegram bilan bir xil taxmin,
  YAGNI: ko'p kanal keyinroq kerak bo'lsa qo'shiladi).
