"use client";
import { useState, useEffect, useCallback } from "react";

type Quote = {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
};

export function useQuotes(tickers: string[]) {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const tickerKey = tickers.join(",");

  const fetchQuotes = useCallback(async () => {
    if (tickers.length === 0) {
      setQuotes([]);
      setLoading(false);
      return;
    }
    try {
      const res = await fetch(`/api/quote?tickers=${tickers.join(",")}`);
      if (!res.ok) throw new Error("Failed to fetch quotes");
      setQuotes(await res.json());
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tickerKey]);

  useEffect(() => {
    fetchQuotes();
    const interval = setInterval(fetchQuotes, 15 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchQuotes]);

  return { quotes, loading, error };
}
