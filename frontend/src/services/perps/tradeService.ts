// Calls to OUR backend. The backend holds each user's agent key, signs and forwards to
// POST https://api.hyperliquid.xyz/exchange (order, cancel, modify, updateLeverage,
// updateIsolatedMargin) and attaches Folio's builder fee. The app never holds the agent key.

import { request } from "../api/client";

export interface PlaceOrderBase {
  stockSymbol: string;
  dollarSize: number;
  leverage: number;
  isBuy: boolean;
  margin: "ISOLATED" | "CROSS";
  tpPrice: number | undefined;
  slPrice: number | undefined;
  tpPercent: number | undefined;
  slPercent: number | undefined;
}
export type PlaceMarketOrder = PlaceOrderBase;
export interface PlaceLimitOrder extends PlaceOrderBase {
  limitPrice: number;
}

export interface PositionApi {
  coin: string; // "xyz:NVDA"
  szi: string; // signed: negative = short
  leverage: { type: "cross" | "isolated"; value: number };
  entryPx: string;
  positionValue: string;
  unrealizedPnl: string;
  returnOnEquity: string;
  liquidationPx: string | null;
  marginUsed: string;
  maxLeverage: number;
  cumFunding: { allTime: string; sinceOpen: string; sinceChange: string };
}

export interface PositionResponse {
  type: "oneWay" | string;
  position: PositionApi | null;
}

export interface OrderApi {
  oid: number;
  coin: string;
  stockSymbol: string;
  isBuy: boolean;
  orderType: "market" | "limit" | "stop";
  price: string;
  size: string;
  reduceOnly?: boolean;
  timestamp?: number; // ms
}

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
}

export type OrderKind = "market" | "limit" | "stop";

export interface PlaceOrderPayload {
  coin: string; // "xyz:NVDA"
  isBuy: boolean;
  size: string; // already rounded to szDecimals
  kind: OrderKind;
  /** market: worst acceptable price (slippage cap) · limit: limit price · stop: trigger price */
  price: string;
  leverage: number; // backend calls updateLeverage first if it changed
  isCross: boolean;
  reduceOnly?: boolean;
  postOnly?: boolean; // limit only -> tif "Alo"
  tp?: string | null; // attached as normalTpsl trigger orders
  sl?: string | null;
  cloid: `0x${string}`;
}

export interface OrderResult {
  status: "filled" | "resting" | "error";
  oid?: number;
  avgPx?: string;
  totalSz?: string;
  error?: string;
}

export interface TpslPayload {
  coin: string;
  isLong: boolean;
  /** Position size to protect. Backend places positionTpsl trigger orders. */
  size: string;
  tp: string | null;
  sl: string | null;
  /** Existing TP/SL orders to replace. */
  cancelOids?: number[];
}

export interface AgentStatus {
  agentAddress: `0x${string}` | null;
  agentName: string | null;
  approved: boolean;
}

export const tradeService = {
  placeOrder: (payload: PlaceOrderPayload, idToken: string) =>
    request<ApiResponse<OrderResult>>("/api/perps/order", { method: "POST", token: idToken, body: payload }),

  cancelOrder: (payload: { coin: string; oid: number }, idToken: string) =>
    request<ApiResponse<{ status: "success" }>>("/api/perps/order/cancel", {
      method: "POST",
      token: idToken,
      body: payload,
    }),

      getAllPositions: (idToken: string) =>
    request<ApiResponse<PositionResponse[]>>(
      "/api/perp-trade/positions",
      { method: "GET", token: idToken },
    ),

  modifyOrder: (payload: { coin: string; oid: number; price: string; size: string; isBuy: boolean }, idToken: string) =>
    request<ApiResponse<OrderResult>>("/api/perps/order/modify", { method: "POST", token: idToken, body: payload }),

  setTpsl: (payload: TpslPayload, idToken: string) =>
    request<ApiResponse<{ oids: number[] }>>("/api/perps/tpsl", { method: "POST", token: idToken, body: payload }),

  updateLeverage: (payload: { coin: string; leverage: number; isCross: boolean }, idToken: string) =>
    request<ApiResponse<null>>("/api/perps/leverage", { method: "POST", token: idToken, body: payload }),

  /** amountUsd > 0 adds margin, < 0 removes it. Isolated positions only. */
  updateIsolatedMargin: (payload: { coin: string; isBuy: boolean; amountUsd: number }, idToken: string) =>
    request<ApiResponse<null>>("/api/perps/margin", { method: "POST", token: idToken, body: payload }),

  // ---- agent wallet lifecycle (onboarding)
  getAgentStatus: (idToken: string) =>
    request<ApiResponse<AgentStatus>>("/api/perps/agent", { method: "GET", token: idToken }),

  /** Backend generates + stores a fresh agent key, returns only its address. */
  createAgent: (idToken: string) =>
    request<ApiResponse<{ agentAddress: `0x${string}`; agentName: string }>>("/api/perps/agent", {
      method: "POST",
      token: idToken,
    }),

  placeMarketOrder: (payload: PlaceMarketOrder, idToken: string) =>
    request<ApiResponse<OrderResult>>("/api/perp-trade/market-order", { method: "POST", token: idToken, body: payload }),

  placeLimitOrder: (payload: PlaceLimitOrder, idToken: string) =>
    request<ApiResponse<OrderResult>>("/api/perp-trade/limit-order", { method: "POST", token: idToken, body: payload }),

  /** Called after the user signed approveAgent, so the backend can verify via extraAgents. */
  confirmAgent: (idToken: string) =>
    request<ApiResponse<AgentStatus>>("/api/perps/agent/confirm", { method: "POST", token: idToken }),
  getPositionsBySymbol: (stock: string, idToken: string) =>
  request<ApiResponse<PositionResponse | null>>(
    `/api/perp-trade/positions-by-symbol/${encodeURIComponent(stock)}`,
    { method: "GET", token: idToken },
  ),

  getOrdersBySymbol: (stock: string, idToken: string) =>
    request<ApiResponse<OrderApi[]>>(
      `/api/perp-trade/orders-by-symbol/${encodeURIComponent(stock)}`,
      { method: "GET", token: idToken },
    ),
};

/** Throws on success:false so hooks can just await. */
export async function unwrap<T>(p: Promise<ApiResponse<T>>): Promise<T> {
  const res = await p;
  if (!res?.success) throw new Error(res?.message ?? "Request failed");
  return res.data as T;
}
