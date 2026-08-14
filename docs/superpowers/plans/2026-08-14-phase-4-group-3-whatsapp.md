# Phase 4, Group 3: WhatsApp Business API Integratsiyasi (Implementation Plan)

## 1. Server Action yaratish
- [ ] `src/lib/integrations/actions.ts` da `connectWhatsappAction` yozamiz.
- [ ] Forma parametrlaridan `agentId`, `accessToken`, va `phoneNumberId` olamiz.
- [ ] DB `channels` ga `type: "whatsapp"` qilib yozamiz (`botToken` = `accessToken`, `botUsername` = `phoneNumberId`).

## 2. UI/UX Dialog
- [ ] `src/components/dashboard/integrations/whatsapp-connect-dialog.tsx` komponentini yaratamiz.
- [ ] Ulanishdan so'ng Meta uchun Webhook URL (hozirgi domen) va Verify Token (qaysiki `channelId` bilan bir xil bo'ladi) ni Copy qilishga chiqaramiz.
- [ ] `IntegrationsGrid` (`src/components/dashboard/integrations/integrations-grid.tsx`) ga ulaymiz.

## 3. Webhook Endpoint
- [ ] `src/app/api/webhooks/whatsapp/[channelId]/route.ts` fayli.
- [ ] GET: Meta Webhook Verifikatsiyasi (`hub.verify_token` === `channelId` ekanligini tekshirish va `hub.challenge` ni qaytarish).
- [ ] POST: Yangi xabar qabul qilish (Meta payload structure).
- [ ] Xabarni saqlash (DB `messages`), Vercel AI SDK dan javob olish, keyin Meta Graph API orqali mijozga javobni yuborish.
