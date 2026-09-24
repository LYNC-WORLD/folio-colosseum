import { useCallback, useEffect, useRef, useState } from "react";
import { InteractionManager } from "react-native";
import { fetchCandles } from "../services";

export const CHART_PERIODS = ["1D", "1W", "1M", "1Y", "All"] as const;
export type ChartPeriod = (typeof CHART_PERIODS)[number];

export type Candle = {
  time: number; // unix seconds
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

// Candle interval + count per tab. Tweak counts if a range looks too sparse/dense.
const PERIOD_CONFIG: Record<
  ChartPeriod,
  { interval: string; candles: number }
> = {
  "1D": { interval: "15_MINUTE", candles: 96 }, // 24h
  "1W": { interval: "1_HOUR", candles: 168 }, // 7d
  "1M": { interval: "4_HOUR", candles: 180 }, // 30d
  "1Y": { interval: "1_DAY", candles: 365 },
  All: { interval: "1_WEEK", candles: 520 }, // API just returns fewer if the token is younger
};

export function useStockChart(mint: string | undefined, period: ChartPeriod) {
  const [candles, setCandles] = useState<Candle[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);

  // Per-period cache so flipping back to a tab is instant
  const cache = useRef(new Map<ChartPeriod, Candle[]>());

  const [ready, setReady] = useState(false);
  useEffect(() => {
    const task = InteractionManager.runAfterInteractions(() => setReady(true));
    return () => task.cancel();
  }, []);

  useEffect(() => {
    cache.current.clear();
    setCandles(null);
  }, [mint]);

  useEffect(() => {
    if (!ready || !mint) return;

    const cached = cache.current.get(period);
    if (cached) {
      setCandles(cached);
      setLoading(false);
      setError(null);
      return;
    }

    const ctrl = new AbortController();
    setLoading(true);
    setError(null);

    fetchCandles(mint, period, ctrl.signal)
      .then((data) => {
        cache.current.set(period, data);
        setCandles(data);
      })
      .catch((e) => {
        if (ctrl.signal.aborted) return;
        setError(e instanceof Error ? e.message : "Couldn't load chart");
      })
      .finally(() => {
        if (!ctrl.signal.aborted) setLoading(false);
      });

    return () => ctrl.abort();
  }, [ready, mint, period, nonce]);

  const reload = useCallback(() => {
    cache.current.delete(period);
    setNonce((n) => n + 1);
  }, [period]);

  return { candles, loading: loading || !ready, error, reload };
}
