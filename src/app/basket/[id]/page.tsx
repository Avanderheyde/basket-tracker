"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { getBasket, removeItem, type Basket } from "@/lib/baskets";
import { useHistory } from "@/hooks/use-history";
import { useQuotes } from "@/hooks/use-quotes";
import { PerformanceChart } from "@/components/performance-chart";
import { TickerTable } from "@/components/ticker-table";
import { Button } from "@/components/ui/button";

export default function BasketDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [basket, setBasket] = useState<Basket | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [range, setRange] = useState("1m");

  useEffect(() => {
    const b = getBasket(id);
    setBasket(b ?? null);
    setLoaded(true);
  }, [id]);

  const tickers = basket?.items.map((i) => i.ticker) ?? [];
  const { history, loading: historyLoading } = useHistory(tickers, range);
  const { quotes, loading: quotesLoading } = useQuotes(tickers);

  function handleRemove(ticker: string) {
    if (!basket) return;
    removeItem(basket.id, ticker);
    setBasket(getBasket(id) ?? null);
  }

  if (!loaded) return null;

  if (!basket) {
    return (
      <div className="py-24 text-center">
        <p className="mb-4 text-muted-foreground">Basket not found</p>
        <Link href="/dashboard" className="text-primary underline">
          Back to dashboard
        </Link>
      </div>
    );
  }

  return (
    <div>
      <Link
        href="/dashboard"
        className="mb-4 inline-block text-sm text-muted-foreground hover:text-foreground"
      >
        &larr; Back to dashboard
      </Link>

      <h1 className="mb-6 text-2xl font-bold">{basket.name}</h1>

      <section className="mb-8">
        <PerformanceChart
          history={history}
          weightMode={basket.weightMode}
          items={basket.items}
          range={range}
          onRangeChange={setRange}
          loading={historyLoading}
        />
      </section>

      <section className="mb-8">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Holdings</h2>
          <Button variant="outline" size="sm" disabled>
            Add ticker
          </Button>
        </div>
        <TickerTable
          quotes={quotes}
          items={basket.items}
          weightMode={basket.weightMode}
          loading={quotesLoading}
          onRemove={handleRemove}
        />
      </section>
    </div>
  );
}
