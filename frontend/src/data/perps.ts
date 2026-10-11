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
  return () => ((x = (x * 9301 + 49297) % 233280) / 233280);
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
type Row = [string, string, string, PerpMarket["kind"], PerpCategory, number, number, number, number, number, number];
const ROWS: Row[] = [
  ["NVDA", "NVIDIA", "NVIDIA", "Stock", "stocks", 184.2, 2.1, 412.8, 96.1, 0.01, 62],
  ["TSLA", "Tesla", "Tesla", "Stock", "stocks", 396.1, -1.4, 388.1, 88.4, 0.0182, 55],
  ["AAPL", "Apple", "Apple", "Stock", "stocks", 242.8, 0.6, 201.4, 51.2, 0.0061, 58],
  ["MSFT", "Microsoft", "Microsoft", "Stock", "stocks", 511.35, 0.9, 176.3, 47.9, 0.0054, 57],
  ["AMZN", "Amazon", "Amazon", "Stock", "stocks", 228.4, 1.2, 160.2, 39.3, 0.0075, 60],
  ["META", "Meta", "Meta", "Stock", "stocks", 742.1, 0.4, 143.9, 36.1, 0.0088, 59],
  ["GOOGL", "Alphabet", "Alphabet", "Stock", "stocks", 198.75, 0.7, 121.7, 30.8, 0.0049, 56],
  ["AVGO", "Broadcom", "Broadcom", "Stock", "stocks", 352.6, 1.9, 118.2, 29.4, 0.012, 64],
  ["AMD", "AMD", "AMD", "Stock", "stocks", 168.9, 2.6, 96.4, 25.7, 0.0143, 66],
  ["NFLX", "Netflix", "Netflix", "Stock", "stocks", 1188.0, -0.8, 61.8, 14.9, -0.0031, 48],
  ["COST", "Costco", "Costco", "Stock", "stocks", 912.7, 0.2, 40.2, 9.8, 0.0022, 52],
  ["LLY", "Eli Lilly", "Eli Lilly", "Stock", "stocks", 786.3, -0.5, 58.9, 15.3, -0.0018, 45],
  ["JPM", "JPMorgan Chase", "JPMorgan", "Stock", "stocks", 296.45, 0.3, 44.1, 11.2, 0.0035, 54],
  ["BRK.B", "Berkshire Hathaway", "Berkshire", "Stock", "stocks", 488.2, 0.1, 20.6, 6.1, 0.0012, 50],
  ["SP500", "S&P 500", "S&P 500", "Index fund", "index", 612.4, 0.8, 288.4, 72.6, 0.0041, 57],
  ["NDX100", "Nasdaq-100", "Nasdaq 100", "Index fund", "index", 528.1, 0.9, 164.7, 43.5, 0.0063, 61],
  ["MAG7", "Magnificent 7", "Mag 7", "Index fund", "index", 214.55, 1.4, 92.3, 21.4, 0.0097, 63],
  ["XAUT", "Tokenized gold", "Gold", "Commodity", "commodities", 2685.4, -0.2, 138.5, 34.8, -0.0024, 44],
  ["XAG", "Tokenized silver", "Silver", "Commodity", "commodities", 31.84, 0.6, 41.2, 9.7, 0.0038, 53],
  ["WTI", "Crude oil", "Oil", "Commodity", "commodities", 71.26, -1.1, 77.9, 18.6, -0.0067, 41],
];

export const PERP_MARKETS: PerpMarket[] = ROWS.map(
  ([symbol, name, short, kind, category, mark, change, vol24, oi, funding, longPct], i) => {
    const range = mark * 0.012 * (1 + Math.abs(change) / 3);
    return {
      symbol, name, short, kind, category, mark, change, vol24, oi, funding, longPct,
      high24: +(mark + range).toFixed(2),
      low24: +(mark - range).toFixed(2),
      maxLev: 50,
      series: makeSeries(i + 7, change),
    };
  },
);

/** display label: tickers for stocks, friendly name for indexes/commodities */
export const perpLabel = (m: PerpMarket) => (m.category === "stocks" ? m.symbol : m.short);

export function searchPerps(list: PerpMarket[], q: string): PerpMarket[] {
  const t = q.trim().toLowerCase();
  if (!t) return list;
  const rank = (m: PerpMarket) => {
    const sym = m.symbol.toLowerCase(), nm = m.name.toLowerCase(), sh = m.short.toLowerCase();
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

export const fmtUsdM = (m: number) => (m >= 1000 ? `$${(m / 1000).toFixed(1)}B` : `$${m.toFixed(1)}M`);

export function usePerpMarkets(symbols?: string[]) {
  const markets = symbols
    ? (symbols.map((s) => PERP_MARKETS.find((m) => m.symbol === s)).filter(Boolean) as PerpMarket[])
    : PERP_MARKETS;
  return { markets, loading: false, error: null as string | null };
}