import { useCallback, useEffect, useState } from "react";
import { getPerpMarkets, PerpMarketApi } from "../services/perps";
import { PERP_MARKETS, type PerpMarket } from "../data/perps";
import { DEFAULT_PERP_MARKETS } from "../data/perpMarketsDefault";

export type TradablePerp = PerpMarket & {
  assetId: string;
  imageUrl: string;
  szDecimals: number;
};

const toMarket = (a: PerpMarketApi): TradablePerp => {
  const base = PERP_MARKETS.find((m) => m.symbol === a.marketSymbol);
  const mark = parseFloat(a.price);
  const change = parseFloat(a.changeInPrice);
  return {
    symbol: a.marketSymbol,
    name: a.marketName,
    short: a.marketName,
    kind: "Stock",
    category: "stocks",
    high24: mark,
    low24: mark,
    vol24: 0,
    oi: 0,
    funding: 0,
    longPct: 50,
    series: [],
    ...base,
    mark,
    change,
    maxLev: a.maxLeverage,
    assetId: a.assetId,
    imageUrl: a.imageUrl,
    szDecimals: a.szDecimals,
  };
};
let cache: TradablePerp[] = DEFAULT_PERP_MARKETS.map(toMarket);

export function useTradablePerps() {
  const [markets, setMarkets] = useState<TradablePerp[]>(cache);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setRefreshing(true);
    setError(null);
    try {
      const res = await getPerpMarkets();
      if (!res.success)
        throw new Error(res.message || "Failed to load markets");
      cache = res.data.map(toMarket);
      setMarkets(cache);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load markets");
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { markets, refreshing, error, refetch: load };
}
