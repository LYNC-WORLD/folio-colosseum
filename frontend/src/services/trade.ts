import { ENV } from "../config";

const API_URL = ENV.API_URL ?? "http://localhost:5000";

export type TradeSide = "buy" | "sell";

// Exactly one of usdcAmount / stockAmount is sent
export type TradeRequest = {
  stockAddress: string;
  stockSymbol: string;
} & (
  | { usdcAmount: number; stockAmount?: undefined }
  | { stockAmount: number; usdcAmount?: undefined }
);

// ⚠️ Adjust these to match what your API actually returns
export type TradeQuote = {
  usdcAmount: number; // USDC you'll pay
  stockAmount: number; // stock you'll receive
};

export type BuyResult = {
  signature?: string;
  stockAmount?: number;
  usdcAmount?: number;
  [key: string]: unknown;
};

async function post<T>(path: string, token: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body), // undefined fields are dropped automatically
  });

  const json = await res.json().catch(() => null);

  if (!res.ok) {
    throw new Error(
      json?.message ?? json?.error ?? `Request failed (${res.status})`,
    );
  }

  // Supports both `{ data: {...} }` and a bare object
  return (json?.data ?? json) as T;
}

export function getTradeQuote(
  side: TradeSide,
  token: string,
  req: TradeRequest,
) {
  return post<TradeQuote>(`/api/trade/get-quote-${side}`, token, req);
}

export function buyStock(token: string, req: TradeRequest) {
  return post<BuyResult>("/api/trade/stock-buy", token, req);
}
