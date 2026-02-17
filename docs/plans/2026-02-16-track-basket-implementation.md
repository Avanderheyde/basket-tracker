# Track Basket Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a multi-user stock basket tracking dashboard where users create baskets of tickers and view combined performance over time.

**Architecture:** Next.js 15 App Router with Supabase for auth/DB. Price data fetched on-demand from Yahoo Finance via Next.js API routes. No stored price data, no background jobs.

**Tech Stack:** Next.js 15, TypeScript, Supabase, Tailwind CSS, Shadcn/ui, Recharts, yahoo-finance2

---

### Task 1: Scaffold Next.js project

**Files:**
- Create: project root via `create-next-app`
- Modify: `package.json` (add dependencies)

**Step 1: Create Next.js app**

Run:
```bash
cd /Users/alderik/Code/projects/track-basket
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm
```

Select defaults when prompted. Since the directory has files (docs/, .git), this may prompt to overwrite — accept.

**Step 2: Install dependencies**

Run:
```bash
npm install @supabase/supabase-js @supabase/ssr yahoo-finance2 recharts
```

**Step 3: Initialize Shadcn/ui**

Run:
```bash
npx shadcn@latest init -d
```

Then add the components we'll need:
```bash
npx shadcn@latest add button card dialog input label select table tabs badge
```

**Step 4: Verify dev server starts**

Run: `npm run dev`
Expected: App runs at http://localhost:3000 without errors.

**Step 5: Commit**

```bash
git add -A
git commit -m "scaffold: Next.js 15 with Tailwind, Shadcn/ui, Supabase, Recharts"
```

---

### Task 2: Supabase setup and database schema

**Files:**
- Create: `src/lib/supabase/client.ts`
- Create: `src/lib/supabase/server.ts`
- Create: `src/lib/supabase/middleware.ts`
- Create: `src/middleware.ts`
- Create: `.env.local` (from template)
- Create: `supabase/migrations/001_create_tables.sql`

**Step 1: Create `.env.local`**

```env
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

The implementer must create a Supabase project at https://supabase.com/dashboard and fill in the values.

**Step 2: Create Supabase browser client**

Create `src/lib/supabase/client.ts`:
```typescript
import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
```

**Step 3: Create Supabase server client**

Create `src/lib/supabase/server.ts`:
```typescript
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing sessions.
          }
        },
      },
    }
  );
}
```

**Step 4: Create middleware for session refresh**

Create `src/lib/supabase/middleware.ts`:
```typescript
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (
    !user &&
    !request.nextUrl.pathname.startsWith("/login") &&
    !request.nextUrl.pathname.startsWith("/signup") &&
    request.nextUrl.pathname !== "/"
  ) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
```

Create `src/middleware.ts`:
```typescript
import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
```

**Step 5: Create SQL migration**

Create `supabase/migrations/001_create_tables.sql`:
```sql
-- Create custom types
CREATE TYPE weight_mode AS ENUM ('equal', 'custom', 'dollar');

-- Baskets table
CREATE TABLE baskets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  weight_mode weight_mode NOT NULL DEFAULT 'equal',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Basket items table
CREATE TABLE basket_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  basket_id UUID NOT NULL REFERENCES baskets(id) ON DELETE CASCADE,
  ticker TEXT NOT NULL,
  weight NUMERIC,
  dollar_amount NUMERIC,
  added_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(basket_id, ticker)
);

-- Row Level Security
ALTER TABLE baskets ENABLE ROW LEVEL SECURITY;
ALTER TABLE basket_items ENABLE ROW LEVEL SECURITY;

-- Baskets: users can only CRUD their own
CREATE POLICY "Users can view own baskets"
  ON baskets FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own baskets"
  ON baskets FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own baskets"
  ON baskets FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own baskets"
  ON baskets FOR DELETE
  USING (auth.uid() = user_id);

-- Basket items: users can CRUD items in their own baskets
CREATE POLICY "Users can view own basket items"
  ON basket_items FOR SELECT
  USING (basket_id IN (SELECT id FROM baskets WHERE user_id = auth.uid()));

