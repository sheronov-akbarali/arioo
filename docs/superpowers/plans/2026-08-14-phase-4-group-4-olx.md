# Phase 4, Group 4: OLX.uz Lid Intake (Implementation Plan)

## 1. Server Action
- [ ] `src/lib/integrations/actions.ts` da `connectOlxAction` yaratamiz.
- [ ] O'zgaruvchilarni olib `channels` ga `type: "olx"` yozamiz.

## 2. UI/UX Dialog
- [ ] `src/components/dashboard/integrations/olx-connect-dialog.tsx` yaratish.
- [ ] Oynada faqat Agent tanlash va Webhook linkini ulashish.
- [ ] `IntegrationsGrid` da qo'shish.

## 3. API Route
- [ ] `src/app/api/webhooks/olx/[channelId]/route.ts` yaratamiz.
- [ ] POST requestni parse qilamiz, DB ga yozamiz, javobni olib, oddiy HTTP javob orqali RPA botga qaytaramiz.
