import { useCallback, useEffect, useRef, useState } from "react";
import { OrderApi, PositionApi, tradeService, unwrap } from "../../services/perps/tradeService";
import { UiOrder, UiPosition } from "./useAccount";


const POLL_MS = 5000;
export type SymPosition = UiPosition;


const toPosition = (p: PositionApi): SymPosition => {
  const szi = parseFloat(p.szi);
  const margin = parseFloat(p.marginUsed);
  return {
    id: p.coin,
    coin: p.coin,
    sym: p.coin.includes(":") ? p.coin.split(":")[1] : p.coin,
    side: szi >= 0 ? 1 : -1,
    size: Math.abs(szi),
    lev: p.leverage.value,
    isCross: p.leverage.type === "cross",
    entry: parseFloat(p.entryPx),
    liq: n(p.liquidationPx),
    margin,
    value: parseFloat(p.positionValue),
    pnl: parseFloat(p.unrealizedPnl),
    roe: parseFloat(p.returnOnEquity) * 100, // API gives a fraction
    fundingSinceOpen: -parseFloat(p.cumFunding?.sinceOpen ?? "0"), // see note below
    tp: null,
    sl: null,
  };
};

export type SymOrder = UiOrder;

const n = (v?: string | null) => (v == null ? null : parseFloat(v));



const toOrder = (o: OrderApi): SymOrder => ({
  id: o.oid,
  oid: o.oid,
  coin: o.coin,
  sym: o.stockSymbol,
  side: o.isBuy ? 1 : -1,
  kind: o.orderType === "stop" ? "stop" : "limit", // resting orders are never "market"
  px: parseFloat(o.price),
  size: parseFloat(o.size),
  reduceOnly: o.reduceOnly ?? false,
  placedAt: o.timestamp ?? Date.now(),
});

/** Shared fetch + poll logic. `loading` is true only until the first response. */
function useBySymbol<A, T>(
  stock: string,
  idToken: string | null | undefined,
  fetcher: (stock: string, token: string) => Promise<A[]>,
  map: (a: A) => T,
) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const req = useRef(0);

  const load = useCallback(async () => {
    if (!idToken || !stock) {
      setData([]);
      setLoading(false);
      return;
    }
    const id = ++req.current;
    try {
      const rows = await fetcher(stock, idToken);
      if (id !== req.current) return; // stale: symbol changed meanwhile
      setData((rows ?? []).map(map));
      setError(null);
    } catch (e) {
      if (id !== req.current) return;
      setError(e instanceof Error ? e.message : "Request failed");
    } finally {
      if (id === req.current) setLoading(false);
    }
  }, [stock, idToken]); // eslint-disable-line

  useEffect(() => {
    setData([]);
    setLoading(true);
    setError(null);
    load();
    const i = setInterval(load, POLL_MS);
    return () => {
      req.current++; // invalidate in-flight request
      clearInterval(i);
    };
  }, [load]);

  return { data, loading, error, refetch: load };
}

export const useAllPositions = (idToken?: string | null) =>
  useBySymbol(
    "all", // dummy key, the endpoint takes no symbol
    idToken,
    async (_s, t) => {
      const rows = await unwrap(tradeService.getAllPositions(t));
      return (rows ?? [])
        .map((r) => r.position)
        .filter((p): p is PositionApi => !!p && parseFloat(p.szi) !== 0);
    },
    toPosition,
  );

export const usePositionsBySymbol = (stock: string, idToken?: string | null) =>
  useBySymbol(
    stock,
    idToken,
    async (s, t) => {
      const d = await unwrap(tradeService.getPositionsBySymbol(s, t));
      const p = d?.position;
      return p && parseFloat(p.szi) !== 0 ? [p] : [];
    },
    toPosition,
  );

export const useOrdersBySymbol = (stock: string, idToken?: string | null) =>
  useBySymbol(
    stock,
    idToken,
    (s, t) => unwrap(tradeService.getOrdersBySymbol(s, t)),
    toOrder,
  );