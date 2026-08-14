# Phase 5, Group 1: Ichki yengil CRM (Implementation Plan)

## 1. Database Schema
- [ ] `src/db/schema/crm.ts` yaratish. `crm_contacts` va `crm_deals` jadvallarini yozish. `deal_status` enum ("new", "negotiating", "won", "lost") qo'shish.
- [ ] `src/db/schema/index.ts` orqali ularni export qilish.
- [ ] `drizzle-kit generate` va `drizzle-kit push` yordamida bazaga kiritish.

## 2. Layout & Sidebar UI
- [ ] `src/components/dashboard/sidebar-nav.tsx` ga "CRM" havolasini qo'shish (ikonka bilan).
- [ ] Tillar (uz, ru, en) lug'atiga (masalan `messages/uz.json`) `crm` kalit so'zlarini qo'shish.

## 3. CRM Sahifalari va UI Komponentlari
- [ ] `src/app/[locale]/(dashboard)/crm/layout.tsx` (faqat tablarni saqlaydigan o'ram).
- [ ] `src/app/[locale]/(dashboard)/crm/page.tsx` (Kanban doskasi — Deals uchun).
  - Ustunlar: Yangi lid, Muzokara, Muvaffaqiyatli, Bekor qilingan.
  - Kartochkalarda deals ning qiymati (value), agent nomi va kontakt ismini chiqarish.
- [ ] `src/app/[locale]/(dashboard)/crm/contacts/page.tsx` (Kontaktlar jadvali).
  - Foydalanuvchilar (lidlar) ro'yxati jadval ko'rinishida.

## 4. DB Data Fetching (Read/Write)
- [ ] `page.tsx` larda `db.select()` qilib tashkilotning o'ziga tegishli kontakt va deal larni tortish.
- [ ] Vaqtincha (AI ulanmaguncha) qolda "Kontakt qo'shish" va "Deal qo'shish" tugmalari / server action'lari yasab turish, toki qarab test qilish mumkin bo'lsin.
