# Phase 5, Group 1: Ichki yengil CRM (Internal Light CRM) Design

## Maqsad
Foydalanuvchilar (biznes egalari) AI xodimlari orqali yig'ilgan lidlarni (potensial mijozlarni), ularning qiziqishlari, statuslari va ular bilan bog'liq "Kelishuvlar" (Deals) ni bitta joyda boshqarishini ta'minlash. Katta CRM (amoCRM/Bitrix24) lar o'rniga oddiy va ixcham tizimni platformaning ichida yaratish.

## Tushunchalar va Data Model
1. **Contacts (Kontaktlar)**: Platformaga ulanib gaplashgan har qanday odam (Telegram, WhatsApp, Sayt vidjeti orqali).
2. **Deals (Kelishuvlar)**: Muayyan sotuv jarayoni. Masalan, "Qiziqish bildirgan", "Muzokarada", "Sotib oldi", "Bekor qilindi".

### Yangi DB sxema (`src/db/schema/crm.ts`)
- `contacts`: id, organizationId, name, phone, email, channelId (qayerdan kelgan), createdAt, updatedAt.
- `deals`: id, organizationId, contactId, agentId, title, value (narx/summa), currency, status (enum: "new", "negotiating", "won", "lost"), createdAt, updatedAt.

## UI / UX (Dashboard)
Yangi sahifa: `/crm`
- **Dashboard Sidebar** ga "CRM" (yoki "Mijozlar va Lidlar") menyusi qo'shiladi. (Ikonka: `Users` yoki `LayoutDashboard`).
- **Sahifa strukturasi (Tabs)**:
  1. **Kanban Board (Deals)**: Trello/Jira kabi ustunlardan iborat doska ("Yangi", "Muzokara", "Muvaffaqiyatli", "Bekor qilingan"). Kartochkalarni ustundan ustunga surish (drag-and-drop qilinmasa ham tugma orqali statusini o'zgartirish).
  2. **Kontaktlar (Contacts)**: Jadval ko'rinishida barcha mijozlar ro'yxati (Ismi, Telefoni, Qaysi kanaldan kelgani).

## Bog'liqlik (AI Agent bilan)
Qanday qilib AI agent buni to'ldiradi?
AI Agent uchun yangi Tools (Asboblar) qo'shiladi: `create_deal`, `update_contact_info`. AI mijoz bilan gaplashayotganda agar lid potensial xaridor bo'lsa, o'z-o'zidan (tool chaqirib) CRM da Deal yaratadi. Ammo bu "Agent yadrosi" (Tools) da hal etiladi. Hozirgi bosqichda faqat ma'lumotlar bazasi va CRM vizual qismi (Boshqaruv paneli) qilinadi.
