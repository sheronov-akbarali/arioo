# Phase 4, Group 1: Telegram Bot Integratsiyasi (Implementation Plan)

Bu reja `specs/2026-08-14-phase-4-group-1-telegram-bot-design.md` asosida qadam-baqadam yozilgan.

## 1. Ma'lumotlar bazasi (Database) sxemasini yaratish
- [x] `src/db/schema/channels.ts` faylini yaratish va `channels`, `conversations`, `messages` jadvallarini yozish.
- [x] Enum turlarini qo'shish: `channel_type` ("telegram") va `message_role` ("user", "assistant").
- [x] Asosiy jadvallar (`organizations`, `aiAgents`) bilan relation (aloqa) larni to'g'ri o'rnatish.
- [x] `drizzle-kit generate` orqali migratsiya faylini yaratish va `drizzle-kit push` (yoki `migrate`) yordamida Neon DB ga yozish.

## 2. Integratsiya UI (Dashboard)
- [x] `src/app/[locale]/(dashboard)/integrations/page.tsx` faylida "Telegram" va boshqa kanallar kartochkalari ro'yxatini (Grid) yaratish.
- [x] Telegram kartochkasi uchun "Ulash" (Connect) tugmasini qo'shish.
- [x] "Ulash" tugmasi bosilganda Modal/Dialog ochilishi: `botToken` kiritish formasi. Kiritilayotgan botni qaysi agentga ulashni tanlash uchun Select (dropdown) menyusi.
- [x] Formani yuborganda ishlaydigan Server Action yaratish: `src/lib/integrations/actions.ts` -> `connectTelegramBotAction`.

## 3. Server Action (connectTelegramBotAction) mantiqi
- [x] Token kiritilganda uni tekshirish (Telegram API `https://api.telegram.org/bot<TOKEN>/getMe` ga so'rov yuborish).
- [x] Token yaroqli bo'lsa, uni DB dagi `channels` jadvaliga yozish (`isActive: true`).
- [x] Telegram API ga `setWebhook` orqali bizning webhook URL ni o'rnatish: `https://<domain>/api/webhooks/telegram/[channelId]`. (Localhost'da ishlab turishi uchun Ngrok domendek vaqtinchalik URL dan foydalanish mumkin).

## 4. Webhook API Route
- [x] `src/app/api/webhooks/telegram/[channelId]/route.ts` faylini yaratish (POST requestlar uchun).
- [x] Kelgan xabarni parslash: `chat.id`, `message.text`, `message.message_id`, `from.first_name` ma'lumotlarini ajratib olish.
- [x] `channelId` orqali qaysi AI agent ulanganini topish.
- [x] `conversations` jadvalida shu foydalanuvchi (`externalChatId`) bormi yo'qmi tekshirish, yo'q bo'lsa yangi yaratish.
- [x] Xabarni `messages` jadvaliga `role="user"` sifatida saqlash.

## 5. AI Generatsiyasi (Vercel AI SDK bilan)
- [x] Webhook yo'nalishida AI agent ma'lumotlarini (system prompt, model) yuklash.
- [x] `conversations` id bo'yicha oldingi xabarlarni (`messages`) DB dan olish (kontekst uchun).
- [x] Vercel AI SDK (`generateText`) yordamida javob generatsiya qilish. 
- [x] Generatsiya qilingan javobni Telegram bot API (`sendMessage`) orqali mijozga jo'natish.
- [x] Javob muvaffaqiyatli ketgach, uni `messages` jadvaliga `role="assistant"` qilib yozib qo'yish.

Barcha qadamlar tasdiqlangach, kod yozish jarayoniga o'tiladi.
