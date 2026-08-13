# Worken parity Phase D — `/assistants/:id` to'liq tahrirlash sahifasi

## Kontekst

CLAUDE.md roadmap'ida worken.ru bilan 1:1 parity dasturi (2026-08-12) A-C
fazalarni tugatgan (shell, marketing sayt, 13 dashboard sahifasi). Ataylab
qurilmagan yagona bo'lim — `/assistants/:id` (assistant tahrirlash) —
worken'da `/bots/:id` nomi bilan alohida ulkan sahifa, o'zi alohida mahsulot
darajasida murakkab.

Hozirgi Arioo holati (`src/app/[locale]/(dashboard)/assistants/[agentId]/`):
oddiy bitta forma — `name`/`role`/`systemPrompt`/`model` + `<ToolsPanel/>`
(placeholder, hamma tool disabled). `chat/page.tsx` — playground test-chat.
`knowledge/page.tsx` — bilim bazasi hujjatlari yuklash/ro'yxat.

Worken.ru'ning haqiqiy `/bots/:id` sahifasi (2026-08-13'da Chrome orqali
qayta ko'rib chiqilgan, foydalanuvchining haqiqiy akkaunti bilan) **tab
emas** — bitta uzun scroll-sahifa, 4 ta katta bo'lim: **AI → Чаты → Звонки →
Базы знаний**, ~20+ sozlama bloki. Foydalanuvchi bu safar Arioo'da **haqiqiy
tab komponenti (URL bilan)** ishlatishni tanladi — worken'nikidan farqli,
ishlatish qulayroq bo'lgani uchun.

Maqsad: shu 4 bo'limni Arioo'da tab sifatida, real DB'ga saqlanadigan
sozlamalar bilan qurish. Tashqi infratuzilma (SIP, TTS provider) talab
qiladigan **harakat tugmalari** disabled/"Tez orada" qoladi — CLAUDE.md'da
A-C fazalarda allaqachon tasdiqlangan naqsh — lekin sozlamalarning o'zi
haqiqiy formalar bo'lib, DB'ga yoziladi.

## Doira (scope)

Ichida:
- `assistants/[agentId]/layout.tsx` — umumiy header + tab-navigatsiya.
- 4 ta tab: `ai`, `chats`, `calls`, `knowledge` — har biri alohida route.
- Yangi DB jadvallar/ustunlar (pastda).
- Har bir tab uchun server action(lar) — mavjud `updateAgentAction`,
  `uploadKnowledgeDocumentAction` naqshiga mos.

Tashqarida (keyingi bosqichlarga qoldiriladi):
- Haqiqiy SIP/telefoniya ulanishi, TTS audio ishlab chiqarish — Phase 4/5.
- Integratsiya OAuth (AmoCRM, Bitrix24, 1C, Google, Avito) — Phase 5, faqat
  Tools bo'limida statik ro'yxat sifatida ko'rsatiladi (integratsiya
  ulanmagan holatda hammasi disabled, xuddi worken'da bo'lgani kabi).
- Semantic memory/RAG isolation'ning haqiqiy runtime logikasi — sozlama
  saqlanadi, lekin `src/lib/ai/retrieval.ts` uni hali to'liq qo'llamaydi
  (keyingi bosqichda ulanadi).

## Ma'lumotlar modeli

Mavjud kichik-jadval uslubiga mos (`src/db/schema/agents.ts`,
`approvals.ts` naqshi): `aiAgents`ga AI-core ustunlari qo'shiladi + 3 ta
yangi 1:1 jadval. O'zgaruvchan ro'yxatlar uchun `jsonb` (`approvals.ts`da
bor naqsh).

### `aiAgents` (agents.ts) — yangi ustunlar
```
topP: real (nullable)
temperature: real (nullable)
maxTokens: integer (nullable)
readOnlyMode: boolean default false
recentMessagesCount: integer default 20
autoTitleGeneration: boolean default true
semanticSearchEnabled: boolean default false
memoryIsolation: pgEnum("agent_memory_isolation", ["user", "thread"]) default "user"
memoryTemplateMode: pgEnum("agent_memory_template_mode", ["freeform", "schema"]) default "freeform"
memoryTemplate: text (nullable)
removeEmojis: boolean default false
removeMarkdown: boolean default false
interruptionMode: pgEnum("agent_interruption_mode", ["queue", "abort_restart", "drop_restart"]) default "queue"
maxStepsWithoutTools: integer default 1
maxStepsWithTools: integer default 8
```

