# worken.ru Parity — Phase C, Group 1: Agent Flow Pages Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring `/assistants`, `/chats`, `/calls`, `/knowledge-bases` visually in line with worken.ru's exact taxonomy (icons, status indicators, stat-card iconography, search inputs) without adding any new backend functionality.

**Architecture:** Each dashboard page stays a server component (data fetching unchanged). Small `"use client"` presentational components are added where interactivity is needed (search-as-you-filter over already-fetched data, copy-to-clipboard). No new DB tables, no new server actions, no new routes.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Tailwind v4, shadcn/ui (`Button`, `Card`, `Badge`, `Input`, `Tabs`), lucide-react icons, next-intl (uz/ru/en), Vitest.

## Global Constraints

- No new functionality beyond visual/taxonomy polish — per `docs/superpowers/specs/2026-08-13-worken-parity-phase-c-group1-agent-flow-design.md`. Buttons requiring third-party infra stay `disabled`.
- All user-visible text ships in `uz` (default), `ru`, `en` — verified by `messages/messages.test.ts` key-parity test.
- Follow existing codebase pattern: no React component test infrastructure exists (no RTL/jsdom) — verification for UI-only changes is `npm run lint`, `npx tsc --noEmit`, `npm run test` (existing suite), and manual dev-server check. Do not introduce new test tooling.
- Client components use `useTranslations` from `next-intl` directly (the app is wrapped in `NextIntlClientProvider` at `src/app/[locale]/layout.tsx:74`) — no need to thread translated strings through props.
- Reuse existing shadcn primitives (`src/components/ui/button.tsx`, `card.tsx`, `badge.tsx`, `input.tsx`, `tabs.tsx`) — do not create parallel styling.

---

### Task 1: Add new translation keys (uz/ru/en)

**Files:**
- Modify: `messages/uz.json`
- Modify: `messages/ru.json`
- Modify: `messages/en.json`
- Test: `messages/messages.test.ts` (existing, no changes needed — it auto-covers new keys)

**Interfaces:**
- Produces: translation keys `assistants.searchPlaceholder`, `assistants.statusLabels.draft`, `assistants.statusLabels.active`, `assistants.copyId`, `assistants.idCopied`, `chats.searchPlaceholder`, `knowledgeBases.searchPlaceholder` — consumed by Tasks 2–5.

- [ ] **Step 1: Add keys to `messages/uz.json`**

Inside the top-level `"assistants"` object (sibling of `"title"`, `"create"`, `"empty"`, `"roles"`, `"new"`, `"detail"`, `"knowledge"`, `"chat"`), add:

```json
"searchPlaceholder": "Nomi bo'yicha qidirish...",
"statusLabels": {
  "draft": "Qoralama",
  "active": "Faol"
},
"copyId": "ID nusxalash",
"idCopied": "Nusxalandi"
```

Inside the top-level `"chats"` object, add:

```json
"searchPlaceholder": "Agent yoki xabar bo'yicha qidirish..."
```

Inside the top-level `"knowledgeBases"` object, add:

```json
"searchPlaceholder": "Fayl nomi bo'yicha qidirish..."
```

- [ ] **Step 2: Add the same keys to `messages/ru.json`**

`"assistants"`:

```json
"searchPlaceholder": "Поиск по названию...",
"statusLabels": {
  "draft": "Черновик",
  "active": "Активен"
},
"copyId": "Скопировать ID",
"idCopied": "Скопировано"
```

`"chats"`:

```json
"searchPlaceholder": "Поиск по агенту или сообщению..."
```

`"knowledgeBases"`:

```json
"searchPlaceholder": "Поиск по имени файла..."
```

- [ ] **Step 3: Add the same keys to `messages/en.json`**

`"assistants"`:

```json
"searchPlaceholder": "Search by name...",
"statusLabels": {
  "draft": "Draft",
  "active": "Active"
},
"copyId": "Copy ID",
"idCopied": "Copied"
```

`"chats"`:

```json
"searchPlaceholder": "Search by agent or message..."
```

`"knowledgeBases"`:

```json
"searchPlaceholder": "Search by filename..."
```

- [ ] **Step 4: Run the key-parity test**

