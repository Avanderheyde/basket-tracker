import YahooFinance from "yahoo-finance2";
import { NextRequest, NextResponse } from "next/server";

const yahooFinance = new YahooFinance();

function getPeriod1(range: string): Date {
  const now = new Date();
  switch (range) {
    case "1w":
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    case "1m":
      return new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
    case "3m":
      return new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
    case "6m":
      return new Date(now.getFullYear(), now.getMonth() - 6, now.getDate());
    case "1y":
      return new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
    case "max":
      return new Date("1970-01-01");
    default:
      return new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
  }
}

function getInterval(range: string): "1d" | "1wk" {
  return range === "max" ? "1wk" : "1d";
}

export async function GET(request: NextRequest) {
  const tickers = request.nextUrl.searchParams.get("tickers");
  const range = request.nextUrl.searchParams.get("range") ?? "1m";

  if (!tickers) {
    return NextResponse.json(
      { error: "tickers parameter required" },
      { status: 400 },
    );
  }

  const symbols = tickers.split(",").map((t) => t.trim().toUpperCase());

  try {
    const results = await Promise.all(
      symbols.map(async (symbol) => {
        const result = await yahooFinance.chart(symbol, {
          period1: getPeriod1(range),
          interval: getInterval(range),
        });
        return {
          symbol,
          quotes: result.quotes.map((q) => ({
            date: q.date,
            close: q.close,
          })),
        };
      }),
    );
    return NextResponse.json(results);
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch history" },
      { status: 500 },
    );
  }
}
