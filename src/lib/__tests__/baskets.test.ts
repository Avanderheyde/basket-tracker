import {
  getBaskets,
  getBasket,
  createBasket,
  deleteBasket,
  addItem,
  removeItem,
} from "../baskets";

// Mock localStorage
const store: Record<string, string> = {};
beforeEach(() => {
  Object.keys(store).forEach((k) => delete store[k]);
  global.localStorage = {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, val: string) => {
      store[key] = val;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => Object.keys(store).forEach((k) => delete store[k]),
    length: 0,
    key: () => null,
  };
});

describe("baskets store", () => {
  it("starts empty", () => {
    expect(getBaskets()).toEqual([]);
  });

  it("creates a basket", () => {
    const basket = createBasket({ name: "Tech", weightMode: "equal" });
    expect(basket.name).toBe("Tech");
    expect(basket.id).toBeDefined();
    expect(getBaskets()).toHaveLength(1);
  });

  it("deletes a basket", () => {
    const basket = createBasket({ name: "Tech", weightMode: "equal" });
    deleteBasket(basket.id);
    expect(getBaskets()).toHaveLength(0);
  });

  it("adds items to a basket", () => {
    const basket = createBasket({ name: "Tech", weightMode: "equal" });
    addItem(basket.id, { ticker: "AAPL" });
    addItem(basket.id, { ticker: "GOOG" });
    const updated = getBasket(basket.id);
    expect(updated!.items).toHaveLength(2);
  });

  it("prevents duplicate tickers", () => {
    const basket = createBasket({ name: "Tech", weightMode: "equal" });
    addItem(basket.id, { ticker: "AAPL" });
    addItem(basket.id, { ticker: "AAPL" });
    const updated = getBasket(basket.id);
    expect(updated!.items).toHaveLength(1);
  });

  it("removes items from a basket", () => {
    const basket = createBasket({ name: "Tech", weightMode: "equal" });
    addItem(basket.id, { ticker: "AAPL" });
    removeItem(basket.id, "AAPL");
    const updated = getBasket(basket.id);
    expect(updated!.items).toHaveLength(0);
  });
});
