// Response shapes from the Hyperliquid info API and WebSocket. Numbers arrive as strings.

export type HlSide = "B" | "A"; // B = bid/buy, A = ask/sell
export type Address = `0x${string}`;

export interface PerpDex {
  name: string;
  fullName: string;
  deployer: string;
}
export type PerpDexs = (PerpDex | null)[];

export interface PerpAssetMeta {
  name: string; // "xyz:NVDA"
  szDecimals: number;
  maxLeverage: number;
  onlyIsolated?: boolean;
  isDelisted?: boolean;
  marginMode?: string;
}

export interface PerpAssetCtx {
  funding: string; // hourly rate, fraction (0.0000125 = 0.00125%)
  openInterest: string; // in coin units
  prevDayPx: string;
  dayNtlVlm: string; // 24h notional volume, USD
  premium: string | null;
  oraclePx: string;
  markPx: string;
  midPx: string | null;
  impactPxs: string[] | null;
}

export type MetaAndAssetCtxs = [{ universe: PerpAssetMeta[] }, PerpAssetCtx[]];

export interface Candle {
  t: number; // open time ms
  T: number; // close time ms
  s: string; // coin
  i: string; // interval
  o: string;
  c: string;
  h: string;
  l: string;
  v: string; // base volume
  n: number; // trade count
}

export interface BookLevel {
  px: string;
  sz: string;
  n: number;
}
export interface L2Book {
  coin: string;
  time: number;
  levels: [BookLevel[], BookLevel[]]; // [bids, asks]
}

export interface AssetPosition {
  type: "oneWay";
  position: {
    coin: string;
    szi: string; // signed size: + long, - short
    entryPx: string;
    positionValue: string;
    unrealizedPnl: string;
    returnOnEquity: string;
    liquidationPx: string | null;
    marginUsed: string;
    leverage: { type: "cross" | "isolated"; value: number; rawUsd?: string };
    maxLeverage: number;
    cumFunding: { allTime: string; sinceOpen: string; sinceChange: string };
  };
}

export interface MarginSummary {
  accountValue: string;
  totalNtlPos: string;
  totalRawUsd: string;
  totalMarginUsed: string;
}

export interface ClearinghouseState {
  marginSummary: MarginSummary;
  crossMarginSummary: MarginSummary;
  crossMaintenanceMarginUsed: string;
  withdrawable: string;
  assetPositions: AssetPosition[];
  time: number;
}

export interface SpotClearinghouseState {
  balances: { coin: string; token: number; total: string; hold: string; entryNtl: string }[];
}

export interface FrontendOrder {
  coin: string;
  side: HlSide;
  limitPx: string;
  sz: string;
  oid: number;
  timestamp: number;
  origSz: string;
  triggerCondition: string;
  isTrigger: boolean;
  triggerPx: string;
  orderType: string; // "Limit" | "Stop Market" | "Take Profit Market" | ...
  reduceOnly: boolean;
  isPositionTpsl: boolean;
  tif: string | null;
  cloid?: string | null;
  children: FrontendOrder[];
}

export interface Fill {
  coin: string;
  px: string;
  sz: string;
  side: HlSide;
  time: number;
  startPosition: string;
  dir: string; // "Open Long" | "Close Short" | ...
  closedPnl: string;
  hash: string;
  oid: number;
  crossed: boolean;
  fee: string;
  tid: number;
  feeToken: string;
  builderFee?: string;
}

export interface FundingHistoryItem {
  coin: string;
  fundingRate: string;
  premium: string;
  time: number;
}

// ---- WebSocket payloads
export interface WsActiveAssetCtx {
  coin: string;
  ctx: PerpAssetCtx;
}
export interface WsAllMids {
  mids: Record<string, string>;
  dex?: string;
}
export interface WsClearinghouseState {
  dex: string;
  user: Address;
  clearinghouseState: ClearinghouseState;
}
export interface WsOpenOrders {
  dex: string;
  user: Address;
  orders: FrontendOrder[];
}
export interface WsUserFills {
  isSnapshot?: boolean;
  user: Address;
  fills: Fill[];
}
export interface WsOrderUpdate {
  order: { coin: string; side: HlSide; limitPx: string; sz: string; oid: number; timestamp: number; origSz: string; cloid?: string };
  status: string; // "open" | "filled" | "canceled" | "triggered" | "rejected" | "marginCanceled" ...
  statusTimestamp: number;
}
export interface WsTrade {
  coin: string;
  side: HlSide;
  px: string;
  sz: string;
  time: number;
  hash: string;
  tid: number;
}
