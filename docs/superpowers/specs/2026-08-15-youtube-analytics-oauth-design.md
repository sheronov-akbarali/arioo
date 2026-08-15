# YouTube Analytics — haqiqiy OAuth integratsiya

Sana: 2026-08-15 (qayta ko'rib chiqilgan — Integrations overhaul main'ga
merge qilingandan keyin)
Holat: tasdiqlangan, implementatsiya rejasi kutilmoqda

## Muammo

`/statistics/marketing` sahifasidagi "Marketing kanallari" bo'limida YouTube
Analytics kartasi to'liq hardcoded (`12,450` obunachi, `1.2M` ko'rish, `45K
soat` watch time) va `MockConnectButton` — bosilganda 1.5 soniyadan keyin
haqiqiy ulanishsiz "Ulangan" holatini ko'rsatadi.

Bu spec — Statistika bo'limini to'liq real qilish ishining 1-sub-loyihasi
(3 tadan: YouTube, Instagram/Facebook, OLX.uz).

## Muhim: qayta ko'rib chiqish sababi

Birinchi versiyada bu spec noldan bespoke OAuth infratuzilmasi
(`youtube_channel_connection` jadvali, alohida shifrlash moduli, alohida
`/api/oauth/youtube/*` route'lari) taklif qilgandi. Shu orada Integrations
overhaul ishi tugallanib `main`ga merge bo'ldi — endi **umumiy OAuth
infratuzilmasi allaqachon mavjud**:

- `integrations` jadvali (`organizationId`+`providerId` unique, `credentials
  Encrypted`, `status`, `lastVerifiedAt`/`lastError`) — har bir provider
  uchun bitta qator
- `src/lib/integrations/credential-crypto.ts` — AES-256-GCM, `INTEGRATION_
  CREDENTIALS_ENCRYPTION_KEY`
- `src/lib/integrations/oauth/{config,state,exchange}.ts` — provider
  katalogi, HMAC-imzolangan `state`, kod almashish
- `/api/integrations/[provider]/oauth/{start,callback}/route.ts` — generic
  route'lar, istalgan provider uchun ishlaydi
- `OAuthConnectButton`, `OAuthResultToast` komponentlari

Shu sabab bu versiya **noldan qurish o'rniga mavjud infratuzilmaga ulanish**
strategiyasiga o'tkazildi. Bu ancha kichikroq va toza yechim.

## Mavjud infratuzilmadagi tekshirishda topilgan 2 ta nuqson (tuzatilishi shart)

Bular YouTube token almashishi ishlashi uchun **majburiy** tuzatishlar,
lekin barcha OAuth provider'lariga foydali (amoCRM/Bitrix24/Google/GitHub/
HeadHunter hech biri hali haqiqiy kalitlar bilan test qilinmagan edi):

1. **`exchange.ts` noto'g'ri Content-Type yuboradi.** Hozir `Content-Type:
   application/json` bilan JSON body yuboradi. OAuth 2.0 standarti
   (RFC 6749 §4.1.3) va Google/GitHub/Bitrix24'ning token endpoint'lari
   `application/x-www-form-urlencoded` talab qiladi — Google buni JSON bilan
   qabul qilmaydi. `URLSearchParams` bilan form-urlencoded'ga o'tkaziladi,
   `Accept: application/json` header saqlanadi (GitHub JSON javob qaytarishi
   uchun kerak).
