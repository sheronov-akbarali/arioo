# Phase 4, Group 3: WhatsApp Business API Integration Design

## Maqsad
Foydalanuvchilar o'zlarining WhatsApp Business raqamlarini Arioo platformasiga ulash imkoniyatini yaratish. Bu Meta WhatsApp Cloud API orqali amalga oshiriladi.

## User Flow
1. Foydalanuvchi "Integrations" sahifasidan "WhatsApp" ni tanlaydi.
2. "Ulash" tugmasini bosganda Modal ochiladi. Unda Meta App ID, App Secret, System User Token, va WhatsApp Phone Number ID larni kiritish maydonlari bo'ladi. Va qaysi Agent biriktirilishi tanlanadi.
3. Kiritilgan ma'lumotlar saqlanadi. Foydalanuvchiga Meta sahifasiga kiritish uchun Arioo tizimidagi Webhook URL va Verify Token (Tasdiqlash tokeni) taqdim etiladi.
4. Foydalanuvchi Meta Developer konsoliga shu Webhook va tokenni kiritgach, ulanish tasdiqlanadi.
5. Mijozlar WhatsApp orqali yozganda AI xodim to'g'ridan-to'g'ri javob qaytaradi.

## Texnik yechim
### 1. Database
- `channels` jadvalidagi `"whatsapp"` channelType orqali yoziladi.
- `credentials` kabi maxsus ob'ekt/ustun kerak, lekin biz hozircha faqat `botToken` (System Token) va `botUsername` (Phone Number ID) ga ma'lumotlarni yozishimiz mumkin. Yoki `whatsappVerifyToken` uchun yangi migratsiya qilamiz, yoki `botUsername` ga bir nechta ma'lumotni JSON qilib saqlaymiz.
- Eng yaxshisi, mavjud `botToken` ga WhatsApp tokenini saqlaymiz, `botUsername` ga Phone Number ID saqlaymiz. Verify token uchun maxsus Guid/UUID (masalan `channelId` o'zi etarli).

### 2. UI / UX (Dashboard)
- `src/components/dashboard/integrations/whatsapp-connect-dialog.tsx` yaratiladi.

### 3. Server Action
- `connectWhatsappAction` yoziladi, u `botToken` (Access token) va `phoneNumberId` (botUsername) olib `channels` ga yozadi.

### 4. Webhook API Route
- `/api/webhooks/whatsapp/[channelId]/route.ts` yaratiladi.
- Meta Webhook verifikatsiyasi uchun `GET` zaprosni qo'llab-quvvatlashi kerak (hub.mode, hub.verify_token).
- Yangi kelgan xabarlar (messages) uchun `POST` zapros ishlaydi. U xabarni o'qib, AI ga beradi va Meta API `https://graph.facebook.com/v19.0/<PHONE_NUMBER_ID>/messages` orqali javob qaytaradi.
