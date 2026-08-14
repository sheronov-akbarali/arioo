# Phase 4, Group 1: Telegram Bot Integratsiyasi (Design Spec)

## Kontekst
Arioo platformasida AI agentlar (assistentlar) bilan turli xil tashqi kanallar orqali muloqot qilish imkoniyati yaratilishi kerak. O'zbekiston bozori uchun eng muhim va birinchi raqamli kanal bu — Telegram. Biz ushbu bosqichda tizimga Telegram bot ulanishini (connector) qo'shamiz. 

Tashkilot o'zining Telegram bot tokenini (BotFather'dan olingan) tizimga kiritadi va o'zi yaratgan AI agentini (Sotuvchi, HR va hk.) ushbu botga ulaydi. Shundan so'ng, mijozlar Telegram orqali yozganda, AI agent to'g'ridan-to'g'ri Telegramda javob qaytaradi.

## Doira (Scope)
**Ichida (qilinadi):**
- Yangi `channels` (kanallar) DB jadvali: AI agentga ulangan tashqi kanallarni saqlash uchun.
- Yangi `conversations` va `messages` DB jadvallari: Tashqi kanaldan kelgan xabarlarni saqlash va kontekstni ushlab turish uchun.
- Telegram Webhook API endpoint: `/api/webhooks/telegram` — Telegram serverlaridan keladigan xabarlarni qabul qiluvchi markaziy nuqta.
- UI Kengaytmasi: `/integrations` sahifasida Telegram botni ulash (token kiritish) formasi va ulanish holatini boshqarish (Connect/Disconnect).
- AI yadrosiga ulash: Vercel AI SDK va mavjud `aiAgents` jadvallari bilan integratsiya.

**Tashqarida (keyingi guruhlarga qoldiriladi):**
- WhatsApp Business API, OLX.uz va Sayt vidjeti (bular ketma-ketlikda alohida Group sifatida qilinadi).
- Ovozli qo'ng'iroq (SIP) integratsiyalari.

## Ma'lumotlar modeli (Database Schema)

Yangi fayl: `src/db/schema/channels.ts`

### `channels` jadvali:
```typescript
id: uuid, primary key
organizationId: uuid (FK to organizations)
agentId: uuid (FK to aiAgents) // Qaysi agent javob beradi
type: pgEnum("channel_type", ["telegram", "whatsapp", "widget", "olx"])
credentials: jsonb // { botToken: string, botUsername: string }
isActive: boolean default true
createdAt, updatedAt
```

### `conversations` jadvali:
```typescript
id: uuid, primary key
channelId: uuid (FK to channels)
externalChatId: text // Telegram chat_id (mijozning ID si)
agentId: uuid (FK to aiAgents)
metadata: jsonb // Mijozning ismi, username kabi ma'lumotlar
createdAt, updatedAt
```

### `messages` jadvali:
```typescript
id: uuid, primary key
conversationId: uuid (FK to conversations)
role: pgEnum("message_role", ["user", "assistant", "system", "tool"])
content: text
externalMessageId: text // Telegram xabar ID si (javob berish yoki o'chirish uchun)
createdAt
```

## Route va API tuzilishi
1. **API Route:** `POST /api/webhooks/telegram/:channelId` — Telegram'dan xabar kelganda ishlaydi. 
   - `channelId` orqali qaysi bot ekanligini aniqlaymiz.
   - Xabarni DB (`messages`) ga yozamiz.
   - Vercel AI SDK (`generateText` yoki mos funksiya) yordamida agentning prompoti va oldingi xabarlar kontekstida javob tayyorlaymiz.
   - Javobni Telegram bot API (`sendMessage`) orqali mijozga yuboramiz.
   
2. **Dashboard UI:** `src/app/[locale]/(dashboard)/integrations/page.tsx`
   - Bu yerda "Telegram" kartochkasi bo'ladi. "Ulangan" (Connected) yoki "Ulanmagan" holati ko'rinadi.
   - Ulanmagan bo'lsa, bosganda Modal (Dialog) ochiladi: 
     - Bot Token so'raladi.
     - "Saqlash" bosilganda Telegram API ga so'rov yuborib tokenni to'g'riligini tekshiradi (getMe).
     - Webhookni o'rnatadi (`setWebhook` to `https://bizning-domen.uz/api/webhooks/telegram/CHANNEL_ID`).
     - Ma'lumotni `channels` jadvaliga yozadi.

## Testlash rejasi
- `drizzle-kit generate/migrate` yordamida DB jadvallarini yaratish.
- Localhost'da Ngrok yordamida webhooklarni sinab ko'rish.
- Token orqali ulanish va xato token berilganda validatsiyani tekshirish.
- Botga xabar yuborib, AI agentning to'g'ri va tez javob qaytarishini sinash.

Ushbu spec tasdiqlangach, uni amalga oshirish rejasi (Implementation Plan) yoziladi.
