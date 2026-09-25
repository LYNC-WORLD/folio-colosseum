// Value of what you hold now, over time.
//
// The backend keeps no portfolio history, so this rebuilds one: each token's
// price candles (same Jupiter source as the stock chart) × your current
// balance of it, plus your USDC. The last point is always your live total,
// so the chart ends exactly on the number above it.

import { useMemo } from "react";
import { useQueries } from "@tanstack/react-query";
import { fetchCandles } from "../services";
import type { Candle, ChartPeriod } from "./index";

export type Holding = { mint: string; balance: number; price: number };
export type SeriesPoint = { t: number; v: number };

const MAX_POINTS = 80;

function closeAt(candles: Candle[], t: number, from: { i: number }) {
  // candles are sorted by time; walk forward from the last index used
  while (from.i + 1 < candles.length && candles[from.i + 1].time <= t) from.i++;
  return candles[from.i].time <= t ? candles[from.i].close : candles[0].close;
}

export function usePortfolioSeries(holdings: Holding[], cash: number, period: ChartPeriod) {
  const results = useQueries({
    queries: holdings.map((h) => ({
      queryKey: ["candles", h.mint, period],
      queryFn: ({ signal }: { signal: AbortSignal }) => fetchCandles(h.mint, period, signal),
      staleTime: 60_000,
      retry: 1,
    })),
  });

  const stamp = results.map((r) => r.dataUpdatedAt).join(",");
  const key = holdings.map((h) => `${h.mint}:${h.balance}:${h.price}`).join("|");

  const points = useMemo<SeriesPoint[]>(() => {
    const now = cash + holdings.reduce((t, h) => t + h.balance * h.price, 0);
    const nowT = Date.now() / 1000;

    const sets = holdings
      .map((h, i) => ({ h, c: (results[i]?.data as Candle[] | undefined) ?? [] }))
      .filter((x) => x.c.length > 1);

    if (!sets.length) {
      // nothing to chart yet: a flat line at today's value
      return Array.from({ length: 24 }, (_, i) => ({ t: nowT - (23 - i) * 3600, v: now }));
    }

    const charted = new Set(sets.map((s) => s.h.mint));
    const flat = cash + holdings.filter((h) => !charted.has(h.mint)).reduce((t, h) => t + h.balance * h.price, 0);
    const base = sets.reduce((a, b) => (b.c.length > a.c.length ? b : a));
    const cursors = sets.map(() => ({ i: 0 }));

    let out = base.c.map((k) => ({
      t: k.time,
      v: flat + sets.reduce((t, s, j) => t + s.h.balance * closeAt(s.c, k.time, cursors[j]), 0),
    }));

    if (out.length > MAX_POINTS) {
      const step = out.length / MAX_POINTS;
      out = Array.from({ length: MAX_POINTS }, (_, i) => out[Math.floor(i * step)]);
    }
    out.push({ t: nowT, v: now });
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stamp, key, cash]);

  return {
    points,
    loading: holdings.length > 0 && results.some((r) => r.isPending),
  };
}
