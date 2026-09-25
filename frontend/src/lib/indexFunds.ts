// Index fund maths. The API prices a fund as the average of its stocks, so a
// unit holds 1/N of each one — a stock's weight is its price over the sum of
// prices, and a buy splits the USDC by those weights.
import type { IndexFund, Stock } from "../types";
import type { StockCategory } from "../services";
import { dayChange } from "./format";

export type FundHolding = {
  stock: Stock;
  category: StockCategory;
  price: number;
  change: number | null;
  /** 0–100 */
  weight: number;
};

export type Fund = {
  id: string;
  name: string;
  price: number;
  change: number | null;
  /** heaviest first */
  holdings: FundHolding[];
  hasPreIpo: boolean;
};

export const stockCategory = (s: Stock): StockCategory =>
  s.stockType === "PreIPO" ? "pre-ipo" : "us-stock";

export function toFund(f: IndexFund): Fund {
  const prices = f.stocks.map((s) => Number(s.price) || 0);
  const sum = prices.reduce((t, p) => t + p, 0);
  const holdings = f.stocks
    .map((s, i) => ({
      stock: s,
      category: stockCategory(s),
      price: prices[i],
      change: dayChange(s.price, s.marketOpenPrice),
      weight: sum > 0 ? (prices[i] / sum) * 100 : 100 / f.stocks.length,
    }))
    .sort((a, b) => b.weight - a.weight);

  // fund's move today = move of its average price since the open
  const opens = f.stocks.map((s) => Number(s.marketOpenPrice));
  const openSum = opens.every((o) => Number.isFinite(o) && o > 0)
    ? opens.reduce((t, o) => t + o, 0)
    : 0;
  const change = openSum > 0 ? ((sum - openSum) / openSum) * 100 : null;

  return {
    id: f.id,
    name: f.name,
    price: Number(f.price) || (f.stocks.length ? sum / f.stocks.length : 0),
    change,
    holdings,
    hasPreIpo: holdings.some((h) => h.category === "pre-ipo"),
  };
}

/** "GPU Infra" → "GPU", "AI prestock" → "AIP" */
export const fundCode = (name: string) => {
  const words = name.split(/\s+/).filter(Boolean);
  const initials = words.length > 1 ? words.map((w) => w[0]).join("") : "";
  const base = /^[A-Z0-9]{2,}$/.test(words[0] ?? "") ? words[0] : initials || name;
  return base.replace(/[^A-Za-z0-9]/g, "").slice(0, 3).toUpperCase();
};

export type Leg = { holding: FundHolding; usdc: number };

/** Split a USDC amount across the fund's stocks by weight, cents that don't
 * divide evenly go to the heaviest stock so the legs add up exactly. Stocks
 * whose share rounds to $0.00 are left out rather than sent as empty orders. */
export function splitBuy(fund: Fund, amount: number): Leg[] {
  const cents = Math.round(amount * 100);
  const legs = fund.holdings.map((h) => ({
    holding: h,
    cents: Math.floor((cents * h.weight) / 100),
  }));
  const rest = cents - legs.reduce((t, l) => t + l.cents, 0);
  if (legs.length) legs[0].cents += rest;
  return legs
    .filter((l) => l.cents > 0)
    .map((l) => ({ holding: l.holding, usdc: l.cents / 100 }));
}

export function searchFunds(funds: Fund[], raw: string): Fund[] {
  const v = raw.trim().toLowerCase();
  if (!v) return [];
  if ("index funds".startsWith(v) || v === "index fund" || v === "fund") return funds;
  return funds.filter(
    (f) =>
      f.name.toLowerCase().includes(v) ||
      f.holdings.some(
        (h) =>
          h.stock.symbol.toLowerCase().startsWith(v) ||
          h.stock.name.toLowerCase().includes(v),
      ),
  );
}
