import { request } from "./api/client";

export type TradeSide = "buy" | "sell";

export type TradeRequest = {
  stockAddress: string;
  stockSymbol: string;
} & (
  | { usdcAmount: number; stockAmount?: undefined }
  | { stockAmount: number; usdcAmount?: undefined }
);

export type TradeQuoteResponse = {
  success: boolean;
  message: string;
  data: {
    usdcAmount: number;
    stockAmount: number;
  };
};

export type TradeResult = {
  signature?: string;
  stockAmount?: number;
  usdcAmount?: number;
  [key: string]: unknown;
};

export type TradeResultResponse = {
  success: boolean;
  message: string;
  data: TradeResult;
};

export type RecurringBuyStock = {
  tokenAddress: string;
  price: string;
  name: string;
  decimals: number;
  symbol: string;
  imageUrl: string;
  marketOpenPrice: string;
  stockType: "USStock" | "PreIPO";
};

export type RecurringBuy = {
  id: string;
  stockAddress: string;
  userId: string;
  usdcAmount: string | null;
  stockAmount: string | null;
  buyDate: string;
  isActive: boolean;
   stock: RecurringBuyStock;
};

export type RecurringBuysResponse = {
  success: boolean;
  message: string;
  data: RecurringBuy[];
};

export type RecurringBuyRequest = {
  stockAddress: string;
  usdcAmount: string | undefined;
  stockAmount: string | undefined;
  buyDate: string;
  stockSymbol: string;
};

export type StartRecurringBuyResponse = {
  success: boolean;
  message: string;
  data: RecurringBuy;
};

export type CancelRecurringBuyRequest = {
  recurringId: string;
};

export type CancelRecurringBuyResponse = {
  success: boolean;
  message: string;
};

export const getTradeQuote = (side: TradeSide, req: TradeRequest, token: string) =>
  request<TradeQuoteResponse>(`/api/trade/get-quote-${side}`, {
    method: "POST",
    body: req,
    token,
  });

export const buyStock = (req: TradeRequest, token: string) =>
  request<TradeResultResponse>("/api/trade/stock-buy", {
    method: "POST",
    body: req,
    token,
  });

export const sellStock = (req: TradeRequest, token: string) =>
  request<TradeResultResponse>("/api/trade/stock-sell", {
    method: "POST",
    body: req,
    token,
  });

export const getRecurringBuys = (idToken: string) =>
  request<RecurringBuysResponse>("/api/user/recurring-buy-requests", {
    token: idToken,
  });

export const startRecurringBuy = (req: RecurringBuyRequest, idToken: string) =>
  request<StartRecurringBuyResponse>("/api/trade/start-recurring-buy", {
    method: "POST",
    body: req,
    token: idToken,
  });

export const cancelRecurringBuy = (recurringId: string, idToken: string) =>
  request<CancelRecurringBuyResponse>(
    "/api/user/cancel-recurring-request",
    {
      method: "POST",
      body: { recurringId } satisfies CancelRecurringBuyRequest,
      token: idToken,
    },
  );