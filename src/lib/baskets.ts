export type WeightMode = "equal" | "custom" | "dollar";

export type BasketItem = {
  ticker: string;
  weight?: number;
  dollarAmount?: number;
  addedAt: string;
};

export type Basket = {
  id: string;
  name: string;
  weightMode: WeightMode;
  items: BasketItem[];
  createdAt: string;
};

const STORAGE_KEY = "track-basket-data";

function load(): Basket[] {
  const raw = localStorage.getItem(STORAGE_KEY);
  return raw ? JSON.parse(raw) : [];
}

function save(baskets: Basket[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(baskets));
}

export function getBaskets(): Basket[] {
  return load();
}

export function getBasket(id: string): Basket | undefined {
  return load().find((b) => b.id === id);
}

export function createBasket(params: {
  name: string;
  weightMode: WeightMode;
}): Basket {
  const baskets = load();
  const basket: Basket = {
    id: crypto.randomUUID(),
    name: params.name,
    weightMode: params.weightMode,
    items: [],
    createdAt: new Date().toISOString(),
  };
  baskets.push(basket);
  save(baskets);
  return basket;
}

export function deleteBasket(id: string) {
  save(load().filter((b) => b.id !== id));
}

export function addItem(
  basketId: string,
  item: { ticker: string; weight?: number; dollarAmount?: number }
) {
  const baskets = load();
  const basket = baskets.find((b) => b.id === basketId);
  if (!basket) return;
  if (basket.items.some((i) => i.ticker === item.ticker.toUpperCase())) return;
  basket.items.push({
    ticker: item.ticker.toUpperCase(),
    weight: item.weight,
    dollarAmount: item.dollarAmount,
    addedAt: new Date().toISOString(),
  });
  save(baskets);
}

export function removeItem(basketId: string, ticker: string) {
  const baskets = load();
  const basket = baskets.find((b) => b.id === basketId);
  if (!basket) return;
  basket.items = basket.items.filter((i) => i.ticker !== ticker.toUpperCase());
  save(baskets);
}