### Yangi jadval: `agent_chat_settings` (chat-settings.ts, 1:1 agentId bilan)
```
id, agentId (FK, unique, cascade)
description: text (nullable)
greetingMessage: text (nullable)
replyDelaySeconds: integer default 0
timezone: text (nullable)
voiceReaction: pgEnum("agent_voice_reaction", ["none", "reply_text", "reply_voice"]) default "none"
textReaction: pgEnum("agent_text_reaction", ["reply_text"]) default "reply_text"
ttsVoice: text default "alloy"
ttsModel: text default "tts-1"
voiceReactionText: text (nullable)
limitsEnabled: boolean default false
limitType: pgEnum("agent_limit_type", ["messages", "tokens", "workens"]) (nullable)
limitValue: integer (nullable)
limitMessage: text (nullable)
stopWordRules: jsonb default '[]' — [{ word: string, action: "block"|"flag" }]
operatorTrigger: pgEnum("agent_operator_trigger", ["keep_going", "pause"]) default "keep_going"
pauseDurationMinutes: integer default 5
createdAt, updatedAt
```

### Yangi jadval: `agent_call_policy` (call-policy.ts, 1:1 agentId bilan)
```
id, agentId (FK, unique, cascade)
enabled: boolean default false
direction: pgEnum("agent_call_direction", ["inbound", "outbound", "both", "off"]) default "off"
windowTimezoneMode: pgEnum("agent_call_window_tz", ["same_as_chat", "custom"]) default "same_as_chat"
windowStart: text (nullable) -- "10:00"
windowEnd: text (nullable) -- "19:00"
offWindowBehavior: pgEnum("agent_off_window_behavior", ["reject", "voicemail_task"]) default "reject"
requireExistingThread: boolean default true
respectDnc: boolean default true
maxAttempts: integer (nullable)
attemptsPeriodDays: integer (nullable)
recordingMode: pgEnum("agent_recording_mode", ["off", "record", "record_announce"]) default "record_announce"
disclosureScript: text (nullable)
maxDurationMinutes: integer default 20
maxParallelLines: integer default 2
sipIntegrationRef: text (nullable) -- keyingi bosqichda integrations jadvaliga FK bo'ladi
outboundDid: text (nullable)
lineInstruction: text (nullable)
callModel: text default "gpt-realtime"
callVoice: text default "alloy"
defaultMode: pgEnum("agent_call_mode", ["supervised", "autonomous"]) default "supervised"
maxActionsPerReply: integer default 5
toolsMode: pgEnum("agent_call_tools_mode", ["as_in_ai"]) default "as_in_ai"
confirmationMode: pgEnum("agent_call_confirmation", ["always", "per_tool", "read_only"]) default "always"
saveSummaryToThread: boolean default true
syncCrm: boolean default false
escalationTarget: text (nullable)
escalationTriggerWords: jsonb default '[]' -- string[]
createdAt, updatedAt
```

### Yangi jadval: `agent_knowledge_settings` (knowledge-settings.ts, 1:1)
```
id, agentId (FK, unique, cascade)
embeddingModel: text default "text-embedding-3-small"
relevanceThreshold: real default 0.85
maxResults: integer default 10
maxContextTokens: integer default 4000
aggregationStrategy: pgEnum("agent_knowledge_aggregation", ["merge", "priority"]) default "merge"
createdAt, updatedAt
```

Har 3 yangi jadval uchun `requireAgent`dan keyin "get or create default row"
pattern (birinchi marta ochilganda default qiymatlar bilan yaratiladi) —
`src/lib/agents/`ga har bo'lim uchun kichik helper (`getOrCreateChatSettings`
va h.k.).

## Route/UI tuzilishi

