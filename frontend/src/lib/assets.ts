// One shape for anything the UI lists (Home, search, collections), built
// from the API's Stock plus the local pre-IPO reference data.
import type { Stock } from "../types";
import type { StockCategory } from "../services";
import { PREIPO_COMPANIES, type PreIpoCompany } from "../data/mockPreIpoCompanies";
import { dayChange } from "./format";

export type Asset = {
  symbol: string;
  name: string;
  price: number;
  open: number | null;
  change: number | null;
  imageUrl: string;
  category: StockCategory;
  kind: "Stock" | "Pre-IPO";
  /** extra words search can match ("space", "fintech", "pre-ipo") */
  tags: string;
  preIpo?: PreIpoCompany;
};

export const COLLECTIONS: Record<
  StockCategory,
  { title: string; blurb: string; route: "Stocks" | "PreIPO"; countWord: string }
> = {
  "us-stock": {
    title: "US stocks",
    blurb: "The companies most of the world cannot buy through a local broker.",
    route: "Stocks",
    countWord: "listed",
  },
  "pre-ipo": {
    title: "Pre-IPOs",
    blurb: "Private companies, priced off their last round. Locked until the company lists or is acquired.",
    route: "PreIPO",
    countWord: "open",
  },
};

function findPreIpo(s: Stock) {
  const name = s.name.toLowerCase();
  const sym = s.symbol.toLowerCase();
  return PREIPO_COMPANIES.find(
    (c) => c.symbol.toLowerCase() === sym || name.includes(c.name.toLowerCase()) || c.name.toLowerCase().includes(name),
  );
}

export function toAsset(s: Stock, category: StockCategory): Asset {
  const preIpo = category === "pre-ipo" ? findPreIpo(s) : undefined;
  const open = s.marketOpenPrice ? Number(s.marketOpenPrice) : null;
  return {
    symbol: s.symbol,
    name: s.name,
    price: Number(s.price),
    open: open && Number.isFinite(open) ? open : null,
    change: dayChange(s.price, s.marketOpenPrice),
    imageUrl: s.imageUrl,
    category,
    kind: category === "pre-ipo" ? "Pre-IPO" : "Stock",
    tags: [category === "pre-ipo" ? "pre-ipo preipo private" : "stock us", preIpo?.category ?? ""]
      .join(" ")
      .toLowerCase(),
    preIpo,
  };
}

/** Theme chips under search → the word they search for (prototype THEMES). */
export const THEMES: Record<string, string> = {
  "Pre-IPOs": "pre-ipo",
  AI: "ai",
  Space: "space",
  Fintech: "fintech",
  Defence: "defence",
};

// Same ranking as the prototype: exact ticker, ticker prefix, name prefix, …
function rank(a: Asset, v: string) {
  const sym = a.symbol.toLowerCase();
  const name = a.name.toLowerCase();
  if (sym === v) return 0;
  if (sym.startsWith(v)) return 1;
  if (name.startsWith(v)) return 2;
  if (name.includes(v)) return 3;
  if (sym.includes(v)) return 4;
  if (a.kind.toLowerCase().replace("-", "").includes(v.replace("-", ""))) return 5;
  if (a.tags.split(" ").includes(v) || a.tags.includes(v)) return 6;
  return 99;
}

export function searchAssets(list: Asset[], raw: string): Asset[] {
  const q = raw.trim();
  if (!q) return [];
  const v = (THEMES[q] ?? q).toLowerCase();
  return list
    .map((a) => ({ a, r: rank(a, v) }))
    .filter((x) => x.r < 99)
    .sort((x, y) => x.r - y.r || x.a.symbol.localeCompare(y.a.symbol))
    .slice(0, 40)
    .map((x) => x.a);
}
