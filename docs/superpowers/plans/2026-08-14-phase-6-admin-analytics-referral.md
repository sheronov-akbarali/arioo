# Phase 6: Implementation Plan

## 1. Admin Panel
- [ ] `src/app/[locale]/(dashboard)/admin/page.tsx` yaratish.
- [ ] Jadvallar (Organizations), tokenlar xarajati diagrammasi (Recharts mock) yasash.
- [ ] `sidebar-nav.tsx` ga Admin panel linkini qo'shish (pastki qismga).

## 2. Analitika (Overview)
- [ ] `src/app/[locale]/(dashboard)/statistics/page.tsx` ni ko'rib chiqib, haqiqiy yoki mock chartlar qo'shish. Ehtimol chart allaqachon borki, uni boyitishimiz kerak. 

## 3. Affiliate va Referral
- [ ] `src/app/[locale]/(dashboard)/affiliate-program/page.tsx` da chiroyli CPA daromadlar dashboardini yasash.
- [ ] `src/app/[locale]/(dashboard)/referral-program/page.tsx` da "Do'stingizni taklif qiling" UI yasash. Nusxa olish mumkin bo'lgan referal link va ishlangan "ARI" tokenlar hisobi.

## 4. Xavfsizlik va Muvofiqlik (Settings)
- [ ] `src/app/[locale]/(dashboard)/settings/security/page.tsx` yaratish.
- [ ] 2FA sozlamalari, Faol sessiyalar (Clerk orqali), O'zbekiston qonunchiligiga muvofiq ma'lumotni o'chirish (Delete Data) bo'limini yasash.

## 5. Load Testing Script
- [ ] Loyiha papkasida `scripts/load-test.js` faylini yaratish (K6 script).
