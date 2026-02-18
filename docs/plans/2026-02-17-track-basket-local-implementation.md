# Track Basket Implementation Plan (Local)

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a local, open-source stock basket tracking dashboard. No auth, no external DB. Baskets persist in localStorage.

**Architecture:** Next.js app with client-side state stored in localStorage. Yahoo Finance data fetched via Next.js API routes (server-side proxy to avoid CORS). All basket CRUD is client-side only.

**Tech Stack:** Next.js 16, TypeScript, Tailwind CSS, Shadcn/ui, Recharts, yahoo-finance2

---

### Task 1: Scaffold Next.js project

**Status: DONE** (commit ac486a5)

Already scaffolded with all deps (minus Supabase, removed in eb3aa42).

---

### Task 2: localStorage basket store

**Files:**
- Create: `src/lib/baskets.ts`
- Create: `src/lib/__tests__/baskets.test.ts`

**Step 1: Write failing tests**

Create `src/lib/__tests__/baskets.test.ts`:
```typescript
import {
  getBaskets,
  getBasket,
  createBasket,
  deleteBasket,
  addItem,
  removeItem,
} from "../baskets";

// Mock localStorage
const store: Record<string, string> = {};
beforeEach(() => {
  Object.keys(store).forEach((k) => delete store[k]);
  global.localStorage = {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, val: string) => { store[key] = val; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => Object.keys(store).forEach((k) => delete store[k]),
    length: 0,
    key: () => null,
  };
});

describe("baskets store", () => {
  it("starts empty", () => {
    expect(getBaskets()).toEqual([]);
  });

  it("creates a basket", () => {
    const basket = createBasket({ name: "Tech", weightMode: "equal" });
    expect(basket.name).toBe("Tech");
    expect(basket.id).toBeDefined();
    expect(getBaskets()).toHaveLength(1);
  });

  it("deletes a basket", () => {
    const basket = createBasket({ name: "Tech", weightMode: "equal" });
    deleteBasket(basket.id);
    expect(getBaskets()).toHaveLength(0);
  });

  it("adds items to a basket", () => {
    const basket = createBasket({ name: "Tech", weightMode: "equal" });
    addItem(basket.id, { ticker: "AAPL" });
    addItem(basket.id, { ticker: "GOOG" });
    const updated = getBasket(basket.id);
    expect(updated!.items).toHaveLength(2);
  });

  it("prevents duplicate tickers", () => {
    const basket = createBasket({ name: "Tech", weightMode: "equal" });
    addItem(basket.id, { ticker: "AAPL" });
    addItem(basket.id, { ticker: "AAPL" });
    const updated = getBasket(basket.id);
    expect(updated!.items).toHaveLength(1);
  });

  it("removes items from a basket", () => {
    const basket = createBasket({ name: "Tech", weightMode: "equal" });
    addItem(basket.id, { ticker: "AAPL" });
    removeItem(basket.id, "AAPL");
    const updated = getBasket(basket.id);
    expect(updated!.items).toHaveLength(0);
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `npx jest src/lib/__tests__/baskets.test.ts`
Expected: FAIL — module not found

**Step 3: Implement basket store**

Create `src/lib/baskets.ts`:
```typescript
export type WeightMode = "equal" | "custom" | "dollar";

export type BasketItem = {
  ticker: string;
  weight?: number;
  dollarAmount?: number;
  addedAt: string;
};

export type Basket = {
  id: string;
  name: string;
  weightMode: WeightMode;
  items: BasketItem[];
  createdAt: string;
};

const STORAGE_KEY = "track-basket-data";

function load(): Basket[] {
  const raw = localStorage.getItem(STORAGE_KEY);
  return raw ? JSON.parse(raw) : [];
}

function save(baskets: Basket[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(baskets));
}

export function getBaskets(): Basket[] {
  return load();
}

export function getBasket(id: string): Basket | undefined {
  return load().find((b) => b.id === id);
}

export function createBasket(params: {
  name: string;
  weightMode: WeightMode;
}): Basket {
  const baskets = load();
  const basket: Basket = {
    id: crypto.randomUUID(),
    name: params.name,
    weightMode: params.weightMode,
    items: [],
    createdAt: new Date().toISOString(),
  };
  baskets.push(basket);
  save(baskets);
  return basket;
}

export function deleteBasket(id: string) {
  save(load().filter((b) => b.id !== id));
}

