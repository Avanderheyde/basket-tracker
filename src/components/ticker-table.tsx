"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import type { BasketItem, WeightMode } from "@/lib/baskets";

type Quote = {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
};

export function TickerTable({
  quotes,
  items,
  weightMode,
  loading,
  onRemove,
}: {
  quotes: Quote[];
  items: BasketItem[];
  weightMode: WeightMode;
  loading: boolean;
  onRemove: (ticker: string) => void;
}) {
  const showWeight = weightMode === "custom" || weightMode === "dollar";

  if (loading) {
    return (
      <div className="py-8 text-center text-muted-foreground">
        Loading quotes...
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="py-8 text-center text-muted-foreground">
        No tickers in this basket yet.
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Ticker</TableHead>
          <TableHead>Name</TableHead>
          <TableHead className="text-right">Price</TableHead>
          <TableHead className="text-right">Change</TableHead>
          {showWeight && (
            <TableHead className="text-right">
              {weightMode === "dollar" ? "Amount" : "Weight"}
            </TableHead>
          )}
          <TableHead className="w-10" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((item) => {
          const quote = quotes.find((q) => q.symbol === item.ticker);
          return (
            <TableRow key={item.ticker}>
              <TableCell className="font-medium">{item.ticker}</TableCell>
              <TableCell>{quote?.name ?? "-"}</TableCell>
              <TableCell className="text-right">
                {quote ? `$${quote.price.toFixed(2)}` : "-"}
              </TableCell>
              <TableCell
                className={`text-right ${
                  quote
                    ? quote.change >= 0
                      ? "text-green-600"
                      : "text-red-600"
                    : ""
                }`}
              >
                {quote
                  ? `${quote.change >= 0 ? "+" : ""}${quote.change.toFixed(2)} (${quote.changePercent.toFixed(2)}%)`
                  : "-"}
              </TableCell>
              {showWeight && (
                <TableCell className="text-right">
                  {weightMode === "dollar"
                    ? `$${item.dollarAmount ?? 0}`
                    : `${((item.weight ?? 0) * 100).toFixed(1)}%`}
                </TableCell>
              )}
              <TableCell>
                <Button
                  variant="ghost"
                  size="icon-xs"
                  onClick={() => onRemove(item.ticker)}
                >
                  X
                </Button>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
