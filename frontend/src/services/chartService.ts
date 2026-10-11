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

const BASE_URL = "https://datapi.jup.ag/v2/charts";

export async function fetchCandles(
  mint: string,
  period: ChartPeriod,
  signal: AbortSignal,
): Promise<Candle[]> {
  const { interval, candles } = PERIOD_CONFIG[period];
  const qs = new URLSearchParams({
    interval,
    to: String(Date.now()), // API expects ms
    candles: String(candles),
    type: "price",
    quote: "usd",
  });

  const res = await fetch(`${BASE_URL}/${mint}?${qs}`, { signal });
  if (!res.ok) throw new Error(`Chart request failed (${res.status})`);

  const json = (await res.json()) as { candles?: Candle[] };
  return (json.candles ?? [])
    .filter((c) => Number.isFinite(c.close))
    .sort((a, b) => a.time - b.time);
}
