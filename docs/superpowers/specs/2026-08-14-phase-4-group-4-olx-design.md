# Phase 4, Group 4: OLX.uz Lid-intake Design

## Maqsad
OLX.uz da e'lon bergan foydalanuvchilarning hisoblariga kelgan xabarlarni yoki e'lonlarga qiziqish bildirgan potentsial mijozlarni Arioo platformasiga lid (suhbat) sifatida kiritish. 

## Muammo va Cheklov
OLX.uz ochiq rasmiy API ga ega emas. To'g'ridan-to'g'ri integratsiya qilish uchun rasmiy OAuth yoki Webhook yo'q. Shuning uchun integratsiya quyidagicha ishlaydi:
Arioo tomonidan taqdim etiladigan maxsus "Lid-intake" Webhook linki mavjud bo'ladi. Foydalanuvchi o'zining yordamchi skripti (yoki Chrome kengaytmasi, yoki RPA boti) orqali OLX xabarlarini o'qib, shu Webhook ga yuborishi mumkin. Arioo uni qabul qilib olib, AI agent orqali qayta ishlaydi. 

## User Flow
1. Foydalanuvchi "Integrations" sahifasidan "OLX.uz" ni tanlaydi.
2. "Ulash" ni bosadi. Dialog ochiladi: Qaysi AI Xodim javobgar bo'lishi tanlanadi.
3. Tizim avtomatik ravishda Webhook URL yaratib beradi. (Masalan: `https://arioo.uz/api/webhooks/olx/<CHANNEL_ID>`).
4. "Ulangan" holatiga o'tadi.

## Texnik yechim
### 1. Database
- `channels` jadvalidagi `"olx"` channelType orqali yoziladi. (botToken shart emas).

### 2. UI / UX
- `src/components/dashboard/integrations/olx-connect-dialog.tsx` yaratiladi.
- `IntegrationsGrid` da qo'shiladi.

### 3. Server Action
- `connectOlxAction` yaratiladi. O'xshash mantiq.

### 4. Webhook API Route
- `/api/webhooks/olx/[channelId]/route.ts` yaratiladi (POST).
- Tana: `{ "chatId": "...", "message": "...", "advertisementId": "..." }`
- AI SDK ishga tushadi, javob generatsiya qilinadi.
- Javob OLX ga avtomatik yuborilmaydi (chunki ruxsat yo'q), faqatgina "RPA" bot o'qib olishi uchun javob sifatida JSON da qaytariladi: `{ "response": "..." }`. Yoki tizimdagi operator paneliga saqlanadi.