export function addItem(
  basketId: string,
  item: { ticker: string; weight?: number; dollarAmount?: number }
) {
  const baskets = load();
  const basket = baskets.find((b) => b.id === basketId);
  if (!basket) return;
  if (basket.items.some((i) => i.ticker === item.ticker.toUpperCase())) return;
  basket.items.push({
    ticker: item.ticker.toUpperCase(),
    weight: item.weight,
    dollarAmount: item.dollarAmount,
    addedAt: new Date().toISOString(),
  });
  save(baskets);
}

export function removeItem(basketId: string, ticker: string) {
  const baskets = load();
  const basket = baskets.find((b) => b.id === basketId);
  if (!basket) return;
  basket.items = basket.items.filter((i) => i.ticker !== ticker.toUpperCase());
  save(baskets);
}
```

**Step 4: Run tests to verify they pass**

Run: `npx jest src/lib/__tests__/baskets.test.ts -v`
Expected: All 6 tests PASS

**Step 5: Commit**

```bash
git add src/lib/baskets.ts src/lib/__tests__/
git commit -m "feat: localStorage basket store with tests"
```

---

### Task 3: Yahoo Finance API routes

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
        };
      })
    );
    return NextResponse.json(quotes);
  } catch {
    return NextResponse.json({ error: "Failed to fetch quotes" }, { status: 500 });
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
  } catch {
    return NextResponse.json({ error: "Failed to fetch history" }, { status: 500 });
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
  } catch {
    return NextResponse.json({ error: "Failed to search" }, { status: 500 });
  }
}
```

**Step 4: Test API routes manually**

Run `npm run dev` and test:
- `http://localhost:3000/api/quote?tickers=AAPL,GOOG`
- `http://localhost:3000/api/history?tickers=AAPL&range=1m`
- `http://localhost:3000/api/search?q=apple`

**Step 5: Commit**

```bash
git add src/app/api/
git commit -m "feat: Yahoo Finance API routes — quote, history, search"
```

---

