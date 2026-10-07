// src/data/perpsStore.ts
// Mock perps engine: wallet, positions, orders, live mark-price feed, and the maths
// (liquidation, PnL, pre-trade check). No dependencies: a tiny external store read
// with useSyncExternalStore, so any screen (Trade, Folio, Leaderboard...) can share it.
//
// Swap the actions for real API calls later; screens only call the actions below.

import { useSyncExternalStore } from "react";
import { PERP_MARKETS, type PerpMarket } from "./perps";

export const MAXLEV = 50;
export const MMR = 0.005; // maintenance margin
export const TAKER = 0.0006; // 0.06 %
export const MIN_MARGIN = 3;

// typical one-day move in %, drives the feed, chart and the pre-trade check
const DVOL: Record<string, number> = {
  NVDA: 3.1,
  TSLA: 3.9,
  AAPL: 1.5,
  MSFT: 1.4,
  AMZN: 1.9,
  META: 2.3,
  GOOGL: 1.8,
  AVGO: 2.9,
  AMD: 3.4,
  NFLX: 2.2,
  COST: 1.2,
  LLY: 2.1,
  JPM: 1.3,
  "BRK.B": 0.9,
  SP500: 0.9,
  NDX100: 1.2,
  MAG7: 1.7,
  XAG: 1.9,
  WTI: 2.4,
};
export const dvOf = (sym: string) => DVOL[sym] ?? 1.5;

export type Position = {
  id: number;
  sym: string;
  side: 1 | -1;
  lev: number;
  margin: number;
  entry: number;
  qty: number;
  tp: number | null;
  sl: number | null;
  t: number;
};
export type Order = {
  id: number;
  sym: string;
  side: 1 | -1;
  lev: number;
  margin: number;
  px: number;
  kind: "Limit" | "Stop";
  tp: number | null;
  sl: number | null;
  t: number;
};
export type Mark = { mark: number; prev: number; o24: number; anchor: number };
export type Toast = { id: number; title: string; sub?: string } | null;

export type PerpsState = {
  usdc: number;
  perps: Position[];
  orders: Order[];
  perpOK: boolean;
  marks: Record<string, Mark>;
  toast: Toast;
};

const marks: Record<string, Mark> = {};
PERP_MARKETS.forEach((m) => {
  marks[m.symbol] = {
    mark: m.mark,
    prev: m.mark,
    anchor: m.mark,
    o24: m.mark / (1 + m.change / 100),
  };
});

let PID = 10;
let state: PerpsState = {
  usdc: 440,
  perpOK: false,
  marks,
  toast: null,
  perps: [
    {
      id: 1,
      sym: "NVDA",
      side: 1,
      lev: 5,
      margin: 120,
      entry: 179.6,
      qty: (120 * 5) / 179.6,
      tp: null,
      sl: 171.5,
      t: Date.now() - 3 * 86400e3,
    },
  ],
  orders: [],
};

// ---------- store plumbing ----------
const listeners = new Set<() => void>();
let timer: ReturnType<typeof setInterval> | null = null;
const emit = () => listeners.forEach((l) => l());
const set = (patch: Partial<PerpsState>) => {
  state = { ...state, ...patch };
  emit();
};

function subscribe(l: () => void) {
  listeners.add(l);
  if (!timer) timer = setInterval(feedTick, 1000); // only ticks while someone is watching
  return () => {
    listeners.delete(l);
    if (!listeners.size && timer) {
      clearInterval(timer);
      timer = null;
    }
  };
}
export const getPerps = () => state;
export function usePerps(): PerpsState {
  return useSyncExternalStore(subscribe, getPerps, getPerps);
}

// ---------- maths ----------
export const liqOf = (p: {
  side: number;
  entry: number;
  margin: number;
  qty: number;
}) =>
  p.side > 0
    ? p.entry - (p.margin - MMR * p.qty * p.entry) / p.qty
    : p.entry + (p.margin - MMR * p.qty * p.entry) / p.qty;
