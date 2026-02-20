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
      const dateStr = new Date(q.date).toISOString().split("T")[0];
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
