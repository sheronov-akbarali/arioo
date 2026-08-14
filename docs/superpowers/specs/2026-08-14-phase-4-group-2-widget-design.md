# Phase 4, Group 2: Website Chat Widget Integration Design

## Maqsad
Foydalanuvchilar o'z biznes saytlariga o'rnatishi uchun JavaScript (React/Vanilla) asosidagi Chat Vidjet yaratish. Bu vidjet orqali sayt mehmonlari to'g'ridan-to'g'ri AI xodim bilan suhbatlashishi mumkin bo'ladi.

## User Flow
1. Foydalanuvchi "Integrations" bo'limida "Sayt vidjeti" tugmasini bosadi.
2. Qaysi agent ulanishini tanlaydi va "Yaratish" (Generate) tugmasini bosadi.
3. Tizim unga saytning `<head>` yoki `<body>` qismiga joylash uchun kichik `<script>` kodini (Embed code) beradi.
4. Foydalanuvchi bu kodni o'z saytiga joylashtiradi.
5. Saytga kirgan mijozlar o'ng burchakda turuvchi vidjet orqali AI agent bilan gaplashadi.

## Texnik yechim
### 1. Baza (Database) o'zgarishlari
- Biz allaqachon `channels` jadvaliga `"widget"` turini (`channelType`) qo'shganmiz. 
- Widget uchun `botToken` shart emas, lekin `widgetToken` yoki maxsus ochiq `public_id` kerak bo'ladi (shunchaki `channels.id` dan ham foydalanishimiz mumkin, chunki u UUID).

### 2. UI / UX (Dashboard)
- `src/components/dashboard/integrations/widget-connect-dialog.tsx` faylini yaratish.
- Foydalanuvchi Agentni tanlaydi -> Tizim yangi `channel` (type: widget) yaratadi.
- Ekranda nusxa olish uchun (Copy to clipboard) `Embed Code` ko'rsatiladi:
  ```html
  <script src="https://arioo.uz/widget.js" data-channel-id="<CHANNEL_ID>" async></script>
  ```

### 3. Widget.js (Tashqi fayl)
- `public/widget.js` yoki `/api/widget/script` faylini yaratamiz. 
- Bu script o'z ichiga CSS va HTML iFrame/ShadowDOM oladi, saytning o'ng pastki qismiga suhbat oynasini (Chat bubble) chizadi.
- Xabarlashuv uchun alohida public API: `/api/widget/chat` (POST).

### 4. Public API Route
- `/api/widget/chat` endpointi.
- Kelgan so'rovdan `channelId` va `sessionId` (localstoragedan olinadigan ixtiyoriy ID) ni o'qiydi.
- `conversations` da `externalChatId = sessionId` bilan qidiradi yoki yaratadi.
- `messages` ga mijoz xabarini saqlaydi.
- Vercel AI SDK orqali javob olib, `messages` ga yozib, Client'ga (vidjetga) Stream (yoki oddiy text) qaytaradi.
