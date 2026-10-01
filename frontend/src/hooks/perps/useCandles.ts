// Chart data: REST candleSnapshot for history, then the candle WebSocket keeps the
// last bar live and appends new ones. Bars use { t (seconds), o, h, l, c, v } like the chart.

import { useEffect, useRef, useState } from "react";
import {
  INTERVAL_MS,
  candleToBar,
  errMsg,
  mergeBar,
  tfToInterval,
  toCoin,
  type HlBar,
} from "../../services/hyperliquid/format";
import { hlInfo } from "../../services/hyperliquid/info";
import type { Candle } from "../../services/hyperliquid/types";
import { useHlSubscription } from "./useHlSubscription";

export function useCandles(sym: string, tf: string, count = 300) {
  const coin = toCoin(sym);
  const interval = tfToInterval(tf);
  const [bars, setBars] = useState<HlBar[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const ready = useRef(false);
  const pending = useRef<HlBar[]>([]); // live candles that arrive before history loads

  useEffect(() => {
    let alive = true;
    ready.current = false;
    pending.current = [];
    setBars([]);
    setLoading(true);
    setError(null);

    const end = Date.now();
    const start = end - count * (INTERVAL_MS[interval] ?? INTERVAL_MS["15m"]);
    hlInfo
      .candles(coin, interval, start, end)
      .then((cs) => {
        if (!alive) return;
        let b = cs.map(candleToBar);
        pending.current.forEach((p) => (b = mergeBar(b, p)));
        pending.current = [];
        ready.current = true;
        setBars(b);
      })
      .catch((e) => alive && setError(errMsg(e)))
      .finally(() => alive && setLoading(false));

    return () => {
      alive = false;
    };
  }, [coin, interval, count]);

  useHlSubscription<Candle>({ type: "candle", coin, interval }, (c) => {
    const bar = candleToBar(c);
    if (!ready.current) pending.current.push(bar);
    else setBars((b) => mergeBar(b, bar));
  });

  return { bars, loading, error, interval };
}
