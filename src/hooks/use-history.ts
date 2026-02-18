"use client";
import { useState, useEffect } from "react";

type HistoryQuote = { date: string; close: number };
type HistoryEntry = { symbol: string; quotes: HistoryQuote[] };

export function useHistory(tickers: string[], range: string) {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const tickerKey = tickers.join(",");

  useEffect(() => {
    if (tickers.length === 0) {
      setHistory([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    fetch(`/api/history?tickers=${tickers.join(",")}&range=${range}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch history");
        return res.json();
      })
      .then((data) => {
        setHistory(data);
        setError(null);
      })
      .catch((e) =>
        setError(e instanceof Error ? e.message : "Unknown error")
      )
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tickerKey, range]);

  return { history, loading, error };
}
