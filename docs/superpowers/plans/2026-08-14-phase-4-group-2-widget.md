# Phase 4, Group 2: Website Chat Widget Integratsiyasi (Implementation Plan)

## 1. Widget yaratish mantiqi (Server Action)
- [ ] `src/lib/integrations/actions.ts` da yangi `createWidgetChannelAction` yaratamiz. 
- [ ] Bu action faqat `agentId` qabul qilib, DB (`channels` jadvali) da `type: "widget"` bolgan yangi qator yaratib beradi.

## 2. UI / UX (Dashboard)
- [ ] `src/components/dashboard/integrations/widget-connect-dialog.tsx` faylini yaratish.
- [ ] Oyna ichida: Agentni tanlash va "Vidjet Yaratish" tugmasi.
- [ ] Yaratilgandan so'ng, shu oynaning o'zida `<script ...>` matni nusxa olish (Copy) imkoniyati bilan ko'rsatiladi.
- [ ] `IntegrationsGrid` da `provider.id === "websiteWidget"` bo'lsa, xuddi Telegram kabi shu yangi Oynani ulash.

## 3. Public API Route (Widget chat ulanishi)
- [ ] `src/app/api/widget/chat/route.ts` faylini yaratish (POST).
- [ ] Bu yo'nalish mijoz saytidan CORS orqali keladigan JSON so'rovni qabul qiladi.
- [ ] Mijoz brauzeridan yuborilgan `channelId` va `sessionId` (brouzer tabida yaratilgan ixtiyoriy guid) tekshiriladi.
- [ ] Eski xabarlarni DB (`messages`) dan tortib AI ga kontekst qilib yuboriladi va olingan javob yana DB ga yozilib orqaga string ko'rinishida qaytariladi.

## 4. JS Script (Client qism)
- [ ] Saytlarga o'rnatiladigan tayyor ko'rinish berish uchun React yoki Vanilla JS da sodda UI chizamiz, lekin vaqtni tejash uchun API ni tekshiradigan minimal HTML/JS versiyasini yaratamiz yoki kelgusida mijozga Next.js Server Components orqali iframe berish yo'lini qilamiz. Hozircha asosiy e'tibor Backend API ga qaratiladi.
