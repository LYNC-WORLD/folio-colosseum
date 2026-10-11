import { useMemo } from "react";

export type PerpCategory = "stocks" | "index" | "commodities";

export type PerpPosition = {
  id: number;
  symbol: string; // matches PerpMarket.symbol
  name: string; // shown in the row
  category: PerpCategory;
  side: 1 | -1; // 1 = long, -1 = short
  lev: number;
  margin: number; // USDC put up
  entry: number;
  mark: number; // TODO: pull from usePerpMarkets once wired
  tp: number | null;
  sl: number | null;
  openedAt: number;
};

const MOCK_POSITIONS: PerpPosition[] = [
  {
    id: 1,
    symbol: "NVDA",
    name: "NVDA",
    category: "stocks",
    side: 1,
    lev: 5,
    margin: 120,
    entry: 179.6,
    mark: 183.49,
    tp: null,
    sl: 171.5,
    openedAt: Date.now() - 3 * 86400e3,
  },
];

export const qtyOf = (p: PerpPosition) => (p.margin * p.lev) / p.entry;
export const pnlOf = (p: PerpPosition) => p.side * (p.mark - p.entry) * qtyOf(p);
export const roeOf = (p: PerpPosition) => (pnlOf(p) / p.margin) * 100;
export const equityOf = (p: PerpPosition) => Math.max(0, p.margin + pnlOf(p));

export function usePerpPositions() {
  const positions = MOCK_POSITIONS; // TODO: swap for a real query, same return shape
  return useMemo(
    () => ({
      positions,
      equity: positions.reduce((t, p) => t + equityOf(p), 0),
      pnl: positions.reduce((t, p) => t + pnlOf(p), 0),
      margin: positions.reduce((t, p) => t + p.margin, 0),
    }),
    [positions],
  );
}