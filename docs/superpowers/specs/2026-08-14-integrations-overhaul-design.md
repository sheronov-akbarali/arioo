# Integrations bo'limini qayta qurish — dizayn

## 1. Maqsad

Hozirgi `/integrations` sahifasi statik provayder ro'yxati va har biri uchun mustaqil
"ulash" dialogidan iborat — ulanish holati faqat `channels.isActive` orqali ikki xil
holatda ko'rinadi: "Ulash" yoki "Ulangan". worken.ru'ning autentifikatsiyalangan
paneli chuqur tahlil qilindi (2026-08-14, Chrome orqali haqiqiy akkaunt bilan) va
undan ancha boy bo'lgan integratsiya boshqaruv tizimi topildi: ko'p bosqichli
ulanish oqimlari, real vaqtli status/lifecycle kuzatuvi va har bir integratsiya
uchun alohida boshqaruv sahifasi.

Bu spec Arioo'ning Integrations bo'limini worken darajasiga olib chiqadi:
provayder-bazasini kengaytiradi, umumiy status/lifecycle qatlamini qo'shadi va
5 ta provayder uchun haqiqiy OAuth infratuzilmasini quradi.

## 2. Doirasi (Scope)

**Kiradi:**
- Yangi `integrations` jadvali — barcha provayderlar uchun umumiy status/lifecycle
- Provayder katalogini config-driven qilish (`connectionMode` asosida)
- Telegram uchun "Bot vs Shaxsiy akkaunt (MTProto)" tanlov oynasi
- OAuth infratuzilmasi: amoCRM, Bitrix24, Google (Drive+Sheets+Calendar
  birlashtirilgan), GitHub, HeadHunter
- Yangi provayderlar: VK (token+group+webhook-secret forma), HeadHunter (OAuth)
- Har bir integratsiya uchun `/integrations/:id` boshqaruv sahifasi (status,
  audit-log, Test connection, Archive, Delete)
- Status dashboard (Active/Need attention/Verifying/In setup/Archived hisoblagichlari)
  va filter pill'lar (status + kategoriya)

**Kirmaydi (keyingi versiyalar uchun):**
- Odnoklassniki, Max — RU-maxsus, foydalanuvchi tomonidan rad etildi
- MTProto'ni umumiy chat-kanaliga aylantirish — faqat statistika vazifasini
  bajarishda davom etadi, faqat UI markazlashtiriladi
- "Local tools (CLI)" — worken'ning `worken mcp --tools` CLI ekotizimi;
  Custom MCP Server dialogimiz statik URL+headers formasi bilan davom etadi
