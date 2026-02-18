"use client";

import { useEffect, useState } from "react";
import { getBaskets, type Basket } from "@/lib/baskets";
import { BasketCard } from "@/components/basket-card";
import { Button } from "@/components/ui/button";

export default function DashboardPage() {
  const [baskets, setBaskets] = useState<Basket[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setBaskets(getBaskets());
    setLoaded(true);
  }, []);

  if (!loaded) return null;

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Your Baskets</h1>
        <Button>New Basket</Button>
      </div>

      {baskets.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
          <p className="text-muted-foreground">No baskets yet</p>
          <Button>New Basket</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {baskets.map((basket) => (
            <BasketCard key={basket.id} basket={basket} />
          ))}
        </div>
      )}
    </div>
  );
}
