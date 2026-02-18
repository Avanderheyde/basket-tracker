"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TickerSearch } from "@/components/ticker-search";
import {
  createBasket,
  addItem,
  type WeightMode,
} from "@/lib/baskets";

type TickerEntry = {
  symbol: string;
  name: string;
  weight: number;
  dollarAmount: number;
};

export function CreateBasketDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [weightMode, setWeightMode] = useState<WeightMode>("equal");
  const [tickers, setTickers] = useState<TickerEntry[]>([]);

  function reset() {
    setName("");
    setWeightMode("equal");
    setTickers([]);
  }

  function handleAddTicker(symbol: string, tickerName: string) {
    if (tickers.some((t) => t.symbol === symbol.toUpperCase())) return;
    setTickers((prev) => [
      ...prev,
      { symbol: symbol.toUpperCase(), name: tickerName, weight: 0, dollarAmount: 0 },
    ]);
  }

  function handleRemoveTicker(symbol: string) {
    setTickers((prev) => prev.filter((t) => t.symbol !== symbol));
  }

  function handleWeightChange(symbol: string, value: string) {
    const num = parseFloat(value) || 0;
    setTickers((prev) =>
      prev.map((t) => (t.symbol === symbol ? { ...t, weight: num } : t)),
    );
  }

  function handleDollarChange(symbol: string, value: string) {
    const num = parseFloat(value) || 0;
    setTickers((prev) =>
      prev.map((t) => (t.symbol === symbol ? { ...t, dollarAmount: num } : t)),
    );
  }

  function handleCreate() {
    if (!name.trim() || tickers.length === 0) return;

    const basket = createBasket({ name: name.trim(), weightMode });

    for (const t of tickers) {
      addItem(basket.id, {
        ticker: t.symbol,
        weight: weightMode === "custom" ? t.weight : undefined,
        dollarAmount: weightMode === "dollar" ? t.dollarAmount : undefined,
      });
    }

    reset();
    onOpenChange(false);
    router.push(`/basket/${basket.id}`);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) reset();
        onOpenChange(v);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Basket</DialogTitle>
          <DialogDescription>
            Add a name, choose a weight mode, and search for tickers.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label htmlFor="basket-name">Name</Label>
            <Input
              id="basket-name"
              placeholder="My Basket"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="grid gap-2">
            <Label>Weight Mode</Label>
            <Select
              value={weightMode}
              onValueChange={(v) => setWeightMode(v as WeightMode)}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="equal">Equal</SelectItem>
                <SelectItem value="custom">Custom %</SelectItem>
                <SelectItem value="dollar">Dollar Amount</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label>Add Tickers</Label>
            <TickerSearch onSelect={handleAddTicker} />
          </div>

          {tickers.length > 0 && (
            <div className="grid gap-2">
              <Label>Tickers</Label>
              <ul className="grid gap-1">
                {tickers.map((t) => (
                  <li
                    key={t.symbol}
                    className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm"
                  >
                    <span className="font-medium">{t.symbol}</span>
                    <span className="text-muted-foreground truncate">
                      {t.name}
                    </span>
                    <span className="flex-1" />
                    {weightMode === "custom" && (
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        className="h-7 w-20"
                        placeholder="%"
                        value={t.weight || ""}
                        onChange={(e) =>
                          handleWeightChange(t.symbol, e.target.value)
                        }
                      />
                    )}
                    {weightMode === "dollar" && (
                      <Input
                        type="number"
                        min={0}
                        className="h-7 w-24"
                        placeholder="$"
                        value={t.dollarAmount || ""}
                        onChange={(e) =>
                          handleDollarChange(t.symbol, e.target.value)
                        }
                      />
                    )}
                    <button
                      type="button"
                      className="ml-1 text-muted-foreground hover:text-foreground"
                      onClick={() => handleRemoveTicker(t.symbol)}
                    >
                      &times;
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            onClick={handleCreate}
            disabled={!name.trim() || tickers.length === 0}
          >
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