- OAuth provayderlarning haqiqiy client_id/secret'larini olish — bu foydalanuvchi
  tomonidan tashqi developer-akkauntlar orqali amalga oshiriladi (12-bo'limga qarang)

## 3. Ma'lumotlar modeli

### 3.1 Yangi jadval — `src/db/schema/integrations.ts`

```ts
export const integrationConnectionMode = pgEnum("integration_connection_mode", [
  "oauth",
  "form",
  "wizard",
  "special", // Telegram Bot, WhatsApp, Sayt vidjeti, OLX.uz — mavjud bespoke oqimlar
]);

export const integrationStatus = pgEnum("integration_status", [
  "setup_needed",   // hali ulanmagan yoki wizard tugallanmagan
  "verifying",      // ulash so'rovi yuborilgan, tasdiqlash kutilmoqda
  "active",         // ulangan va tekshirildi
  "need_attention", // reauth/xato — foydalanuvchi harakati kerak
  "archived",       // foydalanuvchi arxivlagan (o'chirilmagan, lekin faol emas)
]);

export const integrations = pgTable("integration", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  organizationId: text("organizationId")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  providerId: text("providerId").notNull(), // "amocrm", "telegram_bot", "telegram_mtproto", ...
  connectionMode: integrationConnectionMode("connectionMode").notNull(),
  status: integrationStatus("status").notNull().default("setup_needed"),

  // OAuth uchun: access/refresh token (shifrlangan). Form/apikey uchun: kalit/parol.
  credentialsEncrypted: text("credentialsEncrypted"),
  // Forma maydonlari (masalan SIP server manzili, MCP HTTP headers) — sir bo'lmagan qism
  config: jsonb("config").$type<Record<string, unknown>>(),

  // Mavjud jadvallarga bog'lanish — ikkalasi ham null bo'lishi mumkin (masalan sof OAuth CRM)
  linkedChannelId: text("linkedChannelId").references(() => channels.id, { onDelete: "set null" }),
  linkedTelegramConnectionId: text("linkedTelegramConnectionId")
    .references(() => telegramChannelConnections.id, { onDelete: "set null" }),

  agentId: text("agentId").references(() => aiAgents.id, { onDelete: "set null" }),

  lastVerifiedAt: timestamp("lastVerifiedAt", { mode: "date" }),
  lastError: text("lastError"),

  createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
});

// Har bir tashkilotda bir provayderdan faqat bitta yozuv (Telegram Bot va MTProto
// alohida providerId — "telegram_bot" / "telegram_mtproto" — bo'lgani uchun ikkalasi
// bir vaqtda mavjud bo'la oladi).
// unique index: (organizationId, providerId)
```

### 3.2 Audit-log jadvali — `src/db/schema/integration-events.ts`

```ts
export const integrationEventType = pgEnum("integration_event_type", [
  "created", "status_changed", "verified", "error", "reauth", "archived", "deleted",
]);

export const integrationEvents = pgTable("integration_event", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  integrationId: text("integrationId")
    .notNull()
    .references(() => integrations.id, { onDelete: "cascade" }),
  type: integrationEventType("type").notNull(),
  message: text("message"),
  createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
});
```

Bu ikkala jadval `drizzle-kit push` orqali bazaga qo'shiladi (loyihada
migratsiya fayllari drizzle-kit avtomatik generatsiya qiladi).

### 3.3 Shifrlash

Mavjud `src/lib/telegram/session-crypto.ts` (AES-256-GCM,
`TELEGRAM_SESSION_ENCRYPTION_KEY`) ga o'xshash, lekin alohida umumiy modul:
`src/lib/integrations/credential-crypto.ts`, o'z env o'zgaruvchisi
`INTEGRATION_CREDENTIALS_ENCRYPTION_KEY` bilan (32 bayt, base64). Telegram'ning
o'z shifrlash kaliti va jadvali o'zgarishsiz qoladi — ikkalasi mustaqil.

## 4. Provayder katalogi

`src/lib/integrations-data.ts` o'rniga `src/lib/integrations/providers.ts`:

```ts
export type ConnectionMode = "oauth" | "form" | "wizard" | "special";

export type ProviderConfig = {
  id: string;
  categories: IntegrationCategory[];
  connectionMode: ConnectionMode;
  oauth?: { envPrefix: string; scopes: string[] }; // masalan "AMOCRM" → AMOCRM_CLIENT_ID/_SECRET
};
```