```
assistants/[agentId]/
  layout.tsx        -- header (nom, "CHANNELS: ulanmagan", Connect/Test) + Tabs nav
  ai/page.tsx        -- joriy forma + Core settings/Response formatting/
                         Agent interruption/Agent steps
  ai/actions.ts       -- updateAgentAction kengaytiriladi
  chats/page.tsx      -- YANGI: profil/greeting/voice/limits/triggers
  chats/actions.ts    -- YANGI: updateChatSettingsAction
  calls/page.tsx      -- YANGI: SIP call policy
  calls/actions.ts    -- YANGI: updateCallPolicyAction
  knowledge/page.tsx  -- mavjud mazmun (upload/list) + Basic settings/
                         Search-context bloklari, tab ichiga ko'chadi
  knowledge/actions.ts -- mavjud + updateKnowledgeSettingsAction qo'shiladi
  chat/page.tsx       -- O'ZGARMAYDI: playground test-chat, tab EMAS,
                         header'dagi "Test" tugmasi shu route'ga olib boradi
```

`/assistants/[agentId]` (indeks) — `/ai`ga redirect.

`layout.tsx` — server component, `requireAgent` chaqiradi, `<Tabs>` (mavjud
`src/components/ui/tabs.tsx`) orqali 4 ta link (`ai`/`chats`/`calls`/
`knowledge`), joriy segment `usePathname`/`selectedLayoutSegment` bilan
aniqlanadi. Header'da agent nomi, "CHANNELS: ulanmagan" statik matn (Phase 4
integratsiyalari ulanguncha), "Connect" (disabled, "Tez orada") va "Test"
(mavjud `chat/`ga link) tugmalari.

Har bir tab sahifasi mavjud naqshga mos: server component, `requireAgent`,
`getTranslations`, `<form action={...}>` bilan server action chaqiradi,
`revalidatePath`. Tashqi infra talab qiluvchi maydonlar (SIP connector
tanlash, "Test call" tugmasi) `disabled` + `t("comingSoon")` badge bilan —
`ToolsPanel`dagi mavjud naqsh (`opacity-60`, "Tez orada" badge).

## i18n

Har bir tab uchun `messages/{en,ru,uz}.json`da `assistants.detail.ai`,
`assistants.detail.chats`, `assistants.detail.calls`,
`assistants.detail.knowledge` ostida kalitlar — mavjud
`assistants.detail.tools`/`assistants.knowledge` naqshiga mos.

## Testlash

- Vitest: `src/db/schema/*.ts` uchun yangi jadvallar migratsiya
  (`drizzle-kit generate`) orqali tekshiriladi (build/typecheck yetarli,
  alohida unit test kerak emas — sxema fayllari test qilinmaydi, mavjud
  repo naqshiga mos).
- Har bir yangi server action uchun mavjud naqshga mos oddiy validatsiya
  (zod) — `src/lib/agents/schema.ts`ga har bo'lim uchun kichik schema
  qo'shiladi (`chatSettingsSchema`, `callPolicySchema`,
  `knowledgeSettingsSchema`) va **unit test** yoziladi (`schema.test.ts`
  naqshiga mos — mavjud `agents/schema.test.ts` bor).
- `npm run lint`, `npm run test` (Vitest) — har band tugagach.
- `run` skill orqali dev serverda: assistant yaratib, 4 ta tab'ni ochib,
  har birida forma to'ldirib saqlash, sahifani qayta yuklab qiymatlar
  saqlanganini tekshirish; worken.ru bilan vizual solishtirish (pixel-level
  parity emas, tarkib/oqim parity — chunki tab tuzilishi ataylab farq
  qilishga kelishildi).
- Mavjud `tests/e2e/assistants.spec.ts`ni yangi tab-navigatsiyaga moslab
  kengaytirish (agent yaratish → 4 tabni almashtirish → saqlash oqimi).

## Amalga oshirish tartibi (writing-plans uchun asos)

1. DB sxema: 3 yangi jadval + `aiAgents` kengaytmasi, drizzle migration.
2. `src/lib/agents/schema.ts`ga yangi zod sxemalar + testlar.
3. `layout.tsx` + tab-navigatsiya + i18n kalitlar skeleton.
4. `ai/` tabi (mavjud forma migratsiyasi + yangi bloklar).
5. `chats/` tabi (yangi, to'liq).
6. `calls/` tabi (yangi, to'liq).
7. `knowledge/` tabi (mavjud mazmun ko'chirish + yangi bloklar).
8. E2E test yangilash, CLAUDE.md roadmap checkbox yangilash.
