# TayanchAI — Bosqich 2a: Auth va Kabinet Skeleton

Status: Approved
Sana: 2026-08-05

## Maqsad

Bu spec Phase 2'ning birinchi yarmini qamrab oladi: autentifikatsiya (OAuth, akkaunt
ulash, sessiyalar) + birinchi kirishdan keyingi tashkilot yaratish oqimi + bo'sh kabinet
skeleton (worken.ru'ning autentifikatsiyalangan panelidagi minimalizm uslubida, lekin
TayanchAI'ning o'z brend ranggi va tarkibi bilan).

Doiradan tashqarida (Phase 2b, alohida spec): Payme/Click/Stripe checkout, tarif tanlash,
kredit-asosidagi billing UI. Doiradan tashqarida (Phase 3+): kabinet ichidagi haqiqiy
funksionallik — agent yaratish, suhbatlar, bilim bazasi va h.k. Bu spec faqat kabinet
*qobig'ini* (navigatsiya, layout, bo'sh holatlar) belgilaydi.

## Raqobatchi tahlili: worken.ru autentifikatsiyasi (haqiqiy hisob orqali tekshirildi)

worken.ru'da parol/email/telefon maydoni umuman yo'q — faqat OAuth:

- Kirish sahifasida provayder tugmalari: GitHub, Yandex, VK, Odnoklassniki, Сбер ID
  (5 tasi, hammasi Rossiya bozoriga xos)
- Ro'yxatdan o'tish alohida oqim emas — birinchi marta OAuth orqali kirilganda avtomatik
  akkaunt yaratiladi
- `/settings/accounts` sahifasida "Linked accounts" — bir nechta provayderni bitta
  akkauntga ulash mumkin, "kamida bitta ulanish qolishi kerak" cheklovi bilan
- Kabinet layout: chap tomonda ixcham sidebar (Assistants, Chats, Calls, Routines, Needs
  review, Knowledge bases, Products, Integrations, Statistics, Runs, Code agent), yuqorida
  tashkilot almashtirgich, pastda tarif/kredit vidjeti (masalan "Business L", "100.00W") va
  foydalanuvchi menyusi
- Vizual uslub: qorong'i tema standart, minimal ranglar (kulrang/qora fon, bitta accent
  rang — apelsin), yupqa border'lar, keng bo'sh joy, kam ikonka, kam soyalar

**Xulosa:** OAuth-birinchi, parolsiz konsepsiya to'g'ri va TayanchAI uchun ham saqlanadi,
lekin provayder to'plami O'zbekiston uchun almashtiriladi va ikkita qo'shimcha funksiya
(faol sessiyalar paneli, jamoa taklifi) qo'shiladi — bular worken.ru'da yo'q edi.

## Arxitektura

```
src/
  app/[locale]/
    (auth)/
      sign-in/page.tsx              # Yagona kirish/ro'yxatdan o'tish
      onboarding/page.tsx           # Tashkilot yaratish + ixtiyoriy jamoa taklifi
    (dashboard)/
      layout.tsx                    # Kabinet qobig'i: sidebar + topbar + org switcher
      dashboard/page.tsx            # Bo'sh holat ("Hali AI xodim yo'q" + CTA, Phase 3'da to'ldiriladi)
      settings/
        accounts/page.tsx           # Linked accounts (worken.ru pariteti)
        sessions/page.tsx           # Faol sessiyalar/qurilmalar (bizning ustunligimiz)
        team/page.tsx                # Jamoa a'zolari + taklif qilish
  app/api/auth/[...nextauth]/route.ts
  lib/auth/
    config.ts                       # Auth.js v5 konfiguratsiyasi (Drizzle adapter)
    providers/telegram.ts           # Maxsus Telegram Login provider (HMAC tekshiruv)
  db/
    schema/auth.ts                  # users, accounts, sessions (Auth.js Drizzle adapter jadvallari)
    schema/org.ts                   # organizations, memberships, invites
    client.ts                       # Neon + Drizzle client
  components/
    dashboard/                      # Sidebar, Topbar, OrgSwitcher, UserMenu, CreditWidget
    ui/sidebar.tsx                  # shadcn sidebar primitivi (yangi qo'shiladi)
```

