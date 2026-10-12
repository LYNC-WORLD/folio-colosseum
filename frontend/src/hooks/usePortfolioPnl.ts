import { useMemo } from "react";
import type { FundLot } from "../lib/fundHoldings";

export type Trade = {
  mint: string;
  side: "buy" | "sell";
  qty: number; // tokens
  usdc: number; // gross USDC paid / received (include fees: add on buy, subtract on sell)
  ts: number; // ms
};

/** TODO: match these field names to what getUserTransactions returns. */
export function toTrades(rows: any[] | undefined): Trade[] {
  return (rows ?? [])
    .map((r): Trade | null => {
      const side = String(r.type ?? r.side ?? "").toLowerCase();
      if (side !== "buy" && side !== "sell") return null; // skip deposits, withdrawals, etc.
      const qty = Number(r.stockAmount ?? r.tokenAmount ?? r.qty);
      const usdc = Number(r.usdcAmount ?? r.usdc);
      const mint = r.tokenAddress ?? r.mint ?? r.stock?.tokenAddress;
      if (!mint || !(qty > 0) || !Number.isFinite(usdc)) return null;
      return {
        mint,
        side,
        qty,
        usdc,
        ts: Date.parse(r.createdAt ?? r.timestamp) || 0,
      };
    })
    .filter((t): t is Trade => t !== null);
}

type Basis = { qty: number; cost: number; realized: number };

function buildBasis(trades: Trade[]) {
  const m = new Map<string, Basis>();
  for (const t of [...trades].sort((a, b) => a.ts - b.ts)) {
    const b = m.get(t.mint) ?? { qty: 0, cost: 0, realized: 0 };
    if (t.side === "buy") {
      b.qty += t.qty;
      b.cost += t.usdc;
    } else if (b.qty > 0) {
      const sold = Math.min(t.qty, b.qty);
      const avg = b.cost / b.qty;
      b.realized += t.usdc * (sold / t.qty) - avg * sold;
      b.cost -= avg * sold;
      b.qty -= sold;
    }
    m.set(t.mint, b);
  }
  return m;
}

const fundTrades = (lots: FundLot[], wallet?: string | null): Trade[] =>
  lots
    .filter((l) => l.wallet === wallet)
    .flatMap((l) =>
      l.legs.map((g) => ({
        mint: g.mint,
        side: "buy" as const,
        qty: g.units,
        usdc: g.usdc,
        ts: Date.parse(l.at) || 0,
      })),
    );

export type TokenPnl = { cost: number; pnl: number; pct: number | null };

export type PerpInput = {
  accountValue: number; // live, from useAccount
  netDeposits: number | null; // from /api/leaderboard/perp/me -> netDepositsUsdc
  positionsPnl: number; // fallback when netDeposits is unknown
};

export function usePortfolioPnl({
  tokens,
  trades,
  fundLots,
  walletAddress,
  perp,
}: {
  tokens: { mint: string; balance: number; price: string | number }[];
  trades: Trade[];
  fundLots: FundLot[];
  walletAddress?: string | null;
  perp: PerpInput;
}) {
  return useMemo(() => {
    const basis = buildBasis([
      ...trades,
      ...fundTrades(fundLots, walletAddress),
    ]);

    const byMint = new Map<string, TokenPnl>();
    let spotCost = 0;
    let spotValueTracked = 0;
    let untracked = 0;

    for (const t of tokens) {
      const bal = Number(t.balance);
      const value = bal * Number(t.price);
      const b = basis.get(t.mint);
      // No (or too little) history, e.g. tokens received by transfer: don't invent a number.
      if (!b || b.qty <= 1e-9 || b.qty < bal * 0.99) {
        if (value > 0) untracked++;
        continue;
      }
      const cost = b.cost * Math.min(1, bal / b.qty);
      const pnl = value - cost;
      byMint.set(t.mint, {
        cost,
        pnl,
        pct: cost > 0 ? (pnl / cost) * 100 : null,
      });
      spotCost += cost;
      spotValueTracked += value;
    }

    // includes tokens that have since been fully sold
    let spotRealized = 0;
    for (const b of basis.values()) spotRealized += b.realized;

    const spotUnrealized = spotValueTracked - spotCost;
    const perpPnl =
      perp.netDeposits != null
        ? perp.accountValue - perp.netDeposits
        : perp.positionsPnl;

    const total = spotUnrealized + spotRealized + perpPnl;
    const base = spotCost + Math.max(perp.netDeposits ?? 0, 0);

    return {
      byMint, // per-position PnL for the rows
      spotUnrealized,
      spotRealized,
      perpPnl,
      total,
      totalPct: base > 0 ? (total / base) * 100 : null, // approximate: on currently invested capital
      untracked, // positions with no cost history
    };
  }, [
    tokens,
    trades,
    fundLots,
    walletAddress,
    perp.accountValue,
    perp.netDeposits,
    perp.positionsPnl,
  ]);
}