Run: `npm run test -- messages/messages.test.ts`
Expected: PASS (all three locale files have matching key sets)

- [ ] **Step 5: Commit**

```bash
git add messages/uz.json messages/ru.json messages/en.json
git commit -m "i18n: add Phase C group 1 search/status translation keys"
```

---

### Task 2: Shared `ListSearchInput` client component

**Files:**
- Create: `src/components/dashboard/list-search-input.tsx`

**Interfaces:**
- Produces: `ListSearchInput` — a `"use client"` component with props `{ placeholder: string; value: string; onChange: (value: string) => void }`. Renders a `Search`-icon-prefixed `Input` (from `@/components/ui/input`). Controlled component — callers (Tasks 3, 4, 6) own the filter state.

- [ ] **Step 1: Write the component**

```tsx
"use client";

import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

export function ListSearchInput({
  placeholder,
  value,
  onChange,
}: {
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="relative">
      <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="pl-8"
      />
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no new errors from this file (it has no consumers yet, so it must compile standalone).

- [ ] **Step 3: Commit**

```bash
git add src/components/dashboard/list-search-input.tsx
git commit -m "feat(dashboard): add shared ListSearchInput component"
```

---

### Task 3: `/assistants` — avatar, status dot, copy ID, search

**Files:**
- Create: `src/components/dashboard/assistants/copy-id-button.tsx`
- Create: `src/components/dashboard/assistants/assistant-card.tsx`
- Create: `src/components/dashboard/assistants/assistants-grid.tsx`
- Modify: `src/app/[locale]/(dashboard)/assistants/page.tsx`

**Interfaces:**
- Consumes: `ListSearchInput` (Task 2), `aiAgents` row shape `{ id: string; name: string; role: "sales"|"support"|"hr"|"marketing"; status: "draft"|"active" }` (from `src/db/schema/agents.ts`), translation keys from Task 1.
- Produces: `AssistantCard` — presentational, props `{ agent: { id: string; name: string; role: string; status: "draft" | "active" } }`. `AssistantsGrid` — `"use client"`, props `{ agents: Array<{ id: string; name: string; role: string; status: "draft" | "active" }> }`, owns search-filter state and renders `ListSearchInput` + filtered grid of `AssistantCard`.

**Note on component boundaries:** `AssistantCard` must be a plain synchronous component (not an async server component) because it is rendered as a child of the client component `AssistantsGrid` (client components cannot render async server components in their tree). All translated labels are therefore resolved by `AssistantsGrid` (via `useTranslations`) and passed down as plain string props.

- [ ] **Step 1: Write `CopyIdButton` (client, copy-to-clipboard only — no server call)**

Create `src/components/dashboard/assistants/copy-id-button.tsx`:

```tsx
"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Check, Copy } from "lucide-react";

