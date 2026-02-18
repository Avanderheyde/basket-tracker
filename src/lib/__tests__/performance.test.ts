import { calculateBasketPerformance } from "../performance";

const mockHistory = [
  {
    symbol: "AAPL",
    quotes: [
      { date: "2024-01-01", close: 100 },
      { date: "2024-01-02", close: 110 },
      { date: "2024-01-03", close: 105 },
    ],
  },
  {
    symbol: "GOOG",
    quotes: [
      { date: "2024-01-01", close: 200 },
      { date: "2024-01-02", close: 220 },
      { date: "2024-01-03", close: 210 },
    ],
  },
];

describe("calculateBasketPerformance", () => {
  it("calculates equal weight performance", () => {
    const result = calculateBasketPerformance(mockHistory, {
      mode: "equal",
      items: [{ ticker: "AAPL" }, { ticker: "GOOG" }],
    });

    expect(result[0].value).toBe(0);
    expect(result[1].value).toBe(10);
    expect(result[2].value).toBe(5);
  });

  it("calculates custom weight performance", () => {
    const result = calculateBasketPerformance(mockHistory, {
      mode: "custom",
      items: [
        { ticker: "AAPL", weight: 75 },
        { ticker: "GOOG", weight: 25 },
      ],
    });

    expect(result[1].value).toBe(10);
  });

  it("calculates dollar amount performance", () => {
    const result = calculateBasketPerformance(mockHistory, {
      mode: "dollar",
      items: [
        { ticker: "AAPL", dollarAmount: 1000 },
        { ticker: "GOOG", dollarAmount: 2000 },
      ],
    });

    expect(result[0].value).toBe(3000);
    expect(result[1].value).toBe(3300);
  });

  it("handles missing data points gracefully", () => {
    const sparse = [
      {
        symbol: "AAPL",
        quotes: [
          { date: "2024-01-01", close: 100 },
          { date: "2024-01-03", close: 105 },
        ],
      },
      {
        symbol: "GOOG",
        quotes: [
          { date: "2024-01-01", close: 200 },
          { date: "2024-01-02", close: 220 },
          { date: "2024-01-03", close: 210 },
        ],
      },
    ];

    const result = calculateBasketPerformance(sparse, {
      mode: "equal",
      items: [{ ticker: "AAPL" }, { ticker: "GOOG" }],
    });

    expect(result.length).toBeGreaterThan(0);
  });
});