CREATE POLICY "Users can create items in own baskets"
  ON basket_items FOR INSERT
  WITH CHECK (basket_id IN (SELECT id FROM baskets WHERE user_id = auth.uid()));

CREATE POLICY "Users can update items in own baskets"
  ON basket_items FOR UPDATE
  USING (basket_id IN (SELECT id FROM baskets WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete items from own baskets"
  ON basket_items FOR DELETE
  USING (basket_id IN (SELECT id FROM baskets WHERE user_id = auth.uid()));

-- Index for fast lookups
CREATE INDEX idx_baskets_user_id ON baskets(user_id);
CREATE INDEX idx_basket_items_basket_id ON basket_items(basket_id);
```

Run this SQL in the Supabase dashboard SQL editor.

**Step 6: Verify Supabase connection**

Run `npm run dev`, open browser console, confirm no Supabase connection errors.

**Step 7: Commit**

```bash
git add src/lib/supabase/ src/middleware.ts supabase/
git commit -m "feat: Supabase client setup, middleware, and database schema"
```

Note: Do NOT commit `.env.local`. Add it to `.gitignore` if not already present.

---

### Task 3: Auth pages (login + signup)

**Files:**
- Create: `src/app/login/page.tsx`
- Create: `src/app/signup/page.tsx`
- Create: `src/app/auth/callback/route.ts`
- Modify: `src/app/page.tsx` (landing page with redirect)

**Step 1: Create login page**

Create `src/app/login/page.tsx`:
```typescript
"use client";

import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      router.push("/dashboard");
      router.refresh();
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Log in to Track Basket</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Logging in..." : "Log in"}
            </Button>
          </form>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            Don't have an account?{" "}
            <Link href="/signup" className="underline">
              Sign up
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
```

**Step 2: Create signup page**

Create `src/app/signup/page.tsx` — same structure as login but calls `supabase.auth.signUp` and shows a "check your email" message on success.

**Step 3: Create auth callback route**

Create `src/app/auth/callback/route.ts`:
```typescript
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    const supabase = await createClient();
    await supabase.auth.exchangeCodeForSession(code);
  }

  return NextResponse.redirect(`${origin}/dashboard`);
}
```

**Step 4: Update landing page**

Modify `src/app/page.tsx` to redirect authenticated users to `/dashboard` or show a simple landing with login/signup links.

**Step 5: Test manually**

- Visit `/login` — see login form
- Visit `/signup` — see signup form
- Create an account, verify redirect to `/dashboard`
- Visit `/dashboard` while logged out — redirect to `/login`

**Step 6: Commit**

```bash
git add src/app/login/ src/app/signup/ src/app/auth/ src/app/page.tsx
git commit -m "feat: auth pages — login, signup, callback, protected routes"
```

---

### Task 4: Yahoo Finance API routes

**Files:**
- Create: `src/app/api/quote/route.ts`
- Create: `src/app/api/history/route.ts`
- Create: `src/app/api/search/route.ts`

**Step 1: Create quote route**

Create `src/app/api/quote/route.ts`:
```typescript
import yahooFinance from "yahoo-finance2";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const tickers = request.nextUrl.searchParams.get("tickers");
  if (!tickers) {
    return NextResponse.json({ error: "tickers parameter required" }, { status: 400 });
  }

  const symbols = tickers.split(",").map((t) => t.trim().toUpperCase());

  try {
    const quotes = await Promise.all(
      symbols.map(async (symbol) => {
        const quote = await yahooFinance.quote(symbol);
        return {
          symbol: quote.symbol,
          name: quote.shortName ?? quote.longName,
          price: quote.regularMarketPrice,
          change: quote.regularMarketChange,
          changePercent: quote.regularMarketChangePercent,
          marketCap: quote.marketCap,
        };
      })
    );
    return NextResponse.json(quotes);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch quotes" },
      { status: 500 }
    );
  }
}
```

**Step 2: Create history route**

Create `src/app/api/history/route.ts`:
```typescript
import yahooFinance from "yahoo-finance2";
import { NextRequest, NextResponse } from "next/server";

