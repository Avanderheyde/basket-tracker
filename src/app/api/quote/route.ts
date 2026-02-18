import YahooFinance from "yahoo-finance2";
import { NextRequest, NextResponse } from "next/server";

const yahooFinance = new YahooFinance();

export async function GET(request: NextRequest) {
  const tickers = request.nextUrl.searchParams.get("tickers");
  if (!tickers) {
    return NextResponse.json(
      { error: "tickers parameter required" },
      { status: 400 },
    );
  }

  const symbols = tickers.split(",").map((t) => t.trim().toUpperCase());

  try {
    const quotes = await Promise.all(
      symbols.map(async (symbol) => {
        const quote = await yahooFinance.quote(symbol);
        return {
          symbol: quote.symbol,
          name: quote.shortName ?? quote.longName,
          price: quote.regularMarketPrice,
          change: quote.regularMarketChange,
          changePercent: quote.regularMarketChangePercent,
        };
      }),
    );
    return NextResponse.json(quotes);
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch quotes" },
      { status: 500 },
    );
  }
}
