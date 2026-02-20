"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { LineChart, Line, ResponsiveContainer } from "recharts";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { calculateBasketPerformance } from "@/lib/performance";
import type { Basket } from "@/lib/baskets";

function buildConfig(basket: Basket) {
  if (basket.weightMode === "dollar") {
    return {
      mode: "dollar" as const,
      items: basket.items.map((i) => ({
        ticker: i.ticker,
        dollarAmount: i.dollarAmount ?? 0,
      })),
    };
  }
  if (basket.weightMode === "custom") {
    return {
      mode: "custom" as const,
      items: basket.items.map((i) => ({
        ticker: i.ticker,
        weight: i.weight ?? 1,
      })),
    };
  }
  return {
    mode: "equal" as const,
    items: basket.items.map((i) => ({ ticker: i.ticker })),
  };
}

export function BasketCard({ basket }: { basket: Basket }) {
  const [perf, setPerf] = useState<{ date: string; value: number }[] | null>(
    null,
  );

  useEffect(() => {
    if (basket.items.length === 0) return;
    const tickers = basket.items.map((i) => i.ticker).join(",");
    fetch(`/api/history?tickers=${tickers}&range=1m`)
      .then((r) => r.json())
      .then((history) => {
        const data = calculateBasketPerformance(history, buildConfig(basket));
        setPerf(data);
      })
      .catch(() => {});
  }, [basket]);

  const lastValue = perf && perf.length > 0 ? perf[perf.length - 1].value : null;
  const isPositive = lastValue !== null && lastValue >= 0;
  const color = isPositive ? "#22c55e" : "#ef4444";

  return (
    <Link href={`/basket/${basket.id}`}>
      <Card className="transition-shadow hover:shadow-md">
        <CardHeader>
          <CardTitle>{basket.name}</CardTitle>
          <CardDescription>
            {basket.items.length} {basket.items.length === 1 ? "ticker" : "tickers"}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-between">
          <Badge variant="secondary">{basket.weightMode}</Badge>
          <div className="flex items-center gap-2">
            {perf && perf.length > 0 && (
              <>
                <div style={{ width: 80, height: 30 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={perf}>
                      <Line
                        type="monotone"
                        dataKey="value"
                        stroke={color}
                        dot={false}
                        strokeWidth={1.5}
                        isAnimationActive={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <span
                  className="text-xs font-medium"
                  style={{ color }}
                >
                  {isPositive ? "+" : ""}
                  {lastValue?.toFixed(2)}%
                  <span className="ml-1 text-muted-foreground font-normal">1M</span>
                </span>
              </>
            )}
            {!perf && basket.items.length > 0 && (
              <span className="text-xs text-muted-foreground">...</span>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
