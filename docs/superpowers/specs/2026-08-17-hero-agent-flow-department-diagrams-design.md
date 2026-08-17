# Hero agent-flow diagrammasi — bo'lim-asosli tuzilma + interaktiv node'lar

Sana: 2026-08-17
Holat: tasdiqlangan, implementatsiya rejasi kutilmoqda

## Muammo

Landing sahifadagi hero diagrammasi (`src/components/marketing/agent-flow-panel.tsx`)
worken.ru'ning autentifikatsiyalangan Chrome sessiyasida chuqur o'rganildi (SVG DOM'dan
animatsiya parametrlari, node click xatti-harakatlari to'g'ridan-to'g'ri ajratib olindi).
Joriy holat oldingi iteratsiyada (shu kunda, ushbu spec'dan oldin) animatsiya sifati va
window-chrome ramkasi jihatidan yaqinlashtirilgan edi, lekin ikkita muhim jihatda hali
worken'dan orqada:

1. **Barcha 4 bo'lim (Sotuv/Support/HR/Marketing) bitta umumiy diagramma tuzilishini
   baham ko'radi** — faqat markaziy AI node label'i o'zgaradi. Worken'da har bo'lim
   butunlay boshqa manba/tizim to'plami, guruh sarlavhalari va tavsif matniga ega.
2. **Node'lar bosilmaydi.** Worken'da manba node'siga bosilsa kichik namuna-elementlar
   (masalan nomzod ismlari) oqib chiqadi; tizim node'siga bosilsa ulanish/konfiguratsiya
   paneli (URL, token, tool-toggle'lar) ochiladi.

Foydalanuvchi talabi: worken.ru'dagi kabi **to'liq, ideal** ishlaydigan diagramma —
barcha 4 bo'limga o'tib, hamma joyga bosib ko'rilganda ham xuddi shunday professional
tajriba.

## Worken.ru'da DOM orqali tasdiqlangan faktlar

- Sales bo'limi: manbalar guruhlanmagan ("Sources": Website/Telegram/Avito) + alohida
  "Calls" guruhi (Zoom/SIP) — jami 5 manba. Tizimlar: MCP/CRM/Scripts (3 ta).
- HR bo'limi: manbalar "Applications" guruhi (HH.ru/Telegram/Website) + "Interviews"
  guruhi (Zoom/SIP) — jami 5 manba. Tizimlar: MCP/ATS/Guides (3 ta), guruh sarlavhasi
  "HR-системы".
- Diagramma tepasida har bo'lim uchun alohida tavsif jumlasi + 3 ta "chip" (masalan HR:
  Applications/Screening/ATS) — bo'lim almashganda matn ham almashadi.
- Chiziqlar: `stroke-dashoffset` 0→-32, 1.2s, linear, indefinite — uzluksiz oqadi
  (faqat faol chiziqda emas, barchasida; faol chiziq rang/qalinlik bilan ajraladi).
- Node ikonka nuqtasi: doimiy "breathing" pulsatsiya (r 8→11→8, opacity 1→0.6→1, ~0.45s).
- Faollashganda: rect border 6px tashqariga kengayib fade bo'ladigan bir martalik ripple
  (0.5s), JS orqali (`beginElement()`) trigger qilinadi — bizda buni React `key`
  remount orqali SMIL/CSS animatsiyani qayta ishga tushirish bilan allaqachon qilamiz.
- **Manba node'ga klik** (masalan HH.ru): node yonida 1-2 ta kichik "chip" (nomzod ismi
  kabi) chapga/yon tomonga oqib chiqadi — qisqa, dekorativ flourish.
