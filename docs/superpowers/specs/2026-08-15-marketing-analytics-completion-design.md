# Marketing Analytics — Completion Design

Date: 2026-08-15

## Context

`/statistics/marketing` was built across earlier phases but shipped with two
kinds of gaps discovered during a full local run-through:

1. **A wiring bug that breaks every OAuth integration**, not just marketing
   ones: `NEXT_PUBLIC_APP_URL` is referenced by
   `src/app/api/integrations/[provider]/oauth/start/route.ts` to build the
   OAuth `redirect_uri`, but the var was never added to `.env.local` (only to
   `.env.example`). Every "Ulash" OAuth button currently redirects to
   `undefined/api/integrations/.../callback`.
2. **Instagram Insights and OLX cards are 100% hardcoded mock data**
   (`45,200` followers, `4,120` OLX views, etc.) rendered next to a
   `MockConnectButton` that performs no action. Site analytics is real
   (calls the Vercel Web Analytics API) but is wired to a single project via
   env vars with no per-organization domain configuration anywhere in the UI.

YouTube (`src/lib/youtube/*`) and Telegram
(`src/lib/telegram/*`, MTProto-based) are already real, working
implementations — they only need real third-party credentials, which the
user will obtain and add to `.env.local` themselves after this work lands.

## Scope

In scope:
- Fix `NEXT_PUBLIC_APP_URL`.
- Verify YouTube and Telegram code paths end-to-end (fix bugs found, no
  redesign).
- Build a real Instagram Insights integration (Meta Graph API OAuth).
- Build a self-hosted site analytics subsystem (tracking script + event
  ingestion + dashboard), replacing the Vercel Web Analytics call, so any
  organization can enter any domain — not just Vercel-hosted ones.

Out of scope: OLX real integration (no public API confirmed available —
stays a documented future item, not touched here), Instagram Meta App
Review process (user's own account action after this ships).

## 1. Instagram Insights

Reuses the existing generic OAuth infrastructure
(`src/lib/integrations/oauth/{config,exchange,state}.ts`,
`/api/integrations/[provider]/oauth/{start,callback}`) the same way YouTube
does, with one addition: Meta's flow requires exchanging the short-lived
token for a 60-day long-lived token, then resolving the Facebook Page →
Instagram Business Account ID, before Insights calls will work.

- `oauth/config.ts`: add `instagram` provider — authUrl
  `https://www.facebook.com/v21.0/dialog/oauth`, tokenUrl
  `https://graph.facebook.com/v21.0/oauth/access_token`, scopes
  `instagram_basic instagram_manage_insights pages_show_list
  pages_read_engagement business_management`, env prefix `META`
  (`META_CLIENT_ID` / `META_CLIENT_SECRET`).
- `src/lib/instagram/channel-stats.ts` (mirrors
  `youtube/channel-stats.ts`): given a stored access token, resolves the IG
  Business Account ID (once, cached in credentials JSON) then fetches
  `followers_count`, `media_count` and `/insights?metric=reach,profile_views,impressions&period=day`.
  Returns a discriminated `available: true/false` result like YouTube's, so
  the UI can show a clear reason (token expired, no IG business account
  linked, etc.) instead of crashing.
- `src/lib/instagram/sync-stats.ts` (mirrors `youtube/sync-stats.ts`):
  reads the `integrations` row for `providerId: "instagram"`, refreshes/
  long-lived-exchanges as needed, calls `channel-stats`, persists refreshed
  credentials + `lastVerifiedAt`/`lastError`.
- `InstagramAnalyticsCard` client component (mirrors
  `YoutubeAnalyticsCard`), replacing the hardcoded "Instagram Insights Mock"
  block and its `MockConnectButton` in
  `src/app/[locale]/(dashboard)/statistics/marketing/page.tsx`.
- The OLX mock card stays as-is (out of scope) but its comment is updated to
  make clear it's a placeholder pending a confirmed OLX API, not an
  oversight.

## 2. Self-hosted site analytics

New subsystem, no third-party account needed — works for any domain
regardless of hosting.

**Data model** (`src/db/schema/site-analytics.ts`):
- `site_analytics_site`: `id`, `organizationId` (unique — one tracked site
  per org for this MVP, matches the existing one-per-org pattern used by
  `telegramChannelConnections`), `domain`, `trackingKey` (public, used by
  the snippet), `createdAt`.
- `site_analytics_event`: `id`, `siteId`, `path`, `referrerHost` (nullable),
  `visitorHash` (SHA-256 of `dailySalt + ip + userAgent`, truncated —
  never stores the raw IP), `createdAt`. Indexed on `(siteId, createdAt)`
  for range queries and on `(siteId, visitorHash)` for distinct-visitor
  counts.

**Ingestion**:
- `GET /api/site-analytics/t.js` — serves a small static, cacheable JS
  snippet. On load it reads its own `data-site` attribute and POSTs
  `{ path, referrer }` via `navigator.sendBeacon` (falls back to `fetch` with
  `keepalive: true`).
- `POST /api/site-analytics/collect` — public route, no auth (called
  cross-origin from the user's own site). Validates `trackingKey` exists,
  extracts client IP from `x-forwarded-for`/`req.headers`, hashes it with
  the User-Agent and a day-rotating server-side salt (env var
  `SITE_ANALYTICS_SALT`), stores the event. Responds `204` regardless of
  outcome (never leaks validation details to a public endpoint).

**Management UI** (replaces the current Vercel-Analytics-only card in
`statistics/marketing/page.tsx`):
- If no site is registered for the org: a small form (domain input) that
  creates the `site_analytics_site` row and generates the tracking key.
- Once registered: shows the copy-paste `<script>` snippet, plus a
  "kutilmoqda — birinchi tashrif hali kelmagan" empty state until the first
  event lands, after which the existing visitors/pageviews/top-pages/top-
  referrers cards render from real aggregated `site_analytics_event` rows
  (grouped by day for the chart, `COUNT(DISTINCT visitorHash)` for
  visitors, `COUNT(*)` for pageviews) instead of the Vercel API.
- `src/lib/analytics/web-analytics.ts` (Vercel-based) is removed along with
  its `VERCEL_API_TOKEN`/`VERCEL_ANALYTICS_PROJECT_ID` dependency for this
  feature.

## Testing

- Unit tests for: visitor-hash generation (deterministic per day, differs
  across days/salts), site-analytics aggregation query shaping, Instagram
  long-lived-token exchange and IG Business Account resolution (mocked
  fetch), `channel-stats` reason branches (no token, expired, no IG
  account, API error).
- `npx tsc --noEmit`, `npm run lint`, `npm run test` after each unit of
  work.
- Manual browser walkthrough of `/statistics/marketing`: domain form submit
  → snippet shown → simulate a `collect` POST → dashboard shows the event.
