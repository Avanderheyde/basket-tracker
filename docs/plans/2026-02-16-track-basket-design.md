# Track Basket — Design Document

Multi-user dashboard for creating stock baskets and tracking their performance over time.

## Architecture

```
User → Next.js (Vercel) → Supabase (Auth + DB)
                        → Yahoo Finance API (prices)
```

- **Next.js 15 App Router** — UI, auth pages, API routes (proxy to Yahoo Finance)
- **Supabase** — auth (email/password or OAuth), stores baskets and tickers
- **Yahoo Finance** — all price data (current quotes + historical), accessed via Next.js API routes
- No cron, no background jobs, no stored price data

## Data Model

```sql
-- users: managed by Supabase Auth

baskets
  id          uuid PK
  user_id     FK → auth.users.id
  name        text
  weight_mode enum('equal', 'custom', 'dollar')
  created_at  timestamptz
  updated_at  timestamptz

basket_items
  id            uuid PK
  basket_id     FK → baskets.id ON DELETE CASCADE
  ticker        text
  weight        numeric (nullable, for custom weight mode)
  dollar_amount numeric (nullable, for dollar mode)
  added_at      timestamptz
  UNIQUE(basket_id, ticker)
```

Row Level Security ensures users only access their own baskets.

## User Flows

**Dashboard** — Lists baskets as cards with name, ticker count, and performance sparkline. Click to view detail.

**Create basket** — Enter name, pick weight mode (equal/custom/dollar), add tickers via search autocomplete.

**Basket detail** — Performance line chart at top showing combined basket return as %. Time range selector (1W, 1M, 3M, 6M, 1Y, ALL). Ticker table below with current price, daily change, weight. Add/remove tickers inline. Prices auto-refresh every 15 minutes.

**Performance calculation (client-side):**
- Equal weight: average % return of each stock from start date
- Custom weight: weighted average of % returns
- Dollar: sum of each position's value over time

## API Routes

- `GET /api/quote?tickers=AAPL,GOOG` — current prices, daily change
- `GET /api/history?tickers=AAPL,GOOG&range=1mo&interval=1d` — historical close prices
- `GET /api/search?q=app` — ticker search/autocomplete

All thin proxies to Yahoo Finance. No caching, no storage.

## Tech Stack

- Next.js 15 (App Router, TypeScript)
- Supabase (auth + Postgres)
- Tailwind CSS
- Shadcn/ui (component library)
- Recharts (line charts)
- yahoo-finance2 (Node.js Yahoo Finance client)

## Cost

Entirely on free tiers: Vercel free, Supabase free, Yahoo Finance free.