- **Tizim node'ga klik** (masalan MCP): diagramma ostida karta ochiladi — "CONNECTION"
  bo'limi (URL, "Bearer sk-••••••mcp" — maskalangan), "REMOTE TOOLS" ro'yxati (nom +
  tavsif + yoqish/o'chirish toggle, masalan `calendar.slots.list`, `calendar.book`).
  Yopish tugmasi (×) bilan yopiladi.

## Nima nusxalanmaydi (ataylab)

- Worken'ning butun diagrammasi bitta qo'lda chizilgan SVG illyustratsiya (SMIL
  `<animate>` bilan, matn ham SVG ichida). Bizniki React/Tailwind kartalar + SVG
  chiziqlar bo'lib qoladi — i18n (3 til), tema (light/dark) va accessibility uchun
  to'g'ri arxitektura. Vizual/animatsion natija bir xil, texnika farqli.
- Node kontenti (Avito, HH.ru, Zoom, SIP kabi Arioo'da yo'q integratsiyalar) —
  Arioo'ning haqiqiy kanallari (Website/Telegram/WhatsApp/Qo'ng'iroqlar/CRM/Bilim bazasi)
  saqlanadi, faqat guruhlanish va node soni bo'lim bo'yicha farqlanadi.
- Frame-ma-frame SMIL qiymatlari emas — texnika (dashoffset flow, pulse, ripple,
  flyout, expand panel) bir xil, aniq raqamlar taxminiy moslashtiriladi.

## Muhim tamoyil — soxta ma'lumot bo'lib ko'rinmasligi kerak

CLAUDE.md loyiha printsipiga ko'ra (worken'ning haqiqiy panelida ham xuddi shu sabab
bilan disabled/"Tez orada" tugmalar qoldirilgan edi — soxta muvaffaqiyat holatini
ko'rsatmaslik uchun), `SystemConnectionPanel`dagi URL/token har doim aniq **namuna**
ekanligini bildiradigan tarzda ko'rsatiladi:

- URL doim aniq demo domen: `mcp.demo.arioo.uz` shaklida (haqiqiy Arioo domeniga
  o'xshamaydigan, ammo aniq "demo" so'zini o'z ichiga olgan)
- Token doim `Bearer demo_••••••••` (haqiqiy formatga o'xshamaydigan, "demo" prefiksli)
- Panel yuqorisida kichik "Namuna" badge (`Badge variant="outline"`, mavjud shadcn
  komponenti)
- Tool-toggle'lar **faqat local React state** bilan ishlaydi — hech qanday server
  action, hech narsani saqlamaydi, sahifa yangilanganda boshlang'ich holatga qaytadi

## Data model

Yangi fayl: `src/components/marketing/agent-flow-data.ts` (faqat turlar va
department→struktura xaritasi, kontent i18n orqali keladi):

```ts
type NodeKind = "source" | "system";

type NodeSpec = {
  key: string;               // i18n kalit segmenti, masalan "website"
  icon: LucideIcon;
  colorVar: string;          // CSS custom property nomi, masalan "--chart-1"
  kind: NodeKind;
  sampleChips?: string[];    // faqat kind:"source" — flyout uchun i18n kalitlar
  connectionDemo?: {         // faqat kind:"system"
    urlKey: string;          // i18n kalit (masalan "mcp.demoUrl")
    tools: { nameKey: string; descKey: string; defaultEnabled: boolean }[];
  };
};

type DepartmentFlow = {
  sourceGroups: { headingKey: string; nodes: NodeSpec[] }[];
  systemGroupHeadingKey: string;
  systemNodes: NodeSpec[];
};

const DEPARTMENT_FLOWS: Record<Department, DepartmentFlow> = { ... };
```

`messages/{uz,ru,en}.json`dagi `hero.diagram` bloki kengaytiriladi: har department
uchun `chips` (3 ta), yangilangan `sources`/`systems` guruh sarlavhalari va node
label/sublabel'lari, `sampleChips` matnlari, `connectionDemo` matnlari. Taxminan
40-50 yangi kalit × 3 til.

## Komponent arxitekturasi

- `AgentFlowPanel` — department state + `activeNodeKey` state (qaysi node ochiq).
  Tashqi maydonga bosilganda yoki boshqa node bosilganda `activeNodeKey` yopiladi
  (avvalgi ochiq panel avtomatik yopiladi — bir vaqtda faqat bitta panel ochiq).
- `FlowDiagram` — SVG chiziqlar (mavjud dashoffset-flow texnikasi) + guruhlangan
  node ustunlari, department o'zgarganda guruh sonini/joylashuvini qayta hisoblaydi
  (SOURCE_Y/SYSTEM_Y endi guruh+node soniga qarab dinamik hisoblanadi, statik massiv
  emas).
- `NodeCard` — `role="button"`, `onClick`/`onKeyDown` (Enter/Space) bilan bosiladi,
  `aria-expanded` bilan holatni e'lon qiladi.
- `SourceFlyout` — `kind:"source"` node ochilganda uning yonida kichik chip'lar
  ro'yxati CSS `@keyframes` bilan oqib chiqadi (`fade + translateX`), ~1.5s davomida
  ko'rinadi, avtomatik yopiladi yoki node qayta bosilganda yopiladi.
- `SystemConnectionPanel` — `kind:"system"` node ochilganda diagramma ostida
  kengayib ochiladigan karta (mavjud shadcn `Collapsible`/oddiy conditional render +
  `animate-in slide-in-from-top` — loyihada allaqachon `tw-animate-css` bor).
  "Namuna" badge, URL, token (maskalangan), tool-toggle ro'yxati (`Switch` komponenti,
  agar mavjud bo'lmasa `@/components/ui/switch` shadcn orqali qo'shiladi).

## Xatolarni boshqarish / chekka holatlar

- `prefers-reduced-motion`: flyout/panel ochilishi baribir ishlaydi (bular
  foydalanuvchi harakati natijasi, avtomatik animatsiya emas), lekin oqar
  chiziq/pulse animatsiyalari o'chiriladi (joriy xatti-harakat saqlanadi).
- Mobil (tor ekran): `SystemConnectionPanel` to'liq kenglikda pastda ochiladi,
  diagramma balandligini oshirib yuboradi — `overflow-x: hidden` panel konteynerida
  saqlanadi, layout siljishi uchun `mt-3` bilan joy beriladi.
- Department almashtirilganda ochiq panel/flyout yopiladi (`activeNodeKey` reset).

## Test rejasi

- Mavjud `tsc --noEmit`, Vitest, Playwright marketing e2e (16 test) — barchasi
  o'tishi kerak.
- Yangi Playwright testi: `tests/e2e/marketing.spec.ts`ga qo'shimcha — har 4
  department tab'iga o'tib, bitta source node va bitta system node'ga bosib,
  flyout/panel ko'rinishini tekshirish (kamida 1 ta smoke-test, hammasi emas).
- Chrome orqali qo'lda tekshirish: barcha 4 bo'lim, har birida kamida 1 source + 1
  system node klik, light/dark tema, mobil kenglik.

## Ko'lam chegarasi

Bu spec faqat `src/components/marketing/agent-flow-panel.tsx` va unga bevosita
tegishli yangi fayllar/i18n kalitlarini qamrab oladi. Boshqa marketing sahifa
bo'limlariga (workZones, pricing va h.k.) tegmaydi.
