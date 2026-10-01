// Public, read-only Hyperliquid info API. Safe to call straight from the app (no keys).
// Rate limit is 1200 weight / minute per IP. Most calls here weigh 20; l2Book,
// clearinghouseState and spotClearinghouseState weigh 2. Prefer WebSocket for anything live.

import { HL, STOCK_DEX } from "./config";
import type {
  Address,
  Candle,
  ClearinghouseState,
  Fill,
  FrontendOrder,
  FundingHistoryItem,
  L2Book,
  MetaAndAssetCtxs,
  PerpDexs,
  SpotClearinghouseState,
} from "./types";

export class HlInfoError extends Error {
  constructor(message: string, readonly status?: number) {
    super(message);
    this.name = "HlInfoError";
  }
}

async function info<T>(body: Record<string, unknown>): Promise<T> {
  const res = await fetch(`${HL.http}/info`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new HlInfoError(`Hyperliquid ${body.type} failed (${res.status}) ${text}`.trim(), res.status);
  }
  return res.json() as Promise<T>;
}

export const hlInfo = {
  /** Index 0 is null (main dex). Index of STOCK_DEX is needed for order asset ids. */
  perpDexs: () => info<PerpDexs>({ type: "perpDexs" }),

  /** Every market on the dex: metadata + mark, oracle, funding, OI, 24h volume. */
  metaAndAssetCtxs: (dex: string = STOCK_DEX) => info<MetaAndAssetCtxs>({ type: "metaAndAssetCtxs", dex }),

  l2Book: (coin: string, nSigFigs?: 2 | 3 | 4 | 5) =>
    info<L2Book>({ type: "l2Book", coin, ...(nSigFigs ? { nSigFigs } : {}) }),

  /** Max 5000 candles per call. interval: 1m 3m 5m 15m 30m 1h 2h 4h 8h 12h 1d 3d 1w 1M */
  candles: (coin: string, interval: string, startTime: number, endTime: number = Date.now()) =>
    info<Candle[]>({ type: "candleSnapshot", req: { coin, interval, startTime, endTime } }),

  fundingHistory: (coin: string, startTime: number, endTime?: number) =>
    info<FundingHistoryItem[]>({ type: "fundingHistory", coin, startTime, ...(endTime ? { endTime } : {}) }),

  // ---- user reads (public by address, no signature)
  clearinghouseState: (user: Address, dex: string = STOCK_DEX) =>
    info<ClearinghouseState>({ type: "clearinghouseState", user, dex }),

  spotClearinghouseState: (user: Address) =>
    info<SpotClearinghouseState>({ type: "spotClearinghouseState", user }),

  /** Open orders including TP/SL trigger info. */
  openOrders: (user: Address, dex: string = STOCK_DEX) =>
    info<FrontendOrder[]>({ type: "frontendOpenOrders", user, dex }),

  userFillsByTime: (user: Address, startTime: number, endTime?: number) =>
    info<Fill[]>({
      type: "userFillsByTime",
      user,
      startTime,
      aggregateByTime: true,
      ...(endTime ? { endTime } : {}),
    }),

  /** Approved builder fee in tenths of a basis point (0.05% -> 50). 0 = not approved. */
  maxBuilderFee: (user: Address, builder: Address) => info<number>({ type: "maxBuilderFee", user, builder }),

  extraAgents: (user: Address) =>
    info<{ address: Address; name: string; validUntil: number }[]>({ type: "extraAgents", user }),
};