export const pnlOf = (p: Position, mark: number) =>
  p.side * (mark - p.entry) * p.qty;
export const roeOf = (p: Position, mark: number) =>
  (pnlOf(p, mark) / p.margin) * 100;
export const markOf = (sym: string) => state.marks[sym]?.mark ?? 0;
export const changeOf = (sym: string) => {
  const m = state.marks[sym];
  return m ? (m.mark / m.o24 - 1) * 100 : 0;
};
export const marketOf = (sym: string): PerpMarket =>
  PERP_MARKETS.find((m) => m.symbol === sym) ?? PERP_MARKETS[0];

// chance a one-day move reaches the liquidation distance against you
function erfc(x: number) {
  const t = 1 / (1 + 0.5 * Math.abs(x));
  const r =
    t *
    Math.exp(
      -x * x -
        1.26551223 +
        t *
          (1.00002368 +
            t *
              (0.37409196 +
                t *
                  (0.09678418 +
                    t *
                      (-0.18628806 +
                        t *
                          (0.27886807 +
                            t *
                              (-1.13520398 +
                                t *
                                  (1.48851587 +
                                    t * (-0.82215223 + t * 0.17087277)))))))),
    );
  return x >= 0 ? r : 2 - r;
}
export type CheckTone = "ok" | "warn" | "bad";
export function preCheck(sym: string, dist: number): [CheckTone, string] {
  const dv = dvOf(sym);
  const z = dist / dv;
  const days = Math.round((90 * erfc(z / Math.SQRT2)) / 2);
  const nm = marketOf(sym).short;
  if (z > 3)
    return [
      "ok",
      `Comfortable. ${nm} has not moved ${dist.toFixed(1)}% against you in a day in the last 90 days.`,
    ];
  if (z > 1.4)
    return [
      "warn",
      `Watch it. ${nm} moved ${dist.toFixed(1)}% against a trade like this on ${Math.max(1, days)} of the last 90 days.`,
    ];
  return [
    "bad",
    `Tight. ${nm} moves ${dist.toFixed(1)}% in a day often, ${Math.max(1, days)} of the last 90 days. Lower leverage gives it room.`,
  ];
}

// stocks trade 9:30-16:00 ET Mon-Fri; commodities nearly 24h with a daily break
export function mktOpen(m: PerpMarket, now = new Date()) {
  const ny = new Date(
    now.toLocaleString("en-US", { timeZone: "America/New_York" }),
  );
  const d = ny.getDay(),
    mins = ny.getHours() * 60 + ny.getMinutes();
  if (m.category === "commodities") {
    if (d === 6 || (d === 5 && mins >= 1020) || (d === 0 && mins < 1080))
      return false;
    return !(mins >= 1020 && mins < 1080);
  }
  return d >= 1 && d <= 5 && mins >= 570 && mins < 960;
}
export function fundLeft() {
  const s = 3600 - (Math.floor(Date.now() / 1000) % 3600);
  return (
    String(Math.floor(s / 60)).padStart(2, "0") +
    ":" +
    String(s % 60).padStart(2, "0")
  );
}

// ---------- live mark feed ----------
function gauss() {
  let u = 0,
    v = 0;
  while (!u) u = Math.random();
  while (!v) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}
function feedTick() {
  const next: Record<string, Mark> = {};
  for (const [sym, m] of Object.entries(state.marks)) {
    const mark =
      m.mark * Math.exp((dvOf(sym) / 100) * 0.005 * gauss()) +
      (m.anchor - m.mark) * 0.002;
    next[sym] = { ...m, prev: m.mark, mark };
  }
  state = { ...state, marks: next };
  checkTriggers();
  emit();
}

// limit/stop fills, take profit, stop loss, liquidation
function checkTriggers() {
  // limit/stop orders
  for (const o of [...state.orders]) {
    const market = state.marks[o.sym];

    // Market no longer exists in the current market list
    if (!market) {
      console.warn(`[Perps] Skipping stale order for unknown market: ${o.sym}`);
      continue;
    }

    const mk = market.mark;

    const hit =
      o.kind === "Limit"
        ? o.side > 0
          ? mk <= o.px
          : mk >= o.px
        : o.side > 0
          ? mk >= o.px
          : mk <= o.px;

    if (!hit) continue;

    const qty = (o.margin * o.lev) / o.px;

    state = {
      ...state,
      orders: state.orders.filter((x) => x.id !== o.id),
      perps: [
        ...state.perps,
        {
          id: o.id,
          sym: o.sym,
          side: o.side,
          lev: o.lev,
          margin: o.margin,
          entry: o.px,
          qty,
          tp: o.tp,
          sl: o.sl,
          t: Date.now(),
        },
      ],
    };

    toast(
      `${o.kind} order filled`,
      `${marketOf(o.sym).short.toUpperCase()} · ${fmtPx(o.px)}`,
    );
  }

  // positions
  for (const p of [...state.perps]) {
    const market = state.marks[p.sym];

    // Position belongs to a market that no longer exists
    if (!market) {
      console.warn(`[Perps] Skipping position for unknown market: ${p.sym}`);
      continue;
    }

    const mk = market.mark;
    const liq = liqOf(p);

    if (p.side > 0 ? mk <= liq : mk >= liq) {
      closePerp(p.id, 1, "liq");
      continue;
    }

    if (p.tp != null && (p.side > 0 ? mk >= p.tp : mk <= p.tp)) {
      closePerp(p.id, 1, "tp");
      continue;
    }

    if (p.sl != null && (p.side > 0 ? mk <= p.sl : mk >= p.sl)) {
      closePerp(p.id, 1, "sl");
    }
  }
}

// ---------- formatting ----------
export const fmtPx = (p: number) =>
  "$" +
  p.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
export const fmtNum = (p: number) =>
  p.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
export const fmtUsd = fmtPx;
export const sMoney = (n: number) => (n >= 0 ? "+" : "−") + fmtPx(Math.abs(n));
export const sPct = (n: number) =>
  (n >= 0 ? "+" : "−") + Math.abs(n).toFixed(2) + "%";
export const qtyFmt = (q: number) =>
  q >= 100 ? q.toFixed(1) : q >= 1 ? q.toFixed(3) : q.toFixed(4);
export const sideTxt = (s: number) => (s > 0 ? "LONG" : "SHORT");

// ---------- actions ----------
export function toast(title: string, sub?: string) {
  set({ toast: { id: Date.now(), title, sub } });
}
export const unlockPerps = () => set({ perpOK: true });
export function deposit(amount: number) {
  set({ usdc: state.usdc + amount });
  toast("Added " + fmtPx(amount), "MOCK DEPOSIT · USDC IN YOUR WALLET");
}