const RANGE_MAP: Record<string, { period1: string; interval: "1d" | "1wk" }> = {
  "1w": { period1: "7d", interval: "1d" },
  "1m": { period1: "1mo", interval: "1d" },
  "3m": { period1: "3mo", interval: "1d" },
  "6m": { period1: "6mo", interval: "1d" },
  "1y": { period1: "1y", interval: "1d" },
  max: { period1: "max", interval: "1wk" },
};

export async function GET(request: NextRequest) {
  const tickers = request.nextUrl.searchParams.get("tickers");
  const range = request.nextUrl.searchParams.get("range") ?? "1m";

  if (!tickers) {
    return NextResponse.json({ error: "tickers parameter required" }, { status: 400 });
  }

  const symbols = tickers.split(",").map((t) => t.trim().toUpperCase());
  const config = RANGE_MAP[range] ?? RANGE_MAP["1m"];

  try {
    const results = await Promise.all(
      symbols.map(async (symbol) => {
        const result = await yahooFinance.chart(symbol, {
          period1: config.period1,
          interval: config.interval,
        });
        return {
          symbol,
          quotes: result.quotes.map((q) => ({
            date: q.date,
            close: q.close,
          })),
        };
      })
    );
    return NextResponse.json(results);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch history" },
      { status: 500 }
    );
  }
}
```

**Step 3: Create search route**

Create `src/app/api/search/route.ts`:
```typescript
import yahooFinance from "yahoo-finance2";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q");
  if (!query) {
    return NextResponse.json({ error: "q parameter required" }, { status: 400 });
  }

  try {
    const result = await yahooFinance.search(query);
    const quotes = result.quotes
      .filter((q) => q.quoteType === "EQUITY")
      .slice(0, 10)
      .map((q) => ({
        symbol: q.symbol,
        name: q.shortname ?? q.longname,
        exchange: q.exchange,
      }));
    return NextResponse.json(quotes);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to search" },
      { status: 500 }
    );
  }
}
```

**Step 4: Test API routes manually**

Run `npm run dev` and test:
- `http://localhost:3000/api/quote?tickers=AAPL,GOOG` — should return price data
- `http://localhost:3000/api/history?tickers=AAPL&range=1m` — should return historical data
- `http://localhost:3000/api/search?q=apple` — should return search results

**Step 5: Commit**

```bash
git add src/app/api/
git commit -m "feat: Yahoo Finance API proxy routes — quote, history, search"
```

---

### Task 5: Dashboard page — list baskets

**Files:**
- Create: `src/app/dashboard/page.tsx`
- Create: `src/components/basket-card.tsx`
- Create: `src/app/dashboard/layout.tsx` (nav bar with logout)

**Step 1: Create dashboard layout with nav**

Create `src/app/dashboard/layout.tsx` with a top nav bar showing "Track Basket" logo and a logout button. Fetch the user server-side via Supabase and pass to client.

**Step 2: Create basket card component**

Create `src/components/basket-card.tsx` — a Card showing basket name, ticker count, weight mode badge, and created date. Links to `/basket/[id]`.

**Step 3: Create dashboard page**

Create `src/app/dashboard/page.tsx`:
- Server component that fetches baskets from Supabase with item counts
- Renders a grid of BasketCard components
- Shows empty state with "Create your first basket" CTA
- Includes a "New Basket" button in the header

**Step 4: Test manually**

- Log in, see empty dashboard with "Create your first basket" prompt
- Manually insert a basket via Supabase dashboard, refresh, see it appear

**Step 5: Commit**

```bash
git add src/app/dashboard/ src/components/basket-card.tsx
git commit -m "feat: dashboard page with basket cards and nav"
```

---

### Task 6: Create basket flow

**Files:**
- Create: `src/components/create-basket-dialog.tsx`
- Create: `src/components/ticker-search.tsx`
- Create: `src/app/dashboard/actions.ts` (server actions)

