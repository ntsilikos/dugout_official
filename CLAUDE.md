@AGENTS.md

# Dugout — Project Context

Dugout (originally "CardGrader" — note the directory is still named `/Users/nick/cardgrader`, don't rename) is a sports card inventory management + cross-marketplace selling platform. Competes with withmascot.com.

**Status:** Working MVP, 75+ routes, feature-complete for single-user workflows. Monetization layer (Stripe/tiers) not built. eBay/TikTok/Resend API keys are configured by the user but marketplace OAuth flows have not been tested end-to-end with real marketplace accounts yet.

---

## Tech Stack

- **Next.js 16.2.3** (App Router, Turbopack) — see AGENTS.md about breaking changes
- **TypeScript** (strict)
- **Supabase** — Postgres + Auth + Storage
- **Claude Sonnet 4** via `@anthropic-ai/sdk` for all AI (scan/grade/price/insights/authenticity/listing generation)
- **Tailwind CSS v4** (uses `@theme inline` in globals.css, CSS custom properties for brand)
- **Bebas Neue** (display) + **DM Sans** (body), from Google Fonts via `next/font`
- `ebay-api`, `resend`, `@supabase/ssr`, `@supabase/supabase-js`

---

## Next.js 16 Gotchas (VERIFIED)

- **`middleware.ts` is deprecated → use `proxy.ts`**. The file lives at `/Users/nick/cardgrader/proxy.ts` and exports `async function proxy(request)`. Don't rename it back.
- **`params` is a Promise** in route handlers and pages: `{ params }: { params: Promise<{ id: string }> }` → `const { id } = await params;`
- **`cookies()` from `next/headers` must be awaited**.
- **`searchParams`** in page components is also a Promise-ish — in client components use `useSearchParams()` wrapped in `<Suspense>`.

---

## Critical Conventions in This Codebase

### Supabase: when to use admin client vs user client

The `card-images` storage bucket is **private** with **no RLS policies** for user-level operations. The user-scoped client returned from `createClient()` **silently returns `null` URLs and fails uploads**. **Always use `createAdminClient()` from `@/lib/supabase/admin` for:**

- Uploading to `card-images`
- Generating signed URLs from `card-images`
- Any `supabase.storage.*` operation

User ownership is still verified via a `.eq("user_id", user.id)` query on the parent `cards` row BEFORE the storage operation. This pattern is established in `app/api/cards/[id]/images/route.ts`, `app/api/cards/route.ts` (list), `app/api/cards/[id]/route.ts` (detail), `app/api/analytics/route.ts`, `app/api/listings/route.ts`, `app/api/repacks/[id]/route.ts`, `app/api/cards/[id]/authenticity/route.ts`.

### The `card_images` → `images` field rename

Supabase returns joined relations under the DB relation name (`card_images`), but all frontend components read `card.images`. **List/detail endpoints must rename after fetching:**

```ts
(card as unknown as { images: unknown }).images = card.card_images;
delete (card as unknown as { card_images?: unknown }).card_images;
```

Already done in: `/api/cards`, `/api/cards/[id]`, `/api/analytics`. If you add a new endpoint that returns cards with images, you must do this rename.

### `withAuth` helper

All authenticated API routes use `withAuth` from `@/lib/api-helpers`. It accepts a handler `(user, supabase) => Promise<Response>` and returns either the handler's response or a 401/500. **`withAuth` now accepts `Response` (not just `NextResponse`)** so CSV export endpoints work alongside JSON ones.

### Design tokens via CSS variables

All colors use CSS custom properties defined in `app/globals.css` — never hardcode hex colors in components. Key tokens:

```
--bg-primary: #0C0F12   (page bg)
--bg-card: #141920      (card/panel bg)
--bg-card-hover: #1A2230
--green: #2ECC71        (primary brand — buttons, accents)
--green-hover: #3DCC84
--text-primary: #F2F0ED (headings, strong text)
--text-secondary: #8A94A0
--text-muted: #5A6474
--border: rgba(255,255,255,0.06)
--border-strong: rgba(255,255,255,0.1)
```

Primary buttons: `bg-[var(--green)] text-[var(--bg-primary)]` (DARK text on green per brand kit, NOT white).

### Route structure

- `app/(auth)/` — login, signup, OAuth callback (no sidebar)
- `app/(app)/` — all authenticated pages, wrapped by `app/(app)/layout.tsx` which renders sidebar + header + `ToastProvider`
- `app/api/` — all API routes

### Protected routes

`proxy.ts` has an `appRoutes` array. If you add a new authenticated page, add its path prefix to that array or users won't get redirected to login.

Current list: `/dashboard`, `/inventory`, `/settings`, `/listings`, `/hunters`, `/sets`, `/repacks`, `/consignment`, `/portfolio`, `/insights`, `/reports`, `/show`, `/social`.

### Marketplace configuration checks

`lib/config.ts` exports `isEbayConfigured()`, `isTikTokConfigured()`, `isResendConfigured()`, `isAnthropicConfigured()`, `getConfiguredMarketplaces()`. These return `false` when env vars start with `"your-"` (placeholder). API routes should check these before attempting external calls and return a graceful `{ error: "marketplace_not_configured", message: "..." }` — see `/api/hunters/[id]/run`, `/api/cards/[id]/comps`.

The Settings page polls `/api/config/status` and passes `isConfigured` to `MarketplaceConnectCard`, which shows a muted "Coming Soon" pill instead of the Connect button when keys are placeholders. **Do not try to kick users to eBay OAuth if `EBAY_APP_ID` is a placeholder** — it redirects to eBay's error page.

### Browser `confirm()` is banned

Use `ConfirmModal` from `@/app/components/ui/ConfirmModal` instead. All 6 existing destructive actions (card/set/consignor/repack/hunter delete, bulk delete) use it.

### Toast notifications

Use `useToast()` from `@/app/components/ui/Toast`. `toast.success(msg)`, `toast.error(msg)`, `toast.info(msg)`. Already wrapped around the app via `ToastProvider` in `app/(app)/layout.tsx`.

### Breadcrumbs on nested pages

Use `<Breadcrumb items={[{ label, href? }]} />` from `@/app/components/ui/Breadcrumb`. Already wired into card detail, edit, import, set detail, consignor detail, hunter detail + new, repack detail + new.

---

## External Services

### Configured and working
- **Anthropic API** — `ANTHROPIC_API_KEY` is real. Used by AI scan, grade, listing generation, price advisor, authenticity check, collection insights.
- **Supabase** — Real project `ivpvvjoiqsrqpsqrfoyu.supabase.co`. Credentials in `.env.local`. Database schema is live.

### Partially configured (user set keys, not yet verified end-to-end)
- **eBay Developer** — `EBAY_APP_ID/CERT_ID/DEV_ID` — user set these after earlier setup.
- **TikTok Shop Partner** — `TIKTOK_APP_KEY/APP_SECRET` — user set these.
- **Resend** — `RESEND_API_KEY` — for email notifications.

### Not configured
- No Stripe, no cron service (endpoints exist: `/api/hunters/cron`, `/api/cards/refresh-values`, `/api/portfolio/snapshot`, all gated by `x-cron-secret` header). Nothing calls them on a schedule.

---

## Database Schema (Supabase)

**All tables have RLS with `auth.uid() = user_id` policies.**

**Core:**
- `profiles` (extends `auth.users` via trigger on signup)
- `cards` — the main inventory table
- `card_images` — storage references (bucket: `card-images`, path: `{user_id}/{card_id}/{filename}`)
- `card_grades` — AI grading history

**Selling:**
- `marketplace_connections` — OAuth tokens per user per marketplace
- `listings` — cross-marketplace listings with sync status
- `listing_sync_logs`

**Discovery:**
- `card_searches` — Card Hunter saved searches (max 30/user)
- `search_results` — deduped matches from marketplace searches (UNIQUE on search_id, marketplace, marketplace_listing_id)
- `notifications` — in-app notifications (polled every 30s by NotificationBell)
- `user_preferences` — email notification settings

**Organization:**
- `repacks`, `repack_items` — product bundles with cost targets (floor/target/ceiling)
- `card_sets`, `set_cards` — set completion tracking
- `consignors`, `consignment_items`, `payouts` — consignment management

**Events:**
- `shows`, `show_sales` — live POS mode at card shows

**Analytics:**
- `portfolio_snapshots` — daily value snapshots (UNIQUE on user_id, snapshot_date)
- `collection_insights` — AI-generated weekly reports (stored as HTML)

SQL for the 8 later-added tables is in `/Users/nick/cardgrader/supabase-migration.sql` — the user ran it in their Supabase SQL Editor.

Storage bucket: `card-images` (private, 10MB limit, JPEG/PNG/WebP/GIF only). Created via admin SDK — no RLS policies exist, so user-scoped clients can't use it.

---

## Test Account

- Email: `test@cardgrader.com`
- Password: `TestCard2026!`
- User ID: `7cf73e17-9250-4078-829c-a3e18777d54a`

Demo data: 33 cards across Baseball, Basketball, Football. Top cards: LeBron 2003 Topps Chrome PSA 9 ($2,500), Brady 2000 Contenders Auto PSA 8 ($1,500), Mahomes 2017 Prizm Silver PSA 10 ($950), Trout 2011 Update RC PSA 10 ($850), Luka 2018 Prizm Silver PSA 10 ($750), Wemby 2023 Prizm Silver PSA 10 ($450). Most cards show placeholder icons (no image uploaded yet — that's expected).

---

## Feature Status

### BUILT (works end-to-end)
Dashboard · Inventory CRUD (+ bulk delete, filters, search) · AI Scan · Bulk Scan (parallel with review queue) · Manual Entry · Cert Lookup tab · CSV Import · Card detail (grade breakdown, market comps UI, authenticity UI, price advisor UI) · Listings page · Create Listing modal (AI title/desc + price advisor) · Card Hunter (create, run, results, notifications) · Repacks (create, card picker, cost targets, templates, sold tab) · Sets (create, add ranges, toggle owned, hunt missing) · Consignment (consignors, items, payouts) · Portfolio (stats, sport allocation, SVG value chart) · Insights (AI weekly reports) · Show Mode (persistent sales log, POS, end show) · Settings (account, marketplace connect cards with "not configured" states) · Notifications (bell, poll every 30s) · Reports page (summary stats + 3 CSV exports)

### PARTIAL (scaffolded but needs live data or config)
- Marketplace listings — code paths work but untested against real eBay/TikTok accounts
- Card Hunter background execution — cron endpoint exists but nothing triggers it
- Portfolio chart — needs daily snapshots to accumulate before it renders anything useful
- Resend email notifications — code path works when key configured, not tested live

### PLACEHOLDER pages
- `/social/feed` — "coming soon" empty state only
- Pricing/Help pages referenced in landing nav — don't exist

### NOT BUILT (suggested next features, prioritized)
- Stripe billing + subscription tiers (Basic/Collector/Hobby/Pro/Expert) + feature gating
- Pricing Rules (auto-lower list price over time — flagship Mascot Pro feature)
- Multiple locations (Box 1, Binder A)
- Barcode / QR code label generation
- Buyer attribution tracking
- Shopify, Walmart, Whatnot, Square, MyCardPost integrations (all "Coming Soon" in settings)

---

## File Structure (key paths)

```
/Users/nick/cardgrader/
├── app/
│   ├── (auth)/              — login, signup, oauth callback
│   ├── (app)/               — authenticated layout wraps all these
│   │   ├── dashboard, inventory, inventory/[id], inventory/add, inventory/import
│   │   ├── listings, hunters, hunters/new, hunters/[id]
│   │   ├── sets, sets/[id], repacks, repacks/new, repacks/[id]
│   │   ├── consignment, consignment/[id]
│   │   ├── portfolio, insights, reports
│   │   ├── show, show/[id]
│   │   ├── social/feed, settings
│   │   └── layout.tsx       — sidebar + header + ToastProvider
│   ├── api/                 — 40+ route handlers
│   ├── components/
│   │   ├── ui/              — Toast, ConfirmModal, Breadcrumb
│   │   ├── layout/          — AppSidebar, AppHeader, UserMenu, NotificationBell
│   │   ├── auth/            — AuthForm, GoogleSignInButton
│   │   ├── dashboard/       — StatsGrid, SportBreakdown (has value/count toggle), RecentCards
│   │   ├── inventory/       — CardGrid (supports selectionMode), CardForm, CardFilters,
│   │   │                      ImageUpload, ScanCard, BulkScan, PriceComps, AuthenticityResult
│   │   ├── listings/        — CreateListingModal
│   │   ├── hunters/         — SearchForm
│   │   ├── repacks/         — CardPicker, CostIndicator
│   │   ├── marketplace/     — MarketplaceConnectCard (with "not configured" state)
│   │   └── portfolio/       — ValueChart (inline SVG, no chart library)
│   ├── page.tsx             — landing page (Dugout brand, marketing)
│   ├── layout.tsx           — root layout with font loading
│   └── globals.css          — Tailwind + CSS variables
├── lib/
│   ├── supabase/            — client.ts, server.ts, admin.ts
│   ├── marketplaces/        — types.ts, registry.ts, ebay.ts, tiktok.ts
│   ├── api-helpers.ts       — withAuth
│   ├── config.ts            — is{Ebay,TikTok,Resend,Anthropic}Configured
│   ├── csv.ts               — CSV serializer for export endpoints
│   ├── utils.ts             — formatCurrency, formatDate, getCardTitle
│   ├── types.ts             — shared TypeScript interfaces
│   ├── email.ts             — Resend wrappers
│   └── *-prompt.ts          — Claude system prompts (scan, grading, listing, pricing,
│                              authenticity, insights)
├── proxy.ts                 — auth middleware (NOT middleware.ts)
├── supabase-migration.sql   — 8 later-added tables (already applied)
├── .env.local               — Supabase + marketplace + AI keys
└── DUGOUT_WALKTHROUGH.pdf   — user-facing feature docs
```

---

## Build & Run

- `npx next build` — type-checks everything, should be 0 errors
- `npm run dev` — runs on port 3000
- Preview server is typically managed via the `mcp__Claude_Preview__*` tools
- If port 3000 is occupied: `lsof -ti:3000 | xargs kill -9`

---

## Brand & Copy Voice

- Headlines: Bebas Neue, UPPERCASE, wide tracking. Sports metaphors welcome ("YOUR CARDS. EVERY MARKET.", "STEP UP TO THE PLATE").
- Body: DM Sans, clear, benefit-driven, 1-2 sentences.
- CTAs: action-oriented ("Start Selling Free", "Book a Demo"), not generic.
- Error states: helpful not blaming — tell the user what to do next.
