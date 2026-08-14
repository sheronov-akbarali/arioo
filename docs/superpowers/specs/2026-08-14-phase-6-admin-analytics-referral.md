# Phase 6: Admin, Analitika, Hamkorlik, va Ishga Tushirish (Design)

## 1. Admin Panel
- **Maqsad:** Arioo platformasi egalari uchun umumiy tizimni nazorat qilish (tashkilotlarni ko'rish, API xarajatlari va ishlatilgan tokenlarni monitoring qilish).
- **Yechim:** Hozirgi foydalanuvchi admin emasligini farqlash qiyin (chunki Clerk orqali kiriladi). Oddiy echim sifatida `(dashboard)/admin` maxsus route ochamiz, unga faqat ma'lum bir `adminEmail` kirisha oladigan qilamiz yoki hamma ko'rishi mumkin bo'lgan mock UI yasaymiz.
- **Tarkib:** Tashkilotlar ro'yxati jadvali, Jami iste'mol qilingan tokenlar va API harajatlari grafigi.

## 2. Ishonchli Real-time Analitika
- **Maqsad:** `statistics` sahifasini mukammallashtirish. Raqobatchida (worken) bo'sh bo'lgan qismlarni jonlantirish. 
- **Yechim:** `statistics` sahifasidagi "Overview" va boshqa tablarni real ma'lumotlar yoki ishonchli mocklar bilan to'ldirish (chartlar: Recharts yordamida chiziladi). Biz allaqachon `Marketing` tabni mukammal qildik, endi qolganlarini ham to'ldirish kerak (Aktiv chats, xarajat, lidlar konversiyasi).

## 3. Ikki Qatlamli Referral (Hamkorlik)
- **Maqsad:** Agentliklar uchun `Affiliate program` (pul ishlash), oddiy mijozlar uchun `Referral program` (platforma ichki krediti ishlash).
- **Yechim:** 
  - `(dashboard)/affiliate-program` (CPA tarmog'i kabi pul ishlash grafigi, referal havolalar)
  - `(dashboard)/referral-program` (Do'stlarni taklif qilib 'ARI' token ishlash)
  - Ushbu sahifalardagi "Coming soon" ni olib, tayyor UI yasash.

## 4. Xavfsizlik va Muvofiqlik
- **Yechim:** Foydalanuvchi sozlamalariga (`/settings/security`) O'zbekiston shaxsiy ma'lumotlar to'g'risidagi qonuni (ShMQQ) ga muvofiqlik haqida matn va ma'lumotlarni o'chirish huquqi (Delete account/data) funksiyasini qo'shish.

## 5. Yuklama (Load) Testi
- **Yechim:** Tizim Vercel / Neon Serverless asosida ishlagani uchun auto-scale qobiliyatiga ega, shunday bo'lsa ham `k6` yoki shunga o'xshash skript (fayl ko'rinishida) yaratib qo'yiladi.