**Step 1: Create ticker search component**

Create `src/components/ticker-search.tsx` — an input that calls `/api/search` with debounce (300ms), shows dropdown of matching tickers, allows selecting them. Returns selected tickers to parent.

**Step 2: Create basket dialog**

Create `src/components/create-basket-dialog.tsx` using Shadcn Dialog:
- Name input
- Weight mode select (equal/custom/dollar)
- Ticker search component to add tickers
- List of added tickers (with remove button)
- If custom weight mode: weight input per ticker
- If dollar mode: dollar amount input per ticker
- Create button

**Step 3: Create server action**

Create `src/app/dashboard/actions.ts`:
```typescript
"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function createBasket(formData: {
  name: string;
  weightMode: "equal" | "custom" | "dollar";
  items: { ticker: string; weight?: number; dollarAmount?: number }[];
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: basket, error: basketError } = await supabase
    .from("baskets")
    .insert({
      user_id: user.id,
      name: formData.name,
      weight_mode: formData.weightMode,
    })
    .select()
    .single();

  if (basketError) throw basketError;

  const items = formData.items.map((item) => ({
    basket_id: basket.id,
    ticker: item.ticker.toUpperCase(),
    weight: item.weight ?? null,
    dollar_amount: item.dollarAmount ?? null,
  }));

  const { error: itemsError } = await supabase
    .from("basket_items")
    .insert(items);

  if (itemsError) throw itemsError;

  revalidatePath("/dashboard");
  return basket;
}
```

**Step 4: Wire dialog into dashboard**

Add the "New Basket" button on the dashboard page that opens the create dialog. On successful creation, redirect to the new basket's detail page.

**Step 5: Test manually**

- Click "New Basket", search for tickers, add them, create
- Verify basket appears on dashboard
- Verify basket_items created in Supabase

**Step 6: Commit**

```bash
git add src/components/create-basket-dialog.tsx src/components/ticker-search.tsx src/app/dashboard/actions.ts src/app/dashboard/page.tsx
git commit -m "feat: create basket flow with ticker search and weight modes"
```

---

### Task 7: Performance calculation logic

**Files:**
- Create: `src/lib/performance.ts`
- Create: `src/lib/__tests__/performance.test.ts`

**Step 1: Write failing tests**

Create `src/lib/__tests__/performance.test.ts`:
```typescript
import { calculateBasketPerformance } from "../performance";

const mockHistory = [
  {
    symbol: "AAPL",
    quotes: [
      { date: "2024-01-01", close: 100 },
      { date: "2024-01-02", close: 110 },
      { date: "2024-01-03", close: 105 },
    ],
  },
  {
    symbol: "GOOG",
    quotes: [
      { date: "2024-01-01", close: 200 },
      { date: "2024-01-02", close: 220 },
      { date: "2024-01-03", close: 210 },
    ],
  },
];

describe("calculateBasketPerformance", () => {
  it("calculates equal weight performance", () => {
    const result = calculateBasketPerformance(mockHistory, {
      mode: "equal",
      items: [{ ticker: "AAPL" }, { ticker: "GOOG" }],
    });

    // Day 1: both at 0%
    expect(result[0].value).toBe(0);
    // Day 2: AAPL +10%, GOOG +10%, avg = 10%
    expect(result[1].value).toBe(10);
    // Day 3: AAPL +5%, GOOG +5%, avg = 5%
    expect(result[2].value).toBe(5);
  });

  it("calculates custom weight performance", () => {
    const result = calculateBasketPerformance(mockHistory, {
      mode: "custom",
      items: [
        { ticker: "AAPL", weight: 75 },
        { ticker: "GOOG", weight: 25 },
      ],
    });

    // Day 2: AAPL +10% * 0.75 + GOOG +10% * 0.25 = 10%
    expect(result[1].value).toBe(10);
  });

  it("calculates dollar amount performance", () => {
    const result = calculateBasketPerformance(mockHistory, {
      mode: "dollar",
      items: [
        { ticker: "AAPL", dollarAmount: 1000 },
        { ticker: "GOOG", dollarAmount: 2000 },
      ],
    });

    // Day 1: total $3000
    expect(result[0].value).toBe(3000);
    // Day 2: AAPL 1000*(110/100)=1100, GOOG 2000*(220/200)=2200, total=3300
    expect(result[1].value).toBe(3300);
  });

  it("handles missing data points gracefully", () => {
    const sparse = [
      {
        symbol: "AAPL",
        quotes: [
          { date: "2024-01-01", close: 100 },
          { date: "2024-01-03", close: 105 },
        ],
      },
      {
        symbol: "GOOG",
        quotes: [
          { date: "2024-01-01", close: 200 },
          { date: "2024-01-02", close: 220 },
          { date: "2024-01-03", close: 210 },
        ],
      },
    ];

    const result = calculateBasketPerformance(sparse, {
      mode: "equal",
      items: [{ ticker: "AAPL" }, { ticker: "GOOG" }],
    });

    // Should not crash, should return data for dates where data exists
    expect(result.length).toBeGreaterThan(0);
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `npx jest src/lib/__tests__/performance.test.ts` (install jest + ts-jest if not set up)
Expected: FAIL — module not found

**Step 3: Implement performance calculation**

Create `src/lib/performance.ts`:
```typescript
type HistoryEntry = {
  symbol: string;
  quotes: { date: string; close: number }[];
};