| Provider | connectionMode | Kategoriya | Eslatma |
|---|---|---|---|
| Telegram | `special` | chat | Bot/MTProto tanlov oynasi (5-bo'lim) |
| WhatsApp | `special` | chat | Mavjud Cloud API forma, o'zgarmaydi |
| Sayt vidjeti | `special` | chat | Mavjud, o'zgarmaydi |
| OLX.uz | `special` | marketplace | Mavjud lid-forma, o'zgarmaydi (ochiq API yo'q) |
| SIP | `form` | voice | Mavjud forma, endi `integrations` orqali status kuzatiladi |
| 1C | `form` | crm | Mavjud forma |
| Custom MCP Server | `form` | other | URL + dinamik HTTP headers (7-bo'lim) |
| VK | `form` | chat | **Yangi**: access token + group ID + webhook secret |
| AmoCRM | `oauth` | crm | **Yangi**: haqiqiy OAuth |
| Bitrix24 | `oauth` | crm | **Yangi**: haqiqiy OAuth |
| Google | `oauth` | files, calendar | **Yangi**: Drive+Sheets+Calendar bitta OAuth'da birlashadi |
| GitHub | `oauth` | git | **Yangi**: haqiqiy OAuth (hozir "Tez orada" disabled) |
| HeadHunter | `oauth` | chat | **Yangi provider**: OAuth (dev.hh.ru) |

Google birlashtirilgani sababli hozirgi ikkita alohida narsa —
`googleWorkspace` (Sheets/Drive) provayderi va `calendar-connect-dialog.tsx`
(Google Calendar) — bitta "Google" provayderiga birlashtiriladi, bitta OAuth
tugmasi ostida (`drive`, `spreadsheets`, `calendar`, `calendar.events`,
`userinfo.*` scope'lari bilan).

## 5. Telegram: Bot vs MTProto tanlov

`TelegramProviderCard` bosilganda, `channels` va `telegramChannelConnections`
holatidan qat'i nazar, avval **tanlov modali** ochiladi:

- **Bot (@BotFather)** — "Oddiy messenjer-integratsiya: bot yozishmalarga,
  guruh va kanallarga javob beradi" → mavjud `TelegramConnectDialog`
  (bot-token forma, `channels` jadvaliga yozadi)
- **Shaxsiy akkaunt (MTProto)** — "Kanal statistikasi uchun, telefon raqami
  orqali kirish — bu bot EMAS" → mavjud 4-bosqichli wizard (Phone → SMS code →
  2FA → Verify, `telegramChannelConnections` jadvaliga yozadi)

Har ikkala oqim muvaffaqiyatli tugagach, `providerId: "telegram_bot"` yoki
`providerId: "telegram_mtproto"` bilan alohida `integrations` yozuvi
yaratiladi (`linkedChannelId` / `linkedTelegramConnectionId` orqali bog'lanadi).
Karta ustida "1/2 ulangan" kabi qisqa status ko'rsatiladi agar faqat bittasi
ulangan bo'lsa.

MTProto ulash formasi Statistics → Marketing kanallari tab'idan olib
tashlanadi (u yerda faqat statistika ko'rinadi); ulanish endi markazlashgan
Integrations sahifasidan boshqariladi.

## 6. OAuth infratuzilmasi

### 6.1 Umumiy route'lar

- `GET /api/integrations/[provider]/oauth/start` — `state` (CSRF himoyasi
  uchun tasodifiy token + `organizationId`, JWT yoki imzolangan) generatsiya
  qilib, provayderning `authUrl`'iga redirect qiladi
- `GET /api/integrations/[provider]/oauth/callback` — `code`'ni token'ga
  almashtiradi, `state`'ni tekshiradi, `integrations` yozuvini
  `credentialsEncrypted` bilan yangilaydi, `status: "active"` qiladi, audit-log
  yozadi, `/integrations`'ga redirect qiladi

Har bir OAuth provayder uchun `authUrl`/`tokenUrl`/`scope` konstantalari
`providers.ts`'da e'lon qilinadi.

### 6.2 Redirect URI'lar (barqaror, `NEXT_PUBLIC_APP_URL` asosida)

```
https://arioo.uz/api/integrations/amocrm/oauth/callback
https://arioo.uz/api/integrations/bitrix24/oauth/callback
https://arioo.uz/api/integrations/google/oauth/callback
https://arioo.uz/api/integrations/github/oauth/callback
https://arioo.uz/api/integrations/headhunter/oauth/callback
```

### 6.3 Foydalanuvchi tomonidan bajariladigan qadamlar

Har bir OAuth provayder uchun kod tayyor bo'ladi, lekin **client_id/secret**
tashqi developer-akkaunt orqali olinishi shart (bu Arioo emas, foydalanuvchining
biznes hisobi orqali ro'yxatdan o'tkaziladi). Implementatsiya rejasida har bir
provayder uchun qadam-baqadam yo'riqnoma (skrinshotlarsiz, aniq havolalar bilan)
alohida hujjat sifatida yoziladi:

| Provider | Ro'yxatdan o'tish joyi |
|---|---|
| Google | console.cloud.google.com → OAuth consent screen + Credentials |
| GitHub | github.com/settings/developers → New OAuth App |
| amoCRM | amocrm.ru → Разработчикам → Создать интеграцию |
| Bitrix24 | bitrix24 partner portali → Локальное приложение |
| HeadHunter | dev.hh.ru/admin → Создать приложение |

Kalitlar kelmaguncha tugma **"Sozlash kerak"** holatida disabled turadi (aniq
xabar bilan — worken'dagi "Missing OAuth credentials" kabi noaniq xato emas),
1C/Custom MCP kabi mavjud pattern'ga mos.

## 7. Custom MCP Server: dinamik HTTP headers

Hozirgi statik forma o'rniga: MCP server URL + "Add header" tugmasi bilan
kengayadigan header ro'yxati (key/value juftliklari, har birida o'chirish
tugmasi). `config` maydonida `{ url, headers: [{key, value}] }` sifatida
saqlanadi (header value'lar `credentialsEncrypted`'da emas — chunki ba'zilari
sir bo'lmasligi mumkin; agar `Authorization` kabi sezgir header bo'lsa, uning
qiymati alohida shifrlanadi).

## 8. Status/lifecycle tizimi

### 8.1 Status dashboard (sahifa tepasida)

5 ta karta: Active / Need attention / Verifying / In setup / Archived — har
biri hisoblagich va tavsif bilan (worken'dagi "verified", "reauth / error",
"vendor check", "finish wizard", "restorable" formatida).

### 8.2 Filter pill'lar

- Status bo'yicha: All, Active, Need attention, Verifying, In setup, Archived
- Kategoriya bo'yicha (mavjud): Chat, CRM, Git, Calendar, Marketplace, Voice, Other

### 8.3 "Sizning integratsiyalaringiz" / "Kashf eting" ikki bo'lim

Hozirgi bitta grid o'rniga ikkiga bo'linadi:
- **Sizning integratsiyalaringiz** — `integrations` jadvalida yozuvi bor
  providerlar, real progress-bar va status bilan ("Sozlash davom etmoqda ·
  SMS kod kutilmoqda")
- **Yana toping** — hali ulanmagan providerlar, oddiy "Ulash" tugmasi bilan

## 9. Boshqaruv sahifasi — `/integrations/[id]`

Bo'limlar (worken'dagi tuzilishga mos):
1. **Profil** — icon, nomi, tavsif, status badge
2. **Ulanish tafsilotlari** — Last verified, Errors (soni), Used by (qaysi
   agent/kanalga bog'liq)
3. **Lifecycle log** — `integration_events` jadvalidan xronologik ro'yxat
4. **Bog'liq resurslar** — masalan Telegram uchun "Chats" bo'limi (qaysi
   suhbat oynasiga bog'langan)
5. **Xavfli hudud** — Archive (statusni `archived` qiladi, ma'lumotni
   saqlaydi) va Delete integration (yozuvni va shifrlangan kalitlarni butunlay
   o'chiradi, bog'liq `channels`/`telegramChannelConnections` yozuvini
   o'chirmaydi — foydalanuvchidan alohida tasdiq so'raladi)

"Test connection" tugmasi — provayderga qarab mos so'rov yuboradi (masalan
Telegram uchun `getMe`, amoCRM uchun `/api/v4/account`), natijasiga qarab
`status` va `lastVerifiedAt`/`lastError`'ni yangilaydi, audit-log yozadi.

## 10. Xatoliklarni boshqarish

- OAuth callback'da `state` mos kelmasa yoki `code` almashish muvaffaqiyatsiz
  bo'lsa → `status: "need_attention"`, `lastError` aniq xabar bilan
  to'ldiriladi, foydalanuvchiga toast orqali ko'rsatiladi
- Kalit sozlanmagan provayderda "Ulash" bosilsa → forma o'rniga tushunarli
  xabar: "Bu integratsiya hali administratordan sozlanishini kutmoqda"
- Forma validatsiyasi — mavjud shakl (required maydon, inline xato) davom etadi
- Test connection muvaffaqiyatsiz bo'lsa → status `need_attention`, xato matni
  saqlanadi, foydalanuvchi qayta urinish yoki "Delete" qila oladi

## 11. i18n

Yangi tarjima kalitlari (`messages/{uz,ru,en}.json`, `integrations`
namespace'i kengaytiriladi):
- Status nomlari (5 ta), filter yorliqlar
- Telegram tanlov modali matni (2 variant tavsifi)
- Detail sahifa bo'lim sarlavhalari, "Test connection"/"Archive"/"Delete"
  tasdiqlash matnlari
- Yangi providerlar: VK, HeadHunter nomi/tavsifi
- OAuth "Sozlash kerak" xabari

## 12. Test rejasi

- Unit: `credential-crypto.ts` (encrypt/decrypt round-trip), provider
  status-transition funksiyalari (masalan `deriveStatus()`)
- Integration: OAuth callback route'lari (mock token exchange, state
  tekshiruvi, xato holatlari) — vitest orqali, mavjud
  `telegram/finalize-connection.test.ts` naqshiga o'xshab
- Mavjud Telegram MTProto testlari (`session-crypto.test.ts`,
  `finalize-connection.test.ts`) o'zgarmaydi, faqat chaqiruv joyi ko'chadi
- Har bir yangi dialog komponenti uchun qo'lda Chrome-orqali tekshirish
  (loyihaning joriy konvensiyasiga mos — avtomatik component testlar yo'q)

## 13. Implementatsiya guruhlari (keyingi reja bosqichi uchun)

Reja yozish bosqichida quyidagi guruhlarga bo'linadi (Phase 4 naqshiga mos):

1. **Guruh 1 — Data model va umumiy infratuzilma**: `integrations` +
   `integration_events` jadvallari, `credential-crypto.ts`, status-hisoblash
   logikasi, provider katalogini qayta qurish
2. **Guruh 2 — Status dashboard va ikki-bo'limli grid**: sahifa qayta
   dizayni, filter pill'lar, "Sizning integratsiyalaringiz"/"Yana toping"
3. **Guruh 3 — Telegram tanlov oynasi**: Bot/MTProto picker, MTProto
   formasini Statistics'dan Integrations'ga ko'chirish
4. **Guruh 4 — OAuth infratuzilmasi**: umumiy start/callback route'lari,
   amoCRM/Bitrix24/Google/GitHub/HeadHunter konfiguratsiyasi, "Sozlash kerak"
   holati
5. **Guruh 5 — Yangi va yangilangan formalar**: VK forma, Custom MCP dinamik
   headers, SIP/1C'ni `integrations` jadvaliga ulash
6. **Guruh 6 — Boshqaruv sahifasi**: `/integrations/[id]`, lifecycle log,
   Test connection, Archive/Delete

## 14. Ochiq bog'liqliklar

- 5 ta OAuth provayder uchun client_id/secret — foydalanuvchi tomonidan
  ro'yxatdan o'tkaziladi (6.3-bo'lim), guruh-4 tugagach yo'riqnoma alohida
  taqdim etiladi
- `INTEGRATION_CREDENTIALS_ENCRYPTION_KEY` — yangi 32-baytli maxfiy kalit,
  `openssl rand -base64 32` orqali generatsiya qilinadi va `.env.local`/Vercel
  env'ga qo'shiladi (guruh-1 boshida)
