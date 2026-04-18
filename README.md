# Dugout

Sports card inventory management and cross-marketplace selling platform. Built with Next.js 16, Supabase, Claude Sonnet 4, and CardHedge.

## Features

- **AI Scan + Grade** — snap a photo, Claude identifies the card and grades it
- **CardHedge verification** — every scan cross-checks against CardHedge's card database for accurate metadata and pricing
- **Cross-marketplace listings** — eBay, TikTok Shop (more coming)
- **Portfolio tracking** — real-time collection value, daily snapshots, sport/brand allocation
- **Collection appraisal** — batch refresh every card's estimated value from live market data
- **Card Hunter** — saved searches across connected marketplaces
- **Repacks, Consignment, Set tracking, Show mode** — everything a hobbyist-to-pro seller needs

## Getting started

```bash
npm install
npm run dev
```

Requires a `.env.local` with:

```
ANTHROPIC_API_KEY=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
CARDHEDGE_API_KEY=
EBAY_APP_ID=
EBAY_CERT_ID=
EBAY_DEV_ID=
EBAY_REDIRECT_URI=
EBAY_SANDBOX=false
NEXT_PUBLIC_APP_URL=
```

## Stack

- Next.js 16.2.3 (App Router, Turbopack)
- Supabase (Postgres + Auth + Storage)
- Claude Sonnet 4 via `@anthropic-ai/sdk`
- Tailwind CSS v4
- CardHedge API for pricing data
- eBay Browse + Sell APIs for marketplace integration

## Repo layout

- `app/(auth)/` — login, signup, OAuth callbacks
- `app/(app)/` — authenticated pages
- `app/api/` — route handlers
- `app/components/` — shared UI
- `lib/` — server-side libs (Supabase clients, pricing, marketplaces, AI prompts)
- `proxy.ts` — auth middleware
- `supabase-schema.sql` / `supabase-migration.sql` — database schema

See `CLAUDE.md` for detailed architecture notes and conventions.
