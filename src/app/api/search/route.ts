import YahooFinance from "yahoo-finance2";
import { NextRequest, NextResponse } from "next/server";

const yahooFinance = new YahooFinance();

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q");
  if (!query) {
    return NextResponse.json(
      { error: "q parameter required" },
      { status: 400 },
    );
  }

  try {
    const result = await yahooFinance.search(query);
    const quotes = result.quotes
      .filter((q) => q.isYahooFinance && "quoteType" in q && q.quoteType === "EQUITY")
      .slice(0, 10)
      .map((q) => ({
        symbol: q.symbol,
        name: ("shortname" in q ? q.shortname : undefined) ?? ("longname" in q ? q.longname : undefined),
        exchange: q.exchange,
      }));
    return NextResponse.json(quotes);
  } catch {
    return NextResponse.json(
      { error: "Failed to search" },
      { status: 500 },
    );
  }
}
