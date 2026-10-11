// Live header data for one market (Trade screen): mark, oracle, funding, OI, volume.
// activeAssetCtx WebSocket updates every block; falls back to the polled market store.

import { useEffect, useMemo, useState } from "react";
import { toCoin } from "../../services/hyperliquid/format";
import type { PerpAssetCtx, WsActiveAssetCtx } from "../../services/hyperliquid/types";
import { useHlSubscription } from "./useHlSubscription";
import { useMarket } from "./useMarkets";

export function useLiveMarket(sym: string) {
  const coin = toCoin(sym);
  const market = useMarket(sym);
  const [live, setLive] = useState<{ ctx: PerpAssetCtx; prevMark: number } | null>(null);

  useEffect(() => setLive(null), [coin]);

  useHlSubscription<WsActiveAssetCtx>({ type: "activeAssetCtx", coin }, (d) =>
    setLive((s) => ({ ctx: d.ctx, prevMark: s ? +s.ctx.markPx : +d.ctx.markPx })),
  );

  return useMemo(() => {
    const c = live?.ctx;
    const mark = c ? +c.markPx : (market?.mark ?? 0);
    const prevDayPx = c ? +c.prevDayPx : (market?.prevDayPx ?? 0);
    return {
      coin,
      market,
      ready: !!c || !!market,
      mark,
      prevMark: live?.prevMark ?? mark, // for the up/down price flash
      mid: c?.midPx ? +c.midPx : (market?.mid ?? mark),
      oracle: c ? +c.oraclePx : (market?.oracle ?? 0),
      fundingPct: c ? +c.funding * 100 : (market?.fundingPct ?? 0),
      change24: prevDayPx ? (mark / prevDayPx - 1) * 100 : 0,
      oiUsd: c ? +c.openInterest * mark : (market?.oiUsd ?? 0),
      vol24Usd: c ? +c.dayNtlVlm : (market?.vol24Usd ?? 0),
      maxLeverage: market?.maxLeverage ?? 1,
      szDecimals: market?.szDecimals ?? 0,
    };
  }, [coin, live, market]);
}
