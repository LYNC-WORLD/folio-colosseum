// Which stocks you bought as part of an index fund — kept on the device until
// the backend records fund buys. The wallet only sees the individual stock
// tokens, so each fund buy is logged here and positions are rebuilt from it.
import { useSyncExternalStore } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type FundLeg = { mint: string; symbol: string; units: number; usdc: number };
export type FundLot = {
  fundId: string;
  fundName: string;
  wallet: string;
  at: string;
  legs: FundLeg[];
};

const KEY = "folio_fund_lots_v1";
let lots: FundLot[] = [];
const listeners = new Set<() => void>();

AsyncStorage.getItem(KEY)
  .then((raw) => {
    if (raw) {
      lots = JSON.parse(raw) as FundLot[];
      listeners.forEach((l) => l());
    }
  })
  .catch(() => {});

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function recordFundBuy(lot: FundLot) {
  if (!lot.legs.length) return;
  lots = [...lots, lot];
  AsyncStorage.setItem(KEY, JSON.stringify(lots)).catch(() => {});
  listeners.forEach((l) => l());
}

export function useFundLots() {
  return useSyncExternalStore(subscribe, () => lots);
}

export type FundPosition = {
  fundId: string;
  fundName: string;
  value: number;
  invested: number;
  /** % return on what's still held, null when nothing was paid */
  ret: number | null;
  /** stocks in this fund you still hold */
  legs: { mint: string; symbol: string; units: number; value: number }[];
};

type WalletToken = { mint: string; balance: number; price: string | number };

/**
 * Fund positions for one wallet. If you've sold some of a stock since, every
 * fund that holds it shrinks in proportion, so nothing counts more than the
 * wallet actually has.
 */
export function fundPositions(all: FundLot[], wallet: string | null | undefined, tokens: WalletToken[]): FundPosition[] {
  const mine = all.filter((l) => l.wallet === wallet);
  const recorded = new Map<string, number>();
  for (const l of mine) for (const g of l.legs) recorded.set(g.mint, (recorded.get(g.mint) ?? 0) + g.units);
  const tok = new Map(tokens.map((t) => [t.mint, t]));
  const scale = (mint: string) => {
    const r = recorded.get(mint) ?? 0;
    const b = tok.get(mint)?.balance ?? 0;
    return r > 0 ? Math.min(1, b / r) : 0;
  };

  const byFund = new Map<string, FundPosition>();
  for (const l of mine) {
    const p =
      byFund.get(l.fundId) ??
      ({ fundId: l.fundId, fundName: l.fundName, value: 0, invested: 0, ret: null, legs: [] } as FundPosition);
    for (const g of l.legs) {
      const k = scale(g.mint);
      const units = g.units * k;
      if (units <= 0) continue;
      const value = units * Number(tok.get(g.mint)?.price ?? 0);
      p.value += value;
      p.invested += g.usdc * k;
      const leg = p.legs.find((x) => x.mint === g.mint);
      if (leg) {
        leg.units += units;
        leg.value += value;
      } else p.legs.push({ mint: g.mint, symbol: g.symbol, units, value });
    }
    byFund.set(l.fundId, p);
  }
  return [...byFund.values()]
    .filter((p) => p.legs.length > 0)
    .map((p) => ({ ...p, ret: p.invested > 0 ? ((p.value - p.invested) / p.invested) * 100 : null }))
    .sort((a, b) => b.value - a.value);
}
