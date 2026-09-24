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

export type RecurringBuyRequest = {
  stockAddress: string;
  usdcAmount?: string;
  stockAmount?: string;
  buyDate: string; 
};

export type RecurringBuyResult = {
  id?: string;
  stockAddress?: string;
  usdcAmount?: string;
  stockAmount?: string;
  buyDate?: string;
  [key: string]: unknown;
};

export type RecurringBuyResponse = {
  success: boolean;
  message: string;
  data: RecurringBuyResult;
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

  export const startRecurringBuy = (req: RecurringBuyRequest, token: string) =>
  request<RecurringBuyResponse>("/api/trade/start-recurring-buy", {
    method: "POST",
    body: req,
    token,
  });