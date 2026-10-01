// The connected user's stock-perp account: balance, positions (with TP/SL), open orders.
// REST on mount, then live via clearinghouseState + openOrders WebSocket feeds (dex "xyz").

import { useCallback, useEffect, useMemo, useState } from "react";
import { STOCK_DEX } from "../../services/hyperliquid/config";
import { errMsg, toSym } from "../../services/hyperliquid/format";
import { hlInfo } from "../../services/hyperliquid/info";
import type {
  Address,
  ClearinghouseState,
  FrontendOrder,
  WsClearinghouseState,
  WsOpenOrders,
} from "../../services/hyperliquid/types";
import { useHlSubscription } from "./useHlSubscription";

export interface UiPosition {
  id: string; // coin; one position per market on Hyperliquid
  coin: string;
  sym: string;
  side: 1 | -1;
  size: number; // absolute, in shares/units
  lev: number;
  isCross: boolean;
  entry: number;
  liq: number | null;
  margin: number;
  value: number;
  pnl: number; // snapshot from Hyperliquid; use livePnl() with a live mark
  roe: number; // %
  fundingSinceOpen: number; // + received, - paid
  tp: number | null;
  sl: number | null;
  tpOid?: number;
  slOid?: number;
}

export interface UiOrder {
  id: number;
  oid: number;
  coin: string;
  sym: string;
  side: 1 | -1;
  kind: "limit" | "stop";
  px: number; // limit price, or trigger price for stops
  size: number;
  reduceOnly: boolean;
  placedAt: number;
}

const isTpsl = (o: FrontendOrder) => o.isPositionTpsl || (o.isTrigger && o.reduceOnly);
const isTp = (o: FrontendOrder) => /take profit/i.test(o.orderType);

function toPositions(ch: ClearinghouseState | null, orders: FrontendOrder[]): UiPosition[] {
  if (!ch) return [];
  return ch.assetPositions
    .map(({ position: p }): UiPosition | null => {
      const szi = +p.szi;
      if (!szi) return null;
      const side: 1 | -1 = szi > 0 ? 1 : -1;
      const prot = orders.filter((o) => o.coin === p.coin && isTpsl(o));
      const tp = prot.find(isTp);
      const sl = prot.find((o) => !isTp(o));
      return {
        id: p.coin,
        coin: p.coin,
        sym: toSym(p.coin),
        side,
        size: Math.abs(szi),
        lev: p.leverage.value,
        isCross: p.leverage.type === "cross",
        entry: +p.entryPx,
        liq: p.liquidationPx ? +p.liquidationPx : null,
        margin: +p.marginUsed,
        value: +p.positionValue,
        pnl: +p.unrealizedPnl,
        roe: +p.returnOnEquity * 100,
        fundingSinceOpen: -+p.cumFunding.sinceOpen, // HL reports paid as positive; verify the sign on testnet
        tp: tp ? +tp.triggerPx : null,
        sl: sl ? +sl.triggerPx : null,
        tpOid: tp?.oid,
        slOid: sl?.oid,
      };
    })
    .filter((p): p is UiPosition => p !== null);
}

function toOrders(orders: FrontendOrder[]): UiOrder[] {
  return orders
    .filter((o) => !isTpsl(o))
    .map((o) => ({
      id: o.oid,
      oid: o.oid,
      coin: o.coin,
      sym: toSym(o.coin),
      side: o.side === "B" ? 1 : -1,
      kind: o.isTrigger ? "stop" : "limit",
      px: o.isTrigger ? +o.triggerPx : +o.limitPx,
      size: +o.sz,
      reduceOnly: o.reduceOnly,
      placedAt: o.timestamp,
    }));
}

/** PnL / ROE with a live mark (e.g. from useLiveMarket or useMarkets().byCoin). */
export const livePnl = (p: UiPosition, mark: number) => p.side * (mark - p.entry) * p.size;
export const liveRoe = (p: UiPosition, mark: number) => (p.margin ? (livePnl(p, mark) / p.margin) * 100 : 0);

export function useAccount(user?: Address | null) {
  const [ch, setCh] = useState<ClearinghouseState | null>(null);
  const [orders, setOrders] = useState<FrontendOrder[]>([]);
  const [loading, setLoading] = useState(!!user);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!user) return;
    try {
      const [c, o] = await Promise.all([hlInfo.clearinghouseState(user), hlInfo.openOrders(user)]);
      setCh(c);
      setOrders(o);
      setError(null);
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    setCh(null);
    setOrders([]);
    setLoading(!!user);
    refresh();
  }, [refresh]); // eslint-disable-line react-hooks/exhaustive-deps

  useHlSubscription<WsClearinghouseState>(
    user ? { type: "clearinghouseState", user, dex: STOCK_DEX } : null,
    (d) => setCh(d.clearinghouseState),
  );
  useHlSubscription<WsOpenOrders>(user ? { type: "openOrders", user, dex: STOCK_DEX } : null, (d) =>
    setOrders(d.orders),
  );

  return useMemo(
    () => ({
      loading,
      error,
      refresh,
      /** USDC free to open new trades / withdraw from the stock dex. */
      available: ch ? +ch.withdrawable : 0,
      accountValue: ch ? +ch.marginSummary.accountValue : 0,
      marginUsed: ch ? +ch.marginSummary.totalMarginUsed : 0,
      positions: toPositions(ch, orders),
      orders: toOrders(orders),
      raw: { clearinghouse: ch, orders },
    }),
    [ch, orders, loading, error, refresh],
  );
}
