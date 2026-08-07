# TayanchAI — Bosqich 3: AI agent yadrosi

Status: Approved
Sana: 2026-08-07

## Maqsad

Bu spec Phase 3'ni qamrab oladi: AI xodim (agent) yaratish, bilim bazasi bilan
boyitish, ichki test/playground chat orqali sinash, human-in-the-loop tasdiqlash
navbati va har suhbat/model bo'yicha xarajat ko'rsatish. Bu worken.ru'ning
autentifikatsiyalangan panelidagi agent-builder qismiga (CLAUDE.md'dagi "Raqobatchi
chuqur tahlili" bo'limida qayd etilgan) parallel, lekin TayanchAI roadmapiga moslashtirilgan.

Doiradan tashqarida: haqiqiy tashqi kanallar (Telegram/WhatsApp/sayt vidjeti — Phase 4),
real integratsiyalar (Phase 4-5), kredit-asosidagi to'lov valyutasi va checkout (Phase 2b).

## Qamrov qarorlari (brainstorming davomida tasdiqlangan)

- **Tools paneli**: worken.ru'dagi integratsiya guruhlari vizual ko'rinadi, lekin
  barchasi "Tez orada" holatida disabled — funksional emas. Integratsiyalar
  Phase 4-5'da ulanganda shu joy faollashadi.
- **AI model**: Vercel AI Gateway orqali `"provider/model"` satr formatida (masalan
  `anthropic/claude-sonnet-4.5`) — xarajat nazorati va fallback o'rnatilgan holda keladi.
- **Bilim bazasi**: Vercel Blob (fayl saqlash) + Neon Postgres pgvector (embedding
  qidiruv) — CLAUDE.md'dagi "fayl→Blob→embedding" rejasiga mos.
- **Suhbat kanali**: Phase 3'da faqat ichki test/playground chat (kabinet ichida).
  Tashqi kanallar ulanganda (Phase 4) xuddi shu chat-engine ular uchun ham ishlaydi.
- **Xarajat kuzatuvi**: to'liq kredit/billing valyuta tizimi emas (bu Phase 2b), balki
  har xabar uchun token ishlatilishi va taxminiy USD xarajati saqlanadi/ko'rsatiladi —
  Phase 2b'dagi kredit tizimi ustiga keyinroq qurilishi mumkin bo'lgan yengil infratuzilma.

## Arxitektura

```
src/app/[locale]/(dashboard)/
  assistants/
    page.tsx                    # AI xodimlar ro'yxati; bo'sh holat → "Yaratish" CTA
    new/page.tsx                 # Yaratish ustasi: rol → soha shabloni → tizim prompti → model
    [agentId]/
      page.tsx                   # Agent sozlamalari: nomi, tizim prompti, model, holat
      knowledge/page.tsx          # Bilim bazasi fayllari: yuklash, ro'yxat, indekslash holati, o'chirish
      chat/page.tsx               # Ichki playground chat (streaming)
      actions.ts                  # Server actions: agent CRUD, fayl yuklash triggeri
  approvals/
    page.tsx                     # Human-in-the-loop navbat: kutmoqda/tasdiqlangan/rad/avto-hal/muddati o'tgan
    actions.ts                   # approve/reject server actions

src/db/schema/
  agents.ts
    ai_agent: id, organizationId, role (enum: sales/support/hr/marketing),
      name, systemPrompt, model, status (enum: draft/active), createdAt
  knowledge.ts
    knowledge_document: id, agentId, blobUrl, filename, mimeType,
      status (enum: processing/ready/error), createdAt
    knowledge_chunk: id, documentId, content, embedding (vector(1536)), createdAt
  conversations.ts
    conversation: id, agentId, channel (enum: playground), startedAt
    message: id, conversationId, role (enum: user/assistant/system), content,
      tokenCount, estimatedCostUsd, createdAt
  approvals.ts
    approval: id, agentId, conversationId (nullable), type, payload (jsonb),
      status (enum: pending/approved/rejected/auto_resolved/expired),
      createdAt, resolvedAt, resolvedByUserId (nullable)

src/lib/ai/
  gateway.ts          # AI Gateway model ro'yxati + resolver
  knowledge-embed.ts   # fayl matnini chunk'larga bo'lish + embedding hisoblash pipeline
  chat-engine.ts        # AI SDK streamText, tool-calling skeleton, bilim bazasi retrieval,
                         # token/cost hisoblash, approval trigger nuqtasi (hozircha bo'sh tool
                         # to'plami bilan — Phase 4-5'da real tool'lar ulanganda ishlatiladi)
```

**Nega bu tuzilma:** mavjud `(dashboard)` route group konvensiyasiga mos (Phase 2a'dagi
sidebar allaqachon "AI Xodimlar" va "Suhbatlar" punktlarini "Tez orada" holatida
ko'rsatib turibdi — bu bosqich ularni faollashtiradi). `assistants/[agentId]` ostida
knowledge/chat alohida sahifalar — har biri bitta aniq maqsadga ega, alohida test
qilinadi. `lib/ai/` server-only modul sifatida chat-engine va embedding logikasini
UI'dan ajratadi.

## Ma'lumot modeli qo'shimchalari

Yuqoridagi jadvallarga qo'shimcha: Neon'da `pgvector` extension yoqiladi (`CREATE
EXTENSION IF NOT EXISTS vector`), `knowledge_chunk.embedding` ustuni HNSW yoki IVFFlat
indeks bilan qidiriladi (drizzle-orm pgvector qo'llab-quvvatlashi orqali).

## Oqimlar

### 1. Agent yaratish ustasi (`/assistants/new`)
Rol tanlanadi (sotuv/qo'llab-quvvatlash/HR/marketing) → tashkilot sohasiga
(organization.industry) mos tayyor tizim-prompt shabloni taklif qilinadi (tahrirlash
mumkin) → model AI Gateway ro'yxatidan tanlanadi → agent `draft` holatida yaratiladi →
`/assistants/[agentId]`ga yo'naltiriladi.

### 2. Bilim bazasi (`/assistants/[agentId]/knowledge`)
Fayl (pdf/docx/txt, hajm cheklovi bilan) Vercel Blob'ga yuklanadi → server action
matnni ajratib oladi → chunk'larga bo'linadi → AI Gateway embedding modeli orqali
vektorlarga aylantiriladi → `knowledge_chunk`ga yoziladi → hujjat holati `ready`ga
o'tadi. Xato bo'lsa holat `error`, "Qayta urinish" tugmasi ko'rinadi.

### 3. Playground chat (`/assistants/[agentId]/chat`)
Foydalanuvchi xabar yozadi → `chat-engine` tizim prompti + bilim bazasidan eng yaqin
chunk'larni (top-k) retrieval qilib kontekstga qo'shadi → AI SDK `streamText` orqali
javob striming qilinadi → har xabar uchun token soni va taxminiy xarajat (USD)
saqlanadi va UI'da ko'rsatiladi.

### 4. Tools paneli (`/assistants/[agentId]` sahifasida bo'lim)
worken.ru'dagi integratsiya guruhlari (masalan "Ichki tizim", "Google Sheets/Drive")
statik ro'yxat sifatida ko'rsatiladi, hammasi disabled + "Tez orada" belgisi bilan.

### 5. Approvals (`/approvals`)
Hozircha trigger manbai yo'q (real tool-chaqiruvlar Phase 4-5'da), lekin jadval,
server action'lar (`approveAction`/`rejectAction`) va UI to'liq tayyorlanadi — keyingi
bosqichlarda tool-calling shu infratuzilmaga ulanadi. Bo'sh holatda "Hozircha
tasdiqlash kutayotgan harakatlar yo'q" ko'rsatiladi.

## Xatoliklarni boshqarish

- Fayl formati/hajmi noto'g'ri → yuklashda darhol frontend validatsiyasi + xabar
- Embedding pipeline xatosi → hujjat holati `error`, log qilinadi, qayta urinish tugmasi
- Chat streaming xatosi (AI Gateway timeout/xato) → foydalanuvchiga "Javob olishda
  xatolik, qayta urinib ko'ring" xabari, xabar saqlanmaydi
- Bo'sh bilim bazasi bilan chat → agent faqat tizim prompti asosida javob beradi
  (retrieval bosqichi shunchaki bo'sh natija qaytaradi, xato emas)

## Test strategiyasi

- Unit: model resolver (`gateway.ts`), chunk bo'lish logikasi, approval status
  o'tishlari (pending→approved/rejected), token/cost hisoblash formulasi
- Integration: agent yaratish → fayl yuklash → embedding (AI Gateway chaqiruvlari mock
  qilinadi) → playground chatda javob olish (test DB bilan)
- Playwright: wizard bosqichlari (rol→shablon→model), bo'sh holatlar (agentlar
  ro'yxati, approvals navbati), bilim bazasi yuklash UI holatlari
- Implementatsiya tugagach qo'lda tekshirish: haqiqiy AI Gateway orqali agent yaratish,
  real fayl yuklab bilim bazasini sinash, playground chatda savol-javob, xarajat
  ko'rsatkichining to'g'riligini tekshirish — barchasi 3 tilda

## Ochiq savollar / keyingi bosqichda hal qilinadi

- Real tool-calling va approval trigger'lari — Phase 4-5'da integratsiyalar
  ulanganda aniqlashtiriladi
- Kredit-asosidagi to'liq billing (xarajatni "TAY" valyutasiga konvertatsiya
  qilish, balansdan yechish) — Phase 2b
- Soha shablonlari matnining aniq tarkibi (har bir sohaning tayyor system prompt
  matni) — implementatsiya paytida ishlab chiqiladi, bu spec faqat mexanizmni belgilaydi
