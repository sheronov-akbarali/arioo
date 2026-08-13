# worken.ru Parity — Phase C, Group 6: Settings Pages — Design

Sahifalar: `/settings/project`, `/settings/team`, `/settings/limits`,
`/settings/accounts` (umumiy `settings/layout.tsx` orqali).

## Kontekst

Worken.ru'ning `/settings` sahifasi 2026-08-13'da qayta ko'rib chiqildi:
tab tuzilishi ko'rindi — "Проект"/"Пользователи"/"Лимиты" (Loyiha/
Foydalanuvchilar/Limitlar), aynan Arioo'ning `project`/`team`/`limits`
tab'lariga mos keladi (Arioo'da qo'shimcha 4-tab — "Akkauntlar" — Clerk
autentifikatsiyasiga xos, worken'da yo'q, chunki worken boshqa auth tizimi
ishlatadi; bu farq saqlanadi). **Biroq har uchala tab ichidagi kontent
paneli test hisobida bo'sh bo'lib chiqdi** (worken tomonidagi holat yoki
cheklov, tafsilotlarni ko'rish imkonsiz bo'ldi). Shuning uchun bu guruh
worken screenshot'lariga pixel-aniqlikda moslashish o'rniga, **Arioo'ning
o'z ichida C-bosqichda o'rnatilgan dizayn tilini** (sarlavha ikonkasi,
status-badge) settings bo'limiga izchil qo'llashga qaratiladi — bu ham
CLAUDE.md'ning "taksonomiya moslashtirish" maqsadiga xizmat qiladi, chunki
hozir settings sahifalari C-bosqichda jilolangan boshqa 13 sahifadan
yagona sarlavha-ikonkasiz qolgan bo'lim.

## Sahifa-ma-sahifa o'zgarishlar

### 1. `settings/layout.tsx` (barcha 4 tab uchun umumiy sarlavha)

- Sarlavha oldiga rangli kvadrat ichida `Settings` (lucide) ikonkasi
  qo'shiladi — boshqa 13 sahifada allaqachon o'rnatilgan pattern bilan bir
  xil (`flex items-start gap-3` → ikonka-kvadrat → `<h1>`/`<p>`).
- Tab navigatsiyasi (`SettingsTabs`) o'zgarmaydi.

### 2. `/settings/team`

- Har bir a'zo qatoriga oddiy "— role" matni o'rniga rangli `Badge`
  qo'shiladi (worken'ning boshqa sahifalarida status uchun ishlatilgan
  `Badge` patterniga mos, masalan `/products`dagi holat-badge'lari).
  `owner`/`admin` uchun `default` variant, `member` uchun `outline`.
- Kutilayotgan takliflar ustidagi qator soni ko'rsatiladi (masalan "3 ta
  a'zo").

### 3. `/settings/limits`, `/settings/project`, `/settings/accounts`

- Alohida o'zgarish yo'q — umumiy layout'dagi sarlavha ikonkasi orqali
  allaqachon jilolanadi. Ichki tarkib (progress-bar'lar, forma, Clerk
  `<UserProfile/>`) o'zgarmaydi.

## Testing

- `messages/messages.test.ts` orqali yangi tarjima kaliti (a'zolar soni
  matni) uch tilda tekshiriladi.
- Qo'lda tekshirish: dev server'da 4 sahifani bo'sh va to'ldirilgan holatda
  ko'rib chiqish — avtorizatsiya talab qilingani sababli foydalanuvchi
  o'zi tasdiqlashi mumkin, avvalgi guruhlardagi kabi.

## Out of scope

- Worken'ning `/settings` ichki kontentini pixel-aniqlikda takrorlash —
  bu ma'lumot audit paytida olinmadi (bo'sh panel).
- A'zoni o'chirish/rolini o'zgartirish kabi yangi funksiyalar — mavjud
  `team/actions.ts`da faqat taklif yuborish bor, boshqarish funksiyalari
  yangi backend amal talab qiladi.