**Nega bu tuzilma:** `(auth)` va `(dashboard)` route group'lari — Next.js App Router
konvensiyasi, ikkalasi ham `[locale]` ichida qoladi (mavjud i18n patternga mos). Auth.js
DB session strategiyasi tanlandi (JWT emas), chunki "faol sessiyalar" paneli har bir
session yozuvini (qurilma, IP, oxirgi faollik) alohida saqlashni talab qiladi.

## Ma'lumot modeli (Drizzle + Neon Postgres)

- **users** — id, ism, email (ixtiyoriy — provayderdan kelmasligi mumkin, masalan
  Telegram), avatar url, yaratilgan sana
- **accounts** — Auth.js standart jadvali: user_id, provider (`google`/`github`/
  `telegram`), provider_account_id, tokenlar (shifrlangan). Unique constraint:
  (provider, provider_account_id)
- **sessions** — user_id, session_token, qurilma/brauzer (user-agent parsing),
  ip_address, oxirgi_faollik, yaratilgan_sana, muddati
- **organizations** — id, nomi, soha (enum: do'kon/restoran/ta'lim/ko'chmas mulk/boshqa),
  yaratilgan_sana
- **memberships** — user_id, organization_id, rol (`owner`/`admin`/`member`)
- **invites** — organization_id, email, token, rol, holat (`pending`/`accepted`/
  `expired`), yaratilgan_sana, taklif_qilgan_user_id

## Oqimlar

### 1. Kirish/ro'yxatdan o'tish
`/sign-in`da 3ta OAuth tugma: Google, Telegram, GitHub. Birinchi marta kirilganda `users`
yozuvi avtomatik yaratiladi (worken.ru'dagidek — alohida signup shakli yo'q). Telegram
provayderi maxsus: Telegram Login Widget mijoz tomonida HMAC-imzolangan ma'lumot
qaytaradi, server `TELEGRAM_BOT_TOKEN` yordamida imzoni tekshiradi (`lib/auth/providers/
telegram.ts`).

### 2. Onboarding (birinchi kirishdan keyin)
Foydalanuvchining hech qanday `membership`si yo'q bo'lsa → `/onboarding`ga redirect:
tashkilot nomi + soha tanlash (wizard, 1 qadam) → muvaffaqiyatli yaratilgach ixtiyoriy
"Jamoa a'zolarini taklif qiling" qadami (email ro'yxati, o'tkazib yuborish mumkin) →
`/dashboard`ga yo'naltiriladi.

### 3. Linked accounts (`/settings/accounts`)
Ulangan provayderlar ro'yxati + "Provider qo'shish" tugmalari (ulanmagan provayderlar
uchun). Oxirgi provayderni unlink qilishga urinilsa server 400 qaytaradi: "Kamida bitta
ulanish qolishi kerak."

### 4. Faol sessiyalar (`/settings/sessions`)
Joriy foydalanuvchining barcha faol sessiyalari: qurilma/brauzer, taxminiy joylashuv
(IP asosida, aniq geolokatsiya emas), oxirgi faollik vaqti. Joriy sessiya "Bu qurilma"
deb belgilanadi. "Chiqish" (bitta session) va "Boshqa hamma joydan chiqish" (joriydan
tashqari hammasini bekor qilish) tugmalari.

### 5. Jamoa taklifi (`/settings/team`)
Owner/admin email orqali taklif yuboradi → `invites` yozuvi + email xabari (Resend yoki
shunga o'xshash — aniq provayder Phase 2b'da billing bilan birga hal qilinadi, hozircha
interfeys tayyor, yuborish stub/log qilinishi mumkin). Taklif havolasi bosilganda: user
mavjud bo'lsa to'g'ridan-to'g'ri `membership` yaratiladi, mavjud bo'lmasa avval
`/sign-in`ga, muvaffaqiyatli kirgach avtomatik qo'shiladi.

