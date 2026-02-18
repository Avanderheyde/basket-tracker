"use client";

import Link from "next/link";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Basket } from "@/lib/baskets";

export function BasketCard({ basket }: { basket: Basket }) {
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
          <span className="text-xs text-muted-foreground">
            {new Date(basket.createdAt).toLocaleDateString()}
          </span>
        </CardContent>
      </Card>
    </Link>
  );
}
