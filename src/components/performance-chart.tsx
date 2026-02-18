"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { calculateBasketPerformance } from "@/lib/performance";
import type { BasketItem, WeightMode } from "@/lib/baskets";

type HistoryEntry = {
  symbol: string;
  quotes: { date: string; close: number }[];
};

const RANGES = [
  { value: "1w", label: "1W" },
  { value: "1m", label: "1M" },
  { value: "3m", label: "3M" },
  { value: "6m", label: "6M" },
  { value: "1y", label: "1Y" },
  { value: "max", label: "ALL" },
];

function buildConfig(weightMode: WeightMode, items: BasketItem[]) {
  switch (weightMode) {
    case "equal":
      return {
        mode: "equal" as const,
        items: items.map((i) => ({ ticker: i.ticker })),
      };
    case "custom":
      return {
        mode: "custom" as const,
        items: items.map((i) => ({ ticker: i.ticker, weight: i.weight ?? 1 })),
      };
    case "dollar":
      return {
        mode: "dollar" as const,
        items: items.map((i) => ({
          ticker: i.ticker,
          dollarAmount: i.dollarAmount ?? 0,
        })),
      };
  }
}

export function PerformanceChart({
  history,
  weightMode,
  items,
  range,
  onRangeChange,
  loading,
}: {
  history: HistoryEntry[];
  weightMode: WeightMode;
  items: BasketItem[];
  range: string;
  onRangeChange: (range: string) => void;
  loading: boolean;
}) {
  const config = buildConfig(weightMode, items);
  const data = history.length > 0 ? calculateBasketPerformance(history, config) : [];
  const yLabel = weightMode === "dollar" ? "$" : "% Return";

  return (
    <div>
      <Tabs value={range} onValueChange={onRangeChange}>
        <TabsList>
          {RANGES.map((r) => (
            <TabsTrigger key={r.value} value={r.value}>
              {r.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <div className="mt-4 h-[300px]">
        {loading ? (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            Loading chart...
          </div>
        ) : data.length === 0 ? (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            No data available
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <XAxis
                dataKey="date"
                tick={{ fontSize: 12 }}
                tickFormatter={(d: string) => {
                  const date = new Date(d);
                  return `${date.getMonth() + 1}/${date.getDate()}`;
                }}
              />
              <YAxis
                tick={{ fontSize: 12 }}
                label={{
                  value: yLabel,
                  angle: -90,
                  position: "insideLeft",
                  style: { fontSize: 12 },
                }}
              />
              <Tooltip
                labelFormatter={(d) =>
                  new Date(String(d)).toLocaleDateString()
                }
                formatter={(value) => {
                  const v = Number(value);
                  return weightMode === "dollar"
                    ? [`$${v.toFixed(2)}`, "Value"]
                    : [`${v.toFixed(2)}%`, "Return"];
                }}
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