export function CopyIdButton({ id }: { id: string }) {
  const t = useTranslations("assistants");
  const [copied, setCopied] = useState(false);
  const shortId = `${id.slice(0, 8)}...${id.slice(-4)}`;

  return (
    <button
      type="button"
      onClick={async () => {
        await navigator.clipboard.writeText(id);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className="mt-2 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
      aria-label={t("copyId")}
    >
      <span className="font-mono">{shortId}</span>
      {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
      {copied ? <span>{t("idCopied")}</span> : null}
    </button>
  );
}
```

- [ ] **Step 3: Write `AssistantCard` (synchronous, prop-driven — see note above on why it cannot be async)**

Create `src/components/dashboard/assistants/assistant-card.tsx`:

```tsx
import type { agentRole, agentStatus } from "@/db/schema/agents";
import { Link } from "@/i18n/navigation";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { CopyIdButton } from "./copy-id-button";

type Agent = {
  id: string;
  name: string;
  role: (typeof agentRole.enumValues)[number];
  status: (typeof agentStatus.enumValues)[number];
};

export function AssistantCard({
  agent,
  roleLabel,
  statusLabel,
}: {
  agent: Agent;
  roleLabel: string;
  statusLabel: string;
}) {
  const initial = agent.name.trim().charAt(0).toUpperCase() || "?";

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand/10 text-sm font-semibold text-brand">
              {initial}
            </span>
            <div>
              <CardTitle>
                <Link href={`/assistants/${agent.id}`}>{agent.name}</Link>
              </CardTitle>
              <p className="text-sm text-muted-foreground">{roleLabel}</p>
            </div>
          </div>
          <span
            role="status"
            aria-label={statusLabel}
            title={statusLabel}
            className={
              "mt-1 size-2 shrink-0 rounded-full " +
              (agent.status === "active" ? "bg-green-500" : "bg-muted-foreground/40")
            }
          />
        </div>
        <CopyIdButton id={agent.id} />
      </CardHeader>
    </Card>
  );
}
```

- [ ] **Step 4: Write `AssistantsGrid` (client, owns search state, resolves labels via `useTranslations` and passes them down)**

Create `src/components/dashboard/assistants/assistants-grid.tsx`:

```tsx
"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { ListSearchInput } from "@/components/dashboard/list-search-input";
import { AssistantCard } from "./assistant-card";
import type { agentRole, agentStatus } from "@/db/schema/agents";

type Agent = {
  id: string;
  name: string;
  role: (typeof agentRole.enumValues)[number];
  status: (typeof agentStatus.enumValues)[number];
};

export function AssistantsGrid({ agents }: { agents: Agent[] }) {
  const t = useTranslations("assistants");
  const [query, setQuery] = useState("");
  const filtered = agents.filter((agent) =>
    agent.name.toLowerCase().includes(query.trim().toLowerCase()),
  );

  return (
    <div className="flex flex-col gap-4">
      <ListSearchInput placeholder={t("searchPlaceholder")} value={query} onChange={setQuery} />
      <div className="grid gap-3 sm:grid-cols-2">
        {filtered.map((agent) => (
          <AssistantCard
            key={agent.id}
            agent={agent}
            roleLabel={t(`roles.${agent.role}`)}
            statusLabel={t(`statusLabels.${agent.status}`)}
          />
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Wire into the page**

Modify `src/app/[locale]/(dashboard)/assistants/page.tsx`: replace the `<div className="grid gap-3 sm:grid-cols-2">...</div>` block (the non-empty branch) with `<AssistantsGrid agents={agents} />`, and remove the now-unused `Card`/`CardHeader`/`CardTitle` imports that are no longer referenced directly in the page (keep `Link` if still used by the "create" button). Add:

```tsx
import { AssistantsGrid } from "@/components/dashboard/assistants/assistants-grid";
```

- [ ] **Step 6: Type-check and lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: no errors.

- [ ] **Step 7: Manual verification**

Run: `npm run dev`, open `/uz/assistants` in a browser, confirm: avatar initial, status dot (gray for the seeded `draft` agent, green if any `active` agent exists), short ID with copy button (click it, confirm "Nusxalandi" feedback appears), search box filters the grid as you type.

- [ ] **Step 8: Commit**

```bash
git add src/components/dashboard/assistants src/app/[locale]/(dashboard)/assistants/page.tsx
git commit -m "feat(assistants): add avatar, status dot, copy-id, and search to assistant cards"
```

---

### Task 4: `/chats` — search filter

**Files:**
- Create: `src/components/dashboard/chats/chats-list.tsx`
- Modify: `src/app/[locale]/(dashboard)/chats/page.tsx`

**Interfaces:**
- Consumes: `ListSearchInput` (Task 2), translation key `chats.searchPlaceholder` (Task 1).
- Produces: `ChatsList` — `"use client"`, props `{ threads: ChatThread[] }` where `ChatThread = { id: string; agentName: string; lastMessagePreview: string; timestampLabel: string; isActive: boolean }`. Owns search-filter state; renders the search input plus the thread list (moved here from the page so filtering can re-render on every keystroke without a server round-trip).

- [ ] **Step 1: Write `ChatsList` client component**

Create `src/components/dashboard/chats/chats-list.tsx`:

```tsx
"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { ListSearchInput } from "@/components/dashboard/list-search-input";
import { Link } from "@/i18n/navigation";
import { Card } from "@/components/ui/card";

export type ChatThread = {
  id: string;
  agentName: string;
  lastMessagePreview: string;
  timestampLabel: string;
  isActive: boolean;
};

export function ChatsList({ threads }: { threads: ChatThread[] }) {
  const t = useTranslations("chats");
  const [query, setQuery] = useState("");
  const filtered = threads.filter((thread) => {
    const haystack = `${thread.agentName} ${thread.lastMessagePreview}`.toLowerCase();
    return haystack.includes(query.trim().toLowerCase());
  });

  return (
    <Card className="flex max-h-[70vh] flex-col gap-2 overflow-y-auto p-2">
      <div className="px-2 pt-1">
        <ListSearchInput placeholder={t("searchPlaceholder")} value={query} onChange={setQuery} />
      </div>
      <ul className="divide-y divide-border">
        {filtered.map((thread) => (
          <li key={thread.id}>
            <Link
              href={`/chats?conversation=${thread.id}`}
              className={
                "block px-4 py-3 transition-colors hover:bg-muted " +
                (thread.isActive ? "bg-muted" : "")
              }
            >
              <div className="flex items-center justify-between gap-2">
                <p className="font-medium">{thread.agentName}</p>
                <span className="text-xs text-muted-foreground">{thread.timestampLabel}</span>
              </div>
              <p className="mt-1 line-clamp-1 text-sm text-muted-foreground">
                {thread.lastMessagePreview}
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </Card>
  );
}
```

- [ ] **Step 2: Wire into `/chats/page.tsx`**

In `src/app/[locale]/(dashboard)/chats/page.tsx`:
1. Add import: `import { ChatsList, type ChatThread } from "@/components/dashboard/chats/chats-list";`
2. After computing `sortedThreads`, `lastMessageByThread`, `active`, and `dtf`, build:

```tsx
const threadItems: ChatThread[] = sortedThreads.map((row) => {
  const last = lastMessageByThread.get(row.conversation.id);
  return {
    id: row.conversation.id,
    agentName: row.agentName,
    lastMessagePreview: last?.content ?? t("noMessages"),
    timestampLabel: dtf.format(last?.createdAt ?? row.conversation.startedAt),
    isActive: active?.conversation.id === row.conversation.id,
  };
});
```

3. Replace the existing `<Card className="max-h-[70vh] overflow-y-auto p-0">...</Card>` block (the left-pane thread list) with `<ChatsList threads={threadItems} />`.
4. Remove the now-unused `Card` import if `Card` is still used elsewhere in the file (it is, for the right-pane message view) — keep the import, just drop the now-dead list-rendering JSX.

- [ ] **Step 3: Type-check and lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: no errors.

- [ ] **Step 4: Manual verification**

Run: `npm run dev`, open `/uz/chats` with at least one conversation seeded, confirm the search box filters the left-pane list by agent name and last-message text, and clicking a filtered result still opens it in the right pane.

- [ ] **Step 5: Commit**

```bash
git add src/components/dashboard/chats src/app/[locale]/(dashboard)/chats/page.tsx
git commit -m "feat(chats): add client-side thread search"
```

---

### Task 5: `/calls` — icons, colored stat cards, differentiated buttons, tab icons

**Files:**
- Modify: `src/app/[locale]/(dashboard)/calls/page.tsx`

**Interfaces:**
- Consumes: existing `calls.*` translation keys (no new keys needed — this task is icon/styling only).
- Produces: no new exports; page-local change only.

- [ ] **Step 1: Replace the page header to add an icon square**

In `src/app/[locale]/(dashboard)/calls/page.tsx`, change the import line to include `Phone`, `Calendar`, `Radio`, `PhoneCall`, `Megaphone`, `History`:

```tsx
import { Phone, Calendar, Radio, PhoneCall, PhoneOff, Megaphone, History } from "lucide-react";
```

Replace the header block:

```tsx
<div className="flex flex-wrap items-start justify-between gap-4">
  <div className="flex items-start gap-3">
    <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand">
      <Phone className="size-5" />
    </span>
    <div>
      <h1 className="text-xl font-semibold">{t("title")}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{t("subtitle")}</p>
    </div>
  </div>
  <div className="flex gap-2">
    <Button size="sm" variant="outline" disabled>
      <Phone className="size-3.5" data-icon="inline-start" />
      {t("startCall")}
      <span className="ml-1 text-xs opacity-70">{t("comingSoon")}</span>
    </Button>
    <Button size="sm" variant="default" disabled>
      <Calendar className="size-3.5" data-icon="inline-start" />
      {t("scheduleCall")}
      <span className="ml-1 text-xs opacity-70">{t("comingSoon")}</span>
    </Button>
  </div>
</div>
```

- [ ] **Step 2: Add colored icon circles to the stat cards**

Replace the `STATS.map` block with a map over an explicit array carrying icon + color so each stat renders its own circle:

```tsx
const STAT_CARDS = [
  { key: "live", icon: Radio, iconClass: "bg-blue-500/10 text-blue-500" },
  { key: "completedToday", icon: PhoneCall, iconClass: "bg-green-500/10 text-green-500" },
  { key: "failed", icon: PhoneOff, iconClass: "bg-red-500/10 text-red-500" },
] as const;
```

Move this constant to module scope (replacing the existing `const STATS = [...]` line). Replace the stat-card render block:

```tsx
<div className="grid gap-4 sm:grid-cols-3">
  {STAT_CARDS.map(({ key, icon: Icon, iconClass }) => (
    <Card key={key}>
      <CardContent className="flex items-center gap-3 pt-6">
        <span className={"flex size-10 shrink-0 items-center justify-center rounded-full " + iconClass}>
          <Icon className="size-5" />
        </span>
        <div>
          <p className="text-3xl font-bold">0</p>
          <p className="mt-1 text-sm text-muted-foreground">{t(`stats.${key}`)}</p>
        </div>
      </CardContent>
    </Card>
  ))}
</div>
```

- [ ] **Step 3: Add icons to tab triggers**

Replace the `TABS` constant and its usages with an array carrying icons:

```tsx
const TAB_ITEMS = [
  { key: "queue", icon: Phone },
  { key: "campaigns", icon: Megaphone },
  { key: "history", icon: History },
] as const;
```

Replace the `<TabsList>` block:

```tsx
<TabsList>
  {TAB_ITEMS.map(({ key, icon: Icon }) => (
    <TabsTrigger key={key} value={key}>
      <Icon className="size-3.5" data-icon="inline-start" />
      {t(`tabs.${key}`)}
    </TabsTrigger>
  ))}
</TabsList>
```

And the `<TabsContent>` map source from `TABS.map` to `TAB_ITEMS.map(({ key }) => ...)`, keeping the existing empty-state body unchanged, keyed and valued by `key`.

- [ ] **Step 4: Type-check and lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: no errors.

- [ ] **Step 5: Manual verification**

Run: `npm run dev`, open `/uz/calls`, confirm: icon square before "Qo'ng'iroqlar" title, two visually distinct buttons (outline vs filled, each with an icon, both still disabled with "Tez orada"), three stat cards each with a colored icon circle (blue/green/red), tab triggers each showing an icon before their label.

- [ ] **Step 6: Commit**

```bash
git add src/app/[locale]/(dashboard)/calls/page.tsx
git commit -m "feat(calls): add header icon, colored stat icons, and tab icons matching worken.ru"
```

---

### Task 6: `/knowledge-bases` — search, status badges, agent icon

**Files:**
- Create: `src/components/dashboard/knowledge-bases/knowledge-bases-grid.tsx`
- Modify: `src/app/[locale]/(dashboard)/knowledge-bases/page.tsx`

**Interfaces:**
- Consumes: `ListSearchInput` (Task 2), `Badge` (`src/components/ui/badge.tsx`), translation key `knowledgeBases.searchPlaceholder` (Task 1), existing `assistants.knowledge.status.*` keys.
- Produces: `KnowledgeBasesGrid` — `"use client"`, props `{ groups: Array<{ agentId: string; agentName: string; documents: Array<{ id: string; filename: string; status: "processing" | "ready" | "error" }> }> }`.

- [ ] **Step 1: Write `KnowledgeBasesGrid`**

```tsx
"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { BookOpen } from "lucide-react";
import { ListSearchInput } from "@/components/dashboard/list-search-input";
import { Link } from "@/i18n/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type DocumentRow = { id: string; filename: string; status: "processing" | "ready" | "error" };
type Group = { agentId: string; agentName: string; documents: DocumentRow[] };

const STATUS_VARIANT: Record<DocumentRow["status"], "secondary" | "default" | "destructive"> = {
  processing: "secondary",
  ready: "default",
  error: "destructive",
};

export function KnowledgeBasesGrid({ groups }: { groups: Group[] }) {
  const t = useTranslations("knowledgeBases");
  const tStatus = useTranslations("assistants.knowledge.status");
  const [query, setQuery] = useState("");
  const normalized = query.trim().toLowerCase();

  const filteredGroups = groups
    .map((group) => ({
      ...group,
      documents: group.documents.filter((doc) => doc.filename.toLowerCase().includes(normalized)),
    }))
    .filter((group) => group.documents.length > 0 || normalized === "");

  return (
    <div className="flex flex-col gap-4">
      <ListSearchInput placeholder={t("searchPlaceholder")} value={query} onChange={setQuery} />
      <div className="grid gap-4 sm:grid-cols-2">
        {filteredGroups.map((group) => (
          <Card key={group.agentId}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BookOpen className="size-4 text-brand" />
                  <p className="font-medium">{group.agentName}</p>
                </div>
                <Link
                  href={`/assistants/${group.agentId}/knowledge`}
                  className="text-xs font-medium text-brand hover:underline"
                >
                  {t("manage")}
                </Link>
              </div>
              <ul className="mt-3 flex flex-col gap-2">
                {group.documents.map((document) => (
                  <li key={document.id} className="flex items-center justify-between text-sm">
                    <span className="truncate">{document.filename}</span>
                    <Badge variant={STATUS_VARIANT[document.status]}>{tStatus(document.status)}</Badge>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Wire into the page**

Modify `src/app/[locale]/(dashboard)/knowledge-bases/page.tsx`:
1. Add import: `import { KnowledgeBasesGrid } from "@/components/dashboard/knowledge-bases/knowledge-bases-grid";`
2. After building `byAgent`, convert it to a plain array:

```tsx
const groups = [...byAgent.entries()].map(([agentId, bucket]) => ({
  agentId,
  agentName: bucket.agentName,
  documents: bucket.documents.map(({ document }) => ({
    id: document.id,
    filename: document.filename,
    status: document.status,
  })),
}));
```

3. Replace the existing `<div className="grid gap-4 sm:grid-cols-2">...</div>` block (the non-empty branch) with `<KnowledgeBasesGrid groups={groups} />`.
4. Remove now-unused imports (`Card`, `CardContent`, `Link`) from the page file if no longer referenced directly (the empty-state branch still uses plain `div`/`span`, not `Card`, so check before removing — keep whatever remains in use).

- [ ] **Step 3: Type-check and lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: no errors.

- [ ] **Step 4: Manual verification**

Run: `npm run dev`, open `/uz/knowledge-bases` with at least one agent that has uploaded documents, confirm: agent card header shows a small book icon, each document row shows a colored status badge instead of plain text, search box filters documents by filename across all agent groups (and hides groups left with zero matches).

- [ ] **Step 5: Commit**

```bash
git add src/components/dashboard/knowledge-bases src/app/[locale]/(dashboard)/knowledge-bases/page.tsx
git commit -m "feat(knowledge-bases): add search, status badges, and agent icon"
```

---

### Task 7: Full-suite verification

**Files:** none (verification only)

- [ ] **Step 1: Run the full test suite**

Run: `npm run test`
Expected: PASS (all existing tests plus the Task 1 translation-parity coverage)

- [ ] **Step 2: Run lint and type-check across the whole project**

Run: `npm run lint && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Run a production build**

Run: `npm run build`
Expected: build succeeds (catches any server/client component boundary mistakes, e.g. passing non-serializable props across the boundary).

- [ ] **Step 4: Manual pass over all four pages in both themes**

Run: `npm run dev`, visit `/uz/assistants`, `/uz/chats`, `/uz/calls`, `/uz/knowledge-bases` in both light and dark mode (toggle via the theme switcher in the dashboard topbar), confirm no layout breakage, icons render with correct contrast in both themes, and repeat for `/ru/...` and `/en/...` to confirm no missing-translation fallback text appears.

- [ ] **Step 5: Commit (only if Step 4 required fixes)**

If manual verification surfaced no issues, no commit is needed for this task. If fixes were made, commit them with a message describing what was fixed.