export type OpenArgs = {
  sym: string;
  side: 1 | -1;
  lev: number;
  margin: number;
  kind: "Market" | "Limit" | "Stop";
  px: number | null;
  tp: number | null;
  sl: number | null;
};
/** Market -> opens a position now. Limit/Stop -> parks an order and holds the margin. */
export function submitTicket(a: OpenArgs): Position | Order {
  const mk = state.marks[a.sym].mark;
  if (a.kind === "Market") {
    const entry = mk * (1 + a.side * 0.0003);
    const fee = a.margin * a.lev * TAKER;
    const p: Position = {
      id: ++PID,
      sym: a.sym,
      side: a.side,
      lev: a.lev,
      margin: a.margin,
      entry,
      qty: (a.margin * a.lev) / entry,
      tp: a.tp,
      sl: a.sl,
      t: Date.now(),
    };
    set({ usdc: state.usdc - a.margin - fee, perps: [...state.perps, p] });
    return p;
  }
  const o: Order = {
    id: ++PID,
    sym: a.sym,
    side: a.side,
    lev: a.lev,
    margin: a.margin,
    px: a.px ?? mk,
    kind: a.kind,
    tp: a.tp,
    sl: a.sl,
    t: Date.now(),
  };
  set({ usdc: state.usdc - a.margin, orders: [...state.orders, o] });
  return o;
}
export function cancelOrder(id: number) {
  const o = state.orders.find((x) => x.id === id);
  if (!o) return;
  set({
    orders: state.orders.filter((x) => x.id !== id),
    usdc: state.usdc + o.margin,
  });
  toast(`${o.kind} order cancelled`, fmtPx(o.margin) + " BACK IN YOUR WALLET");
}
export type Snap = {
  sym: string;
  side: number;
  lev: number;
  entry: number;
  exit: number;
  pnl: number;
  roe: number;
};
export function closePerp(
  id: number,
  frac: number,
  why: "liq" | "tp" | "sl" | null,
) {
  const p = state.perps.find((x) => x.id === id);
  if (!p) return null;
  const mk = state.marks[p.sym].mark;
  const pnl = pnlOf(p, mk) * frac;
  const fee = p.qty * frac * mk * TAKER;
  const back = why === "liq" ? 0 : Math.max(0, p.margin * frac + pnl - fee);
  const snap: Snap = {
    sym: p.sym,
    side: p.side,
    lev: p.lev,
    entry: p.entry,
    exit: mk,
    pnl: why === "liq" ? -p.margin : back - p.margin * frac,
    roe:
      why === "liq"
        ? -100
        : ((back - p.margin * frac) / (p.margin * frac)) * 100,
  };
  const perps =
    frac >= 0.999
      ? state.perps.filter((x) => x.id !== id)
      : state.perps.map((x) =>
          x.id === id
            ? { ...x, margin: x.margin * (1 - frac), qty: x.qty * (1 - frac) }
            : x,
        );
  set({ perps, usdc: state.usdc + back });
  const nm = marketOf(p.sym).short;
  if (why === "liq")
    toast(
      `${nm} ${p.side > 0 ? "long" : "short"} liquidated`,
      "MARGIN OF " + fmtPx(p.margin * frac) + " LOST",
    );
  else if (why)
    toast(
      why === "tp" ? `Take profit hit · ${nm}` : `Stop loss hit · ${nm}`,
      sMoney(snap.pnl) + " · " + fmtPx(back) + " BACK IN YOUR WALLET",
    );
  return { back, snap };
}
export function addMargin(id: number, amt: number) {
  const p = state.perps.find((x) => x.id === id);
  if (!p || amt > state.usdc) return;
  set({
    usdc: state.usdc - amt,
    perps: state.perps.map((x) =>
      x.id === id ? { ...x, margin: x.margin + amt } : x,
    ),
  });
  toast(
    "Margin added",
    "LIQUIDATION NOW " + fmtPx(liqOf({ ...p, margin: p.margin + amt })),
  );
}
export function setTpSl(id: number, tp: number | null, sl: number | null) {
  set({ perps: state.perps.map((x) => (x.id === id ? { ...x, tp, sl } : x)) });
}
/** close at mark, then open the opposite side with the same margin + leverage */
export function reversePerp(id: number): Position | null {
  const p = state.perps.find((x) => x.id === id);
  if (!p) return null;
  const { margin: mg, lev, sym } = p,
    side = -p.side as 1 | -1;
  closePerp(id, 1, null);
  const fee = mg * lev * TAKER;
  if (mg + fee > state.usdc) {
    toast(
      "Not enough cash to flip",
      "YOUR POSITION IS CLOSED · " + fmtPx(state.usdc) + " IN WALLET",
    );
    return null;
  }
  const entry = state.marks[sym].mark * (1 + side * 0.0003);
  const q: Position = {
    id: ++PID,
    sym,
    side,
    lev,
    margin: mg,
    entry,
    qty: (mg * lev) / entry,
    tp: null,
    sl: null,
    t: Date.now(),
  };
  set({ usdc: state.usdc - mg - fee, perps: [...state.perps, q] });
  toast(
    "Flipped to " + (side > 0 ? "long" : "short"),
    marketOf(sym).short.toUpperCase() + " · " + lev + "X AT " + fmtPx(entry),
  );
  return q;
}