### 6. Kabinet skeleton
`(dashboard)/layout.tsx` — worken.ru IA'siga mos, lekin TayanchAI roadmapiga moslashtirilgan
bo'sh navigatsiya: **AI Xodimlar** (Phase 3), **Suhbatlar** (Phase 3), **Bilim bazasi**
(Phase 3), **Integratsiyalar** (Phase 4-5), **Statistika** (Phase 6) — hammasi Phase 2'da
"Tez orada" belgisi bilan disabled holatda ko'rinadi, faqat **Sozlamalar** (Accounts/
Sessions/Team) va bosh sahifa (bo'sh holat + "AI xodim ijaraga olish" CTA — hali ishlamaydi,
Phase 3'ga signal) ishlaydi. Yuqorida tashkilot almashtirgich (agar user bir nechta
tashkilotga a'zo bo'lsa), pastda foydalanuvchi menyusi (profil, chiqish).

## Vizual yo'nalish (minimalizm — worken.ru uslubida, TayanchAI brendida)

- worken.ru'ning qorong'i-birinchi, ixcham sidebar, yupqa border, keng bo'sh joy,
  kam-ikonka minimalizmi umumiy yo'nalish sifatida olinadi
- Lekin accent rang worken'ning apelsinidan farqli — loyihada allaqachon belgilangan
  brend rangi (`--brand`, och/qorong'i temada teal-yashil ton) ishlatiladi, shunday qilib
  kabinet marketing sayt bilan bir xil brend tizimida qoladi va worken'dan vizual
  ajralib turadi
- shadcn `sidebar` primitivi yangi qo'shiladi (`npx shadcn add sidebar`), mavjud
  `--sidebar-*` CSS o'zgaruvchilari (`globals.css`da allaqachon bor) shu primitiv uchun
  ishlatiladi
- Aniq spacing/tipografiya darajasidagi qarorlar implementatsiya vaqtida frontend-design
  skill orqali ishlab chiqiladi — bu spec faqat yo'nalish va tarkibni belgilaydi

## Xatoliklarni boshqarish

- OAuth provayder xatosi/rad etilishi → `/sign-in?error=...`, aniq uz/ru/en xabar
- Telegram HMAC tekshiruvi muvaffaqiyatsiz → 401, urinish Vercel loglarida qayd etiladi
- Oxirgi provayderni unlink qilish urinishi → 400, frontend'da tushuntirish bilan
  bloklangan tugma holati
- Muddati o'tgan/allaqachon ishlatilgan invite token → aniq xabar + "yangi taklif so'rash"
  havolasi (owner'ga signal)
- Onboarding tugallanmasdan `/dashboard`ga to'g'ridan-to'g'ri kirishga urinilsa →
  middleware `/onboarding`ga redirect qiladi

## Test strategiyasi

- Unit: Telegram HMAC tekshiruv logikasi, "oxirgi provayderni unlink qilib bo'lmaydi"
  cheklovi, invite token validatsiyasi (muddat/holat)
- Integration: to'liq sign-in → onboarding → tashkilot yaratish → dashboard oqimi (test
  DB bilan, OAuth provayderlar mock qilinadi)
- Playwright: sign-in sahifa smoke test (provayder tugmalari ko'rinadi, 3 tilda matn),
  onboarding wizard bosqichlari, settings/accounts va settings/sessions sahifalarining
  asosiy holatlari
- Implementatsiya tugagach qo'lda tekshirish: haqiqiy Google/GitHub/Telegram OAuth orqali
  kirish, akkaunt ulash/uzish, sessiyani masofadan bekor qilish, jamoa taklifini
  qabul qilish — barchasi 3 tilda

## Ochiq savollar / keyingi bosqichda hal qilinadi

- Taklif email'larini yuborish provayderi (Resend va h.k.) — Phase 2b'da billing
  infratuzilmasi bilan birga tanlanadi; hozircha stub/log bilan ishlaydi
- Aniq vizual dizayn (ranglar nuance'lari, animatsiyalar, spacing) — implementatsiya
  paytida frontend-design skill orqali
- Middleware'dagi locale+auth birgalikda ishlash tafsilotlari (mavjud `src/proxy.ts`
  next-intl middleware'ga Auth.js middleware'ni qo'shish) — implementatsiya rejasida
  aniqlashtiriladi