type BasketConfig =
  | { mode: "equal"; items: { ticker: string }[] }
  | { mode: "custom"; items: { ticker: string; weight: number }[] }
  | { mode: "dollar"; items: { ticker: string; dollarAmount: number }[] };

type DataPoint = { date: string; value: number };

export function calculateBasketPerformance(
  history: HistoryEntry[],
  config: BasketConfig
): DataPoint[] {
  // Build a map of symbol → quotes
  const symbolMap = new Map<string, Map<string, number>>();
  const allDates = new Set<string>();

  for (const entry of history) {
    const dateMap = new Map<string, number>();
    for (const q of entry.quotes) {
      const dateStr = typeof q.date === "string" ? q.date : new Date(q.date).toISOString().split("T")[0];
      if (q.close != null) {
        dateMap.set(dateStr, q.close);
        allDates.add(dateStr);
      }
    }
    symbolMap.set(entry.symbol, dateMap);
  }

  const sortedDates = Array.from(allDates).sort();
  if (sortedDates.length === 0) return [];

  // Get base prices (first available price for each symbol)
  const basePrices = new Map<string, number>();
  for (const item of config.items) {
    const prices = symbolMap.get(item.ticker);
    if (prices) {
      for (const date of sortedDates) {
        const price = prices.get(date);
        if (price != null) {
          basePrices.set(item.ticker, price);
          break;
        }
      }
    }
  }

  return sortedDates.map((date) => {
    if (config.mode === "dollar") {
      let total = 0;
      for (const item of config.items) {
        const prices = symbolMap.get(item.ticker);
        const basePrice = basePrices.get(item.ticker);
        const currentPrice = prices?.get(date);
        if (basePrice && currentPrice) {
          total += item.dollarAmount * (currentPrice / basePrice);
        }
      }
      return { date, value: Math.round(total * 100) / 100 };
    }

    // Equal or custom weight — calculate % return
    let totalReturn = 0;
    let totalWeight = 0;

    for (const item of config.items) {
      const prices = symbolMap.get(item.ticker);
      const basePrice = basePrices.get(item.ticker);
      const currentPrice = prices?.get(date);
      if (!basePrice || !currentPrice) continue;

      const pctReturn = ((currentPrice - basePrice) / basePrice) * 100;
      const weight = config.mode === "custom" ? (item as { weight: number }).weight : 1;
      totalReturn += pctReturn * weight;
      totalWeight += weight;
    }

    const value = totalWeight > 0 ? Math.round((totalReturn / totalWeight) * 100) / 100 : 0;
    return { date, value };
  });
}
```

**Step 4: Run tests to verify they pass**

Run: `npx jest src/lib/__tests__/performance.test.ts -v`
Expected: All 4 tests PASS

**Step 5: Commit**

```bash
git add src/lib/performance.ts src/lib/__tests__/
git commit -m "feat: basket performance calculation with tests (equal, custom, dollar)"
```

---

### Task 8: Basket detail page — chart and ticker table

**Files:**
- Create: `src/app/basket/[id]/page.tsx`
- Create: `src/components/performance-chart.tsx`
- Create: `src/components/ticker-table.tsx`
- Create: `src/hooks/use-quotes.ts`
- Create: `src/hooks/use-history.ts`

**Step 1: Create data fetching hooks**

Create `src/hooks/use-quotes.ts` — fetches `/api/quote` and refetches every 15 minutes via `setInterval`. Returns `{ quotes, loading, error }`.

Create `src/hooks/use-history.ts` — fetches `/api/history` for given tickers and range. Returns `{ history, loading, error }`. Refetches when range changes.

**Step 2: Create performance chart component**

Create `src/components/performance-chart.tsx`:
- Takes history data and basket config
- Calls `calculateBasketPerformance` to compute the data series
- Renders a Recharts `LineChart` with `ResponsiveContainer`
- Time range tabs (1W, 1M, 3M, 6M, 1Y, ALL) above the chart
- Y-axis label: "% Return" for equal/custom, "$" for dollar mode
- Tooltip showing date and value on hover

**Step 3: Create ticker table component**

Create `src/components/ticker-table.tsx`:
- Shadcn Table showing: ticker, name, price, daily change (colored green/red), weight
- Delete button per row to remove a ticker
- Uses quote data from the polling hook

**Step 4: Create basket detail page**

Create `src/app/basket/[id]/page.tsx`:
- Server component fetches basket + items from Supabase
- Passes to client component that renders:
  - Basket name as header
  - PerformanceChart component
  - TickerTable component
  - "Add ticker" button that opens ticker search
- Server action to add/remove tickers (with `revalidatePath`)

**Step 5: Test manually**

- Create a basket with 2-3 tickers
- Navigate to detail page
- Verify chart renders with data
- Switch time ranges, verify chart updates
- Verify ticker table shows current prices
- Wait 15 minutes (or temporarily reduce interval) to verify auto-refresh

**Step 6: Commit**

```bash
git add src/app/basket/ src/components/performance-chart.tsx src/components/ticker-table.tsx src/hooks/
git commit -m "feat: basket detail page with performance chart and ticker table"
```

---

### Task 9: Dashboard sparklines

**Files:**
- Modify: `src/components/basket-card.tsx` (add sparkline)

**Step 1: Add mini chart to basket cards**

Update `src/components/basket-card.tsx`:
- On the dashboard, for each basket, fetch 1-month history for its tickers
- Calculate performance using `calculateBasketPerformance`
- Render a small Recharts `LineChart` (no axes, no labels, just the line) as a sparkline
- Show current total return % next to it

**Step 2: Test manually**

- Dashboard shows basket cards with sparklines
- Sparklines reflect actual performance data

**Step 3: Commit**

```bash
git add src/components/basket-card.tsx
git commit -m "feat: dashboard basket cards with performance sparklines"
```

---

### Task 10: Polish and deploy prep

**Files:**
- Modify: `src/app/layout.tsx` (metadata, fonts)
- Create: `.env.example`
- Modify: `src/app/globals.css` (any final styling)

**Step 1: Add metadata and clean up layout**

Update `src/app/layout.tsx` with proper title ("Track Basket"), description, and font setup.

**Step 2: Create .env.example**

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

**Step 3: Final manual test**

Full flow: sign up → create basket → add tickers → view chart → switch time ranges → see dashboard → log out → log in → data persists.

**Step 4: Commit**

```bash
git add .env.example src/app/layout.tsx src/app/globals.css
git commit -m "chore: metadata, env template, final polish"
```