### Task 4: Performance calculation logic

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

    expect(result[0].value).toBe(0);
    expect(result[1].value).toBe(10);
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

    expect(result[0].value).toBe(3000);
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

    expect(result.length).toBeGreaterThan(0);
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `npx jest src/lib/__tests__/performance.test.ts`
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
  const symbolMap = new Map<string, Map<string, number>>();
  const allDates = new Set<string>();

  for (const entry of history) {
    const dateMap = new Map<string, number>();
    for (const q of entry.quotes) {
      const dateStr =
        typeof q.date === "string"
          ? q.date
          : new Date(q.date).toISOString().split("T")[0];
      if (q.close != null) {
        dateMap.set(dateStr, q.close);
        allDates.add(dateStr);
      }
    }
    symbolMap.set(entry.symbol, dateMap);
  }

  const sortedDates = Array.from(allDates).sort();
  if (sortedDates.length === 0) return [];

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

    let totalReturn = 0;
    let totalWeight = 0;

    for (const item of config.items) {
      const prices = symbolMap.get(item.ticker);
      const basePrice = basePrices.get(item.ticker);
      const currentPrice = prices?.get(date);
      if (!basePrice || !currentPrice) continue;

      const pctReturn = ((currentPrice - basePrice) / basePrice) * 100;
      const weight =
        config.mode === "custom"
          ? (item as { weight: number }).weight
          : 1;
      totalReturn += pctReturn * weight;
      totalWeight += weight;
    }

    const value =
      totalWeight > 0
        ? Math.round((totalReturn / totalWeight) * 100) / 100
        : 0;
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
git commit -m "feat: basket performance calculation with tests"
```

---

### Task 5: Dashboard page — list baskets

**Files:**
- Create: `src/app/dashboard/page.tsx`
- Create: `src/components/basket-card.tsx`
- Modify: `src/app/page.tsx` (redirect to /dashboard)
- Modify: `src/app/layout.tsx` (add nav bar)

**Step 1: Update root layout with nav**

Modify `src/app/layout.tsx` to include a top nav bar with "Track Basket" title. Simple, no auth.

**Step 2: Redirect landing to dashboard**

Modify `src/app/page.tsx` to redirect to `/dashboard` (or just make dashboard the home page).

**Step 3: Create basket card component**

Create `src/components/basket-card.tsx` — a Card showing basket name, ticker count, weight mode badge, and created date. Links to `/basket/[id]`.

**Step 4: Create dashboard page**

Create `src/app/dashboard/page.tsx`:
- Client component that reads baskets from localStorage via `getBaskets()`
- Renders a grid of BasketCard components
- Shows empty state with "Create your first basket" CTA
- "New Basket" button in the header

**Step 5: Test manually**

- Visit `/dashboard`, see empty state
- (We'll test with real baskets after Task 6)

**Step 6: Commit**

```bash
git add src/app/ src/components/basket-card.tsx
git commit -m "feat: dashboard page with basket cards"
```

---

### Task 6: Create basket flow

**Files:**
- Create: `src/components/create-basket-dialog.tsx`
- Create: `src/components/ticker-search.tsx`

**Step 1: Create ticker search component**

Create `src/components/ticker-search.tsx`:
- Input with debounced (300ms) calls to `/api/search`
- Dropdown showing matching tickers (symbol + company name)
- Click to select, calls `onSelect(symbol)` callback

**Step 2: Create basket dialog**

Create `src/components/create-basket-dialog.tsx` using Shadcn Dialog:
- Name input
- Weight mode select (equal/custom/dollar)
- Ticker search to add tickers
- List of added tickers with remove button
- If custom weight: weight % input per ticker
- If dollar: dollar amount input per ticker
- "Create" button that calls `createBasket()` + `addItem()` from baskets store
- On success: close dialog, navigate to `/basket/[id]`

**Step 3: Wire into dashboard**

Import and render the dialog in the dashboard page, triggered by "New Basket" button.

**Step 4: Test manually**

- Click "New Basket", search tickers, add them, create
- Verify basket appears on dashboard
- Verify data persists after page refresh (localStorage)

**Step 5: Commit**

```bash
git add src/components/create-basket-dialog.tsx src/components/ticker-search.tsx src/app/dashboard/
git commit -m "feat: create basket flow with ticker search"
```

---

### Task 7: Basket detail page — chart and ticker table

**Files:**
- Create: `src/app/basket/[id]/page.tsx`
- Create: `src/components/performance-chart.tsx`
- Create: `src/components/ticker-table.tsx`
- Create: `src/hooks/use-quotes.ts`
- Create: `src/hooks/use-history.ts`

**Step 1: Create data fetching hooks**

Create `src/hooks/use-quotes.ts`:
- Fetches `/api/quote?tickers=...`
- Refetches every 15 minutes via `setInterval`
- Returns `{ quotes, loading, error }`

Create `src/hooks/use-history.ts`:
- Fetches `/api/history?tickers=...&range=...`
- Returns `{ history, loading, error }`
- Refetches when range changes

**Step 2: Create performance chart component**

Create `src/components/performance-chart.tsx`:
- Takes history data and basket config
- Calls `calculateBasketPerformance()` to compute data series
- Renders Recharts `LineChart` with `ResponsiveContainer`
- Time range tabs (1W, 1M, 3M, 6M, 1Y, ALL) above chart
- Y-axis: "% Return" for equal/custom, "$" for dollar mode
- Tooltip showing date and value on hover

**Step 3: Create ticker table component**

Create `src/components/ticker-table.tsx`:
- Shadcn Table: ticker, name, price, daily change (green/red), weight
- Delete button per row (calls `removeItem()` from baskets store)
- Uses quote data from polling hook

**Step 4: Create basket detail page**

Create `src/app/basket/[id]/page.tsx`:
- Client component that reads basket from localStorage
- Renders: basket name header, PerformanceChart, TickerTable
- "Add ticker" button that opens ticker search
- Back link to dashboard

**Step 5: Test manually**

- Create a basket with 2-3 tickers
- Navigate to detail page
- Verify chart renders with data
- Switch time ranges
- Verify ticker table shows current prices
- Remove a ticker, verify it disappears

**Step 6: Commit**

```bash
git add src/app/basket/ src/components/performance-chart.tsx src/components/ticker-table.tsx src/hooks/
git commit -m "feat: basket detail page with performance chart and ticker table"
```

---

### Task 8: Dashboard sparklines and polish

**Files:**
- Modify: `src/components/basket-card.tsx` (add sparkline)
- Modify: `src/app/layout.tsx` (metadata)

**Step 1: Add sparklines to basket cards**

Update `src/components/basket-card.tsx`:
- Fetch 1-month history for the basket's tickers
- Calculate performance using `calculateBasketPerformance`
- Render small Recharts `LineChart` (no axes, just the line) as sparkline
- Show current total return % next to it

**Step 2: Add metadata**

Update `src/app/layout.tsx` with title "Track Basket" and description.

**Step 3: Final manual test**

Full flow: create basket → add tickers → view chart → switch time ranges → see dashboard with sparklines → refresh page → data persists.

**Step 4: Commit**

```bash
git add src/components/basket-card.tsx src/app/layout.tsx
git commit -m "feat: dashboard sparklines and metadata"
```
