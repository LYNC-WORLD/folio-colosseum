export type PerpCategory = "stocks" | "index" | "commodities";

export type PerpMarket = {
  symbol: string;
  name: string;
  short: string; // display name ("Gold", "S&P 500")
  kind: "Stock" | "Index fund" | "Commodity";
  category: PerpCategory;
  mark: number; // current mark price, USD
  change: number; // 24h %
  high24: number;
  low24: number;
  vol24: number; // 24h volume, USD millions
  oi: number; // open interest, USD millions
  funding: number; // % per 8h (positive = longs pay shorts)
  longPct: number; // share of open interest that is long, 0-100
  maxLev: number;
  series: number[]; // 24 hourly points for sparklines
};

export const PERP_CATEGORIES: { key: "all" | PerpCategory; label: string }[] = [
  { key: "all", label: "All" },
  { key: "stocks", label: "Stocks" },
  { key: "index", label: "Index funds" },
  { key: "commodities", label: "Commodities" },
];

function seeded(seed: number) {
  let x = seed;
  return () => (x = (x * 9301 + 49297) % 233280) / 233280;
}
function makeSeries(seed: number, change: number, n = 24) {
  const rnd = seeded(seed);
  const out: number[] = [];
  let v = 100;
  for (let i = 0; i < n; i++) {
    v += (rnd() - 0.5) * 2 + (change / n) * 1.5;
    out.push(v);
  }
  return out;
}

// [symbol, name, short, kind, category, price, 24h%, volM, oiM, funding, long%]
type Row = [
  string,
  string,
  string,
  PerpMarket["kind"],
  PerpCategory,
  number,
  number,
  number,
  number,
  number,
  number,
];
const ROWS: Row[] = [
  [
    "NVDA",
    "Nvidia",
    "Nvidia",
    "Stock",
    "stocks",
    235.45,
    0.3367,
    412.8,
    96.1,
    0.01,
    62,
  ],

  ["ORCL", "Oracle", "Oracle", "Stock", "stocks", 143.11, 0.3436, 0, 0, 0, 0],

  [
    "TSLA",
    "Tesla",
    "Tesla",
    "Stock",
    "stocks",
    372.11,
    0.148,
    388.1,
    88.4,
    0.0182,
    55,
  ],

  [
    "NFLX",
    "Netflix",
    "Netflix",
    "Stock",
    "stocks",
    67.21,
    -0.671,
    61.8,
    14.9,
    -0.0031,
    48,
  ],

  [
    "GOOGL",
    "Google",
    "Google",
    "Stock",
    "stocks",
    343.48,
    -0.1831,
    121.7,
    30.8,
    0.0049,
    56,
  ],

  ["INTC", "Intel", "Intel", "Stock", "stocks", 117.22, -0.661, 0, 0, 0, 0],

  [
    "AMZN",
    "Amazon",
    "Amazon",
    "Stock",
    "stocks",
    251.25,
    -0.4004,
    160.2,
    39.3,
    0.0075,
    60,
  ],

  [
    "AMD",
    "AMD",
    "AMD",
    "Stock",
    "stocks",
    634.77,
    0.2574,
    96.4,
    25.7,
    0.0143,
    66,
  ],

  [
    "META",
    "META",
    "META",
    "Stock",
    "stocks",
    726.31,
    -0.4905,
    143.9,
    36.1,
    0.0088,
    59,
  ],

  [
    "AAPL",
    "Apple",
    "Apple",
    "Stock",
    "stocks",
    332.25,
    -0.3718,
    201.4,
    51.2,
    0.0061,
    58,
  ],
];

export const PERP_MARKETS: PerpMarket[] = ROWS.map(
  (
    [
      symbol,
      name,
      short,
      kind,
      category,
      mark,
      change,
      vol24,
      oi,
      funding,
      longPct,
    ],
    i,
  ) => {
    const range = mark * 0.012 * (1 + Math.abs(change) / 3);
    return {
      symbol,
      name,
      short,
      kind,
      category,
      mark,
      change,
      vol24,
      oi,
      funding,
      longPct,
      high24: +(mark + range).toFixed(2),
      low24: +(mark - range).toFixed(2),
      maxLev: 10,
      series: makeSeries(i + 7, change),
    };
  },
);

/** display label: tickers for stocks, friendly name for indexes/commodities */
export const perpLabel = (m: PerpMarket) =>
  m.category === "stocks" ? m.symbol : m.short;

export function searchPerps(list: PerpMarket[], q: string): PerpMarket[] {
  const t = q.trim().toLowerCase();
  if (!t) return list;
  const rank = (m: PerpMarket) => {
    const sym = m.symbol.toLowerCase(),
      nm = m.name.toLowerCase(),
      sh = m.short.toLowerCase();
    if (sym === t) return 0;
    if (sym.startsWith(t) || sh.startsWith(t)) return 1;
    if (nm.includes(t) || sh.includes(t)) return 2;
    if (m.kind.toLowerCase().includes(t) || m.category.includes(t)) return 3;
    return 99;
  };
  return list
    .map((m) => [m, rank(m)] as const)
    .filter(([, r]) => r < 99)
    .sort((a, b) => a[1] - b[1])
    .map(([m]) => m);
}

export const fmtUsdM = (m: number) =>
  m >= 1000 ? `$${(m / 1000).toFixed(1)}B` : `$${m.toFixed(1)}M`;

export function usePerpMarkets(symbols?: string[]) {
  const markets = symbols
    ? (symbols
        .map((s) => PERP_MARKETS.find((m) => m.symbol === s))
        .filter(Boolean) as PerpMarket[])
    : PERP_MARKETS;
  return { markets, loading: false, error: null as string | null };
}