2. **Token muddati (`expires_in`) saqlanmaydi.** `credentialsEncrypted`
   hozir faqat `{accessToken, refreshToken}` saqlaydi — muddat tugashini
   bilish imkonsiz, demak avtomatik yangilash imkonsiz. Callback route
   `raw.expires_in`dan `expiresAt` hisoblab, uni ham JSON'ga qo'shadi:
   `{accessToken, refreshToken, expiresAt}` (barcha provider'lar uchun,
   orqaga mos — `expiresAt` bo'lmasa refresh urinilmaydi).

## Qamrov ichida

- `exchange.ts`dagi 2 ta tuzatish (yuqorida)
- `oauth/config.ts`ga `access_type=offline&prompt=consent` kabi provider-
  maxsus qo'shimcha auth parametrlarini qo'llab-quvvatlash (Google refresh
  token faqat shu parametrlar bilan qaytaradi) + `start/route.ts`ni shu
  parametrlarni qo'shishga moslashtirish
- `providers.ts` va `oauth/config.ts`ga yangi `"youtube"` provider yozuvi
  qo'shish — `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET`ni qayta ishlatadi
  (bir xil Google Cloud OAuth client), faqat `youtube.readonly` scope bilan
  — mavjud `"google"` provider (Calendar/Drive)dan alohida qator, chunki
  ular turli scope so'raydi va bir-birini ustiga yozmasligi kerak
- Umumiy `refreshAccessToken(provider, refreshToken)` funksiyasi
  (`oauth/exchange.ts`ga qo'shiladi)
- `src/lib/youtube/channel-stats.ts` — `integrations` jadvalidan
  `providerId="youtube"` qatorini o'qiydi, kerak bo'lsa token yangilaydi,
  YouTube Data API v3'dan real statistika oladi
- `/statistics/marketing` sahifasidagi YouTube mock kartasini almashtirish:
  ulanmagan → `OAuthConnectButton` (provider="youtube"); ulangan → real
  statistika + uzish (integration status'ni `archived`ga o'tkazish orqali,
  mavjud `detail-actions.ts` naqshiga mos)
- `.env.example`ga izoh qo'shish (yangi env o'zgaruvchi kerak emas — mavjud
  `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET`/`INTEGRATION_CREDENTIALS_
  ENCRYPTION_KEY`/`OAUTH_STATE_SIGNING_SECRET`/`NEXT_PUBLIC_APP_URL`
  ishlatiladi) + Google Cloud Console sozlash ko'rsatmasi

## Qamrov tashqarisida

- **Watch time (soat)** — YouTube Analytics API kerak (sensitive scope,
  qo'shimcha murakkablik). Faqat Data API bilan cheklanamiz: obunachilar,
  umumiy ko'rishlar, video soni, so'nggi videolar ko'rishlari.
- Instagram/Facebook va OLX.uz — alohida spec'lar (2, 3-sub-loyiha)
- `/integrations` katalog sahifasiga YouTube kartasi qo'shish — bu ish
  Statistics sahifasi doirasida, faqat u yerda ulanish/uzish kifoya;
  Integrations bosh sahifasida ko'rinishi kerak bo'lsa alohida so'rov

## Ma'lumotlar modeli

Yangi jadval **yo'q**. Mavjud `integrations` jadvali ishlatiladi:
`organizationId` + `providerId="youtube"` bo'yicha bitta qator,
`connectionMode="oauth"`, `credentialsEncrypted` ichida
`{accessToken, refreshToken, expiresAt, channelId, channelTitle}`
(JSON, shifrlangan). `channelId`/`channelTitle`ni ham shu JSON'ga
qo'shamiz — alohida ustun ochish shart emas (`config: jsonb` ustuni
mavjud, lekin credentials bilan bir joyda shifrlangan holda saqlash
xavfsizroq va boshqa provider'lar bilan bir xil naqsh).

## Provider katalogi o'zgarishi

`src/lib/integrations/providers.ts`:
```ts
{
  id: "youtube",
  categories: ["marketplace"], // yoki mos kategoriya
  connectionMode: "oauth",
  oauth: {
    envPrefix: "GOOGLE",
    scopes: ["https://www.googleapis.com/auth/youtube.readonly"],
  },
},
```

`src/lib/integrations/oauth/config.ts`:
```ts
PROVIDER_ENV_PREFIX.youtube = "GOOGLE";
PROVIDER_ENDPOINTS.youtube = {
  authUrl: "https://accounts.google.com/o/oauth2/v2/auth",
  tokenUrl: "https://oauth2.googleapis.com/token",
  scopes: ["https://www.googleapis.com/auth/youtube.readonly"],
  extraAuthParams: { access_type: "offline", prompt: "consent" },
};
```
`extraAuthParams` — `OAuthProviderConfig`ga yangi ixtiyoriy maydon,
`start/route.ts` mavjud bo'lsa `authorizeUrl.searchParams`ga qo'shadi.

## OAuth oqimi

Mavjud generic route'lar ishlatiladi, o'zgarishsiz qoladi (faqat yuqoridagi
2 ta tuzatish + `extraAuthParams` qo'llab-quvvatlash bilan):

1. `GET /api/integrations/youtube/oauth/start?locale=uz` — `OAuthConnect
   Button` shu URL'ga link qiladi
2. Google consent screen
3. `GET /api/integrations/youtube/oauth/callback` — kodni token'ga
   almashtiradi (endi to'g'ri form-urlencoded bilan), YouTube Data API
   `channels?part=snippet&mine=true`dan `channelId`/`channelTitle`ni oladi,
   `credentialsEncrypted`ga yozadi, `integrations` qatorini `status=
   "active"` bilan yaratadi/yangilaydi, `integrationEvents`ga `"verified"`
   yozadi, `/${locale}/statistics/marketing?oauthSuccess=youtube`ga
   qaytaradi

**Callback route'ga kichik o'zgarish kerak:** hozir har doim
`/${locale}/integrations?oauthSuccess=...`ga qaytaradi. YouTube uchun
foydalanuvchi Statistics sahifasidan boshlagani uchun `state` payload'iga
`returnPath` (yoki oddiy `redirectTo`) qo'shiladi — `signOAuthState`/
`verifyOAuthState`ga ixtiyoriy maydon sifatida (orqaga mos, boshqa
provider'lar uchun `undefined` bo'lsa hozirgi `/integrations`ga qaytadi).

## Ma'lumot olish

`src/lib/youtube/channel-stats.ts`:
```ts
export async function getYoutubeChannelStats(organizationId: string):
  Promise<YoutubeStatsResult>
```
- `integrations` jadvalidan `providerId="youtube"` qatorini o'qiydi; topil-
  masa yoki `status !== "active"` bo'lsa `{ connected: false }`.
- Credential'ni ochadi; `expiresAt < now`bo'lsa `refreshAccessToken("youtube",
  refreshToken)` chaqiradi, yangi `accessToken`/`expiresAt`ni qayta
  shifrlab DB'ga yozadi.
- `channels?part=statistics&id=${channelId}` → `subscriberCount`,
  `viewCount`, `videoCount`.
- `search?channelId=${channelId}&type=video&order=date&maxResults=5` →
  video ID'lar → `videos?part=snippet,statistics` → sarlavha + `viewCount`.
- Xato (masalan `invalid_grant`) → `integrations.status="need_attention"`,
  `lastError`ga yoziladi, `{ connected: true, available: false, reason }`
  qaytaradi — mock emas, honest xatolik holati.

## UI

`/statistics/marketing/page.tsx`da YouTube mock kartasi
`YoutubeAnalyticsCard` bilan almashtiriladi:
- Ulanmagan → `OAuthConnectButton` (`provider="youtube"`,
  `configured={isOAuthConfigured("youtube")}`)
- Ulangan + `available: true` → obunachilar, umumiy ko'rishlar, video soni,
  so'nggi videolar (sarlavha + ko'rishlar), "Uzish" tugmasi — mavjud
  `archiveIntegrationAction(integrationId, locale)` (`detail-actions.ts`)
  to'g'ridan-to'g'ri qayta ishlatiladi (`status="archived"`ga o'tkazadi,
  `integrationEvents`ga yozadi)
- Ulangan + `available: false` → honest xato xabari + qayta ulash tugmasi
- `?oauthSuccess=youtube`/`?oauthError=...` query param — mavjud
  `OAuthResultToast` komponenti qayta ishlatiladi

`MockConnectButton` Instagram/OLX kartalarida hali qoladi (keyingi
sub-loyihalarda olib tashlanadi).

## Xatoliklarni boshqarish

- `state` yaroqsiz/eskirgan → `oauthError=invalid_state`, hech narsa
  yozilmaydi (mavjud xatti-harakat)
- Token almashish muvaffaqiyatsiz → `oauthError=exchange_failed`, DB'ga
  yozilmaydi
- `refresh_token` Google tomonidan bekor qilingan → `status=
  "need_attention"`, UI qayta ulanishni so'raydi
- YouTube API kvota tugashi (`quotaExceeded`) → `lastError`ga yoziladi,
  UI "vaqtincha ma'lumot yo'q" xabarini ko'rsatadi, hardcoded raqam
  qaytarilmaydi

## Test qamrovi

- `exchange.test.ts`ga form-urlencoded body va `expiresAt` hisoblash uchun
  yangi testlar
- `config.test.ts` (yangi) — `extraAuthParams` to'g'ri qo'shilishini
  tekshiradi
- `channel-stats.test.ts` (yangi) — token yangilash logikasi, xato
  holatlari (mock fetch)
- Callback route uchun `returnPath` orqali to'g'ri sahifaga qaytish testi

## Env o'zgaruvchilar

Yangisi **kerak emas** — mavjudlaridan foydalaniladi:
`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`,
`INTEGRATION_CREDENTIALS_ENCRYPTION_KEY`, `OAUTH_STATE_SIGNING_SECRET`,
`NEXT_PUBLIC_APP_URL`.

**Google Cloud Console sozlash ko'rsatmasi:**
1. https://console.cloud.google.com → loyiha → "APIs & Services" →
   "YouTube Data API v3"ni yoqish.
2. "OAuth consent screen" — "External", test rejimida (`youtube.readonly`
   majburiy Google tekshiruvi talab qilmaydi).
3. "Credentials" → "Create OAuth client ID" → "Web application" →
   "Authorized redirect URIs"ga
   `${NEXT_PUBLIC_APP_URL}/api/integrations/youtube/oauth/callback`
   qo'shiladi (bir xil client "google" provider bilan ham ishlatiladi,
   Calendar redirect URI'siga qo'shimcha sifatida bitta qator ko'proq).
4. Client ID/Secret allaqachon `.env.local`da bo'lsa (Google Calendar
   integratsiyasi uchun) — qayta ishlatiladi, yangisi kerak emas.

## Ochiq savollar / taxminlar

- `"google"` va `"youtube"` bir xil OAuth client (`GOOGLE_CLIENT_ID/
  SECRET`)ni ishlatadi, lekin alohida `integrations` qatorlari (turli
  `providerId`) — foydalanuvchi ikkalasini alohida-alohida ulashi/uzishi
  mumkin, bitta ulanish ikkinchisiga ta'sir qilmaydi.
- Bir tashkilot — bitta YouTube kanal (Telegram bilan bir xil taxmin).
