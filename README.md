# Arioo - AI Xodimlar va CRM Platformasi
**To'liq Foydalanuvchi va Tizim Qo'llanmasi**

Arioo — bu biznesingiz uchun sun'iy intellekt (AI) asosidagi virtual xodimlarni yaratish, ularni mijozlar bilan muloqotga (Telegram, Sayt, Instagram) ulash va barcha mijozlarni bitta CRM tizimida boshqarish imkonini beruvchi zamonaviy SaaS platformasi.

---

## 📑 Mundarija
1. [Platforma Haqida](#1-platforma-haqida)
2. [Mijozlar (User) Paneli](#2-mijozlar-user-paneli)
   - [Dashboard (Bosh sahifa)](#dashboard-bosh-sahifa)
   - [AI Xodimlar](#ai-xodimlar-yaratish)
   - [CRM va Bitimlar](#crm-va-bitimlar)
   - [Suhbatlar (Chats)](#suhbatlar-chats)
   - [Statistika va Marketing](#statistika-va-marketing)
   - [Billing (To'lovlar)](#billing-tolovlar)
3. [Admin Paneli](#3-admin-paneli)
4. [Tizim Arxitekturasi (Dasturchilar uchun)](#4-tizim-arxitekturasi-dasturchilar-uchun)
5. [Loyiha Qanday Ishga Tushiriladi?](#5-loyiha-qanday-ishga-tushiriladi)

---

## 1. Platforma Haqida

Arioo tizimi ikkita asosiy qismdan iborat:
- **Mijozlar (User) Paneli:** Tadbirkorlar va biznes egalari ro'yxatdan o'tib, o'zlarining AI xodimlarini yaratadigan, CRM ni yuritadigan qism.
- **Admin Paneli:** Arioo tizimi egalari (Siz) barcha foydalanuvchilarni, to'lovlarni, murojaatlar va e'lonlarni boshqaradigan markaziy qism.

---

## 2. Mijozlar (User) Paneli

Mijozlar tizimga kirgandan so'ng quyidagi imkoniyatlarga ega bo'ladilar:

### Dashboard (Bosh sahifa)
Bosh sahifada biznesning umumiy holati ko'rinadi. 
- **Jonli Statistika:** Faol AI xodimlar soni, CRM dagi jami bitimlar va qilingan suhbatlar soni ma'lumotlar bazasidan (Database) real vaqt rejimida hisoblab ko'rsatiladi.

### AI Xodimlar (Yaratish)
Foydalanuvchi `/assistants` bo'limiga kirib o'z biznesi uchun xodim yaratadi.
1. **Rolni tanlash:** Sotuvchi, Qo'llab-quvvatlash xodimi, HR yoki Tarjimon.
2. **Bilimlar bazasi (Knowledge base):** Xodimga kompaniya haqida PDF, Word yoki matn ko'rinishida ma'lumotlar beriladi. Sun'iy intellekt faqat shu berilgan ma'lumotlarga asoslanib javob beradi.
3. **Sozlamalar:** Xodimning xarakteri, javob berish ohangi va ijodkorligi sozlangan.

### CRM va Bitimlar
`/crm` bo'limida mijozlarning murojaatlari Kanban doskasi (Trello kabi) ko'rinishida saqlanadi.
- **Yangi Lid -> Muzokara -> Muvaffaqiyatli -> Bekor qilingan.**
- Har bir bitim (deal) avtomatik ravishda AI xodim orqali yoki qo'lda qo'shilishi mumkin.
- Bitim ustiga bosilganda u qaysi mijoz ekanligi va bitim summasi real vaqtda ko'rsatiladi.

### Suhbatlar (Chats)
AI xodimning turli kanallarda (Telegram, Vebsayt) mijozlar bilan qilgan barcha suhbatlari yozib olinadi. Tadbirkor xohlagan vaqtda chatlarga kirib AI qanday javob berganini o'qishi va nazorat qilishi mumkin.

### Statistika va Marketing
- **Statistika:** Qaysi AI xodim qancha xarajat (API cost) qilgani, kunlik xabarlar soni va grafiklar.
- **Marketing:** YouTube, Instagram va OLX integratsiyalari orqali auditoriya qamrovini kuzatish.
- **Telegram integratsiyasi:** Telegram sahifasiga ulanish orqali guruh/kanallardagi statistikani tortib olish mumkin (Buning uchun API ID va HASH kiritilishi shart).

### Billing (To'lovlar)
- Foydalanuvchilar balansini to'ldiradi (Top up).
- Har bir AI xodimning yozgan xabari uchun "W" yoki so'm hisobida mablag' yechib boriladi. Tarix jadvalida barchasi shaffof ko'rinadi.

---

## 3. Admin Paneli

Admin panel faqat tizim egalari (superadminlar) uchun yopiq hududdir (`/uz/admin` orqali kiriladi).
Kirish ma'lumotlari (email va parol) kodda emas, `.env.local` faylidagi `ADMIN_EMAIL` va
`ADMIN_PASSWORD_HASH` o'zgaruvchilarida saqlanadi — parolning o'zi hech qayerda ochiq matnda
saqlanmaydi, faqat xesh (`src/lib/admin/password.ts`dagi `hashAdminPassword()` orqali
generatsiya qilinadi). Kirish ma'lumotlarini bilish kerak bo'lgan shaxsga xavfsiz kanal orqali
alohida yuboring.

**Admin Imkoniyatlari:**
- **Asosiy Ko'rsatkichlar:** Jami mijozlar, jami yaratilgan AI xodimlar, daromad.
- **Foydalanuvchilar (Users):** Ro'yxatdan o'tgan barcha bizneslar (tashkilotlar) ro'yxati.
- **AI Xodimlar:** Butun platforma bo'ylab yaratilgan barcha AI botlar va ularning statusi.
- **Billing va Tariflar:** Qaysi foydalanuvchi qancha to'lov qilgani, daromadlar auditi.
- **Murojaatlar (Tickets):** Foydalanuvchilar tomonidan yuborilgan texnik yordam so'rovlarini ko'rish va ularni "Yopilgan" yoki "Jarayonda" deb belgilash.
- **E'lonlar (Announcements):** Platforma yangiliklari va ogohlantirishlarini yaratish (ular mijozlarga ko'rinadi).
- **Marketing (Promokodlar):** Yangi foydalanuvchilarni jalb qilish uchun chegirma kodlarini (masalan, `START2026`) yaratish va boshqarish.

*(Yuqoridagi barcha modullar haqiqiy ma'lumotlar bazasiga ulangan va to'liq real ishlaydi).*

---

## 4. Tizim Arxitekturasi (Dasturchilar uchun)

Arioo zamonaviy Full-Stack texnologiyalarida qurilgan:
1. **Next.js 15 (App Router):** Asosiy freymvork. Barcha sahifalar server-side (SSR) va React Server Components (RSC) yordamida optimallashtirilgan.
2. **Next-Intl:** Ko'p tillilikni (Uz, En, Ru) ta'minlash uchun ishlatilgan. Barcha URL'lar `/[locale]/...` shaklida.
3. **Clerk:** Avtorizatsiya va xavfsizlik uchun. Mijozlar registratsiyasi (B2B/Tashkilotlar logikasi) Clerk orqali amalga oshadi.
4. **Drizzle ORM & Neon (Postgres):** Ma'lumotlar bazasi sifatida Serverless Postgres ishlatilmoqda. Skehmalar `src/db/schema` da joylashgan.
5. **Shadcn UI & Tailwind CSS:** Foydalanuvchi interfeysi (UI) chiroyli va responsiv bo'lishi uchun Tailwind va radix-ui asosidagi Shadcn komponentlaridan foydalanilgan.
6. **Recharts:** Grafiklar va statistikalarni chizish uchun.

---

## 5. Loyiha Qanday Ishga Tushiriladi?

Agar tizimni o'z kompyuteringizda yoki serverda ishga tushirmoqchi bo'lsangiz:

1. **Kutubxonalarni o'rnatish:**
   ```bash
   npm install
   ```

2. **Atrof-muhit o'zgaruvchilari (`.env.local`):**
   Clerk va Neon Database kalitlari `.env.local` faylida kiritilgan bo'lishi shart. (Shuningdek, Telegram ulanish uchun `TELEGRAM_API_ID`, `TELEGRAM_API_HASH` va maxfiy kalitlar kerak).

3. **Ma'lumotlar bazasini yangilash (Migration):**
   Yangi jadvallar (SQL Schemas) yaratilganda, ularni bazaga yuborish uchun quyidagi buyruq ishlatiladi:
   ```bash
   node -e 'require("dotenv").config({path: ".env.local"}); require("child_process").execSync("npx drizzle-kit push", {stdio: "inherit"})'
   ```

4. **Loyihani ishga tushirish (Development):**
   ```bash
   npm run dev
   ```
   Loyiha `http://localhost:3000` da ochiladi.

5. **Loyihani build qilish (Production):**
   ```bash
   npm run build
   npm start
   ```

---
*Ushbu qo'llanma tizimni boshqarish va o'rganish jarayonini osonlashtirish maqsadida Arioo jamoasi va sun'iy intellekt tomonidan tayyorlandi.*
