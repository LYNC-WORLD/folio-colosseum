// Symbol, interval, price/size and mapping helpers shared by services and hooks.

import { STOCK_DEX } from "./config";
import type { BookLevel, Candle } from "./types";

/** "NVDA" -> "xyz:NVDA". Already-prefixed coins pass through. */
export const toCoin = (sym: string) => (sym.includes(":") ? sym : `${STOCK_DEX}:${sym}`);
/** "xyz:NVDA" -> "NVDA" */
export const toSym = (coin: string) => (coin.includes(":") ? coin.split(":")[1] : coin);

/** App timeframe labels -> Hyperliquid candle intervals. */
const TF: Record<string, string> = {
  "1m": "1m", "3m": "3m", "5m": "5m", "15m": "15m", "30m": "30m",
  "1h": "1h", "1H": "1h", "2H": "2h", "4h": "4h", "4H": "4h", "8H": "8h", "12H": "12h",
  "1d": "1d", "1D": "1d", "3D": "3d", "1w": "1w", "1W": "1w",
  "1M": "1M", // month. Map your own label if "1M" means one minute in the UI.
};
export const tfToInterval = (tf: string) => TF[tf] ?? TF[tf.toLowerCase()] ?? "15m";

const MIN = 60_000;
export const INTERVAL_MS: Record<string, number> = {
  "1m": MIN, "3m": 3 * MIN, "5m": 5 * MIN, "15m": 15 * MIN, "30m": 30 * MIN,
  "1h": 60 * MIN, "2h": 120 * MIN, "4h": 240 * MIN, "8h": 480 * MIN, "12h": 720 * MIN,
  "1d": 1440 * MIN, "3d": 3 * 1440 * MIN, "1w": 7 * 1440 * MIN, "1M": 30 * 1440 * MIN,
};

const stripZeros = (x: string) => (x.includes(".") ? x.replace(/\.?0+$/, "") : x);

/**
 * Price rounded down to Hyperliquid tick rules: max 5 significant figures and
 * max (6 - szDecimals) decimals. Integers are always valid. "0" if invalid.
 * (No SDK import here on purpose: keeps the market-data path free of Node/web-only code.)
 */
export function roundPx(px: number, szDecimals: number): string {
  if (!Number.isFinite(px) || px <= 0) return "0";
  if (Number.isInteger(px)) return String(px);
  const intDigits = Math.floor(Math.log10(px)) + 1;
  if (intDigits > 5) {
    const k = 10 ** (intDigits - 5);
    return String(Math.floor(px / k) * k);
  }
  const dec = Math.max(0, Math.min(6 - szDecimals, 5 - intDigits));
  const f = 10 ** dec;
  const v = Math.floor(px * f + 1e-9) / f;
  return v > 0 ? stripZeros(v.toFixed(dec)) : "0";
}

/** Size rounded down to the market's lot size. "0" if it rounds to nothing. */
export function roundSz(sz: number, szDecimals: number): string {
  if (!Number.isFinite(sz) || sz <= 0) return "0";
  const f = 10 ** szDecimals;
  const v = Math.floor(sz * f + 1e-9) / f;
  return v > 0 ? stripZeros(v.toFixed(szDecimals)) : "0";
}

/** Same shape the chart already uses: t in seconds. */
export interface HlBar {
  t: number;
  o: number;
  h: number;
  l: number;
  c: number;
  v: number;
}
export const candleToBar = (c: Candle): HlBar => ({
  t: Math.floor(c.t / 1000),
  o: +c.o,
  h: +c.h,
  l: +c.l,
  c: +c.c,
  v: +c.v,
});

/** Newer candle for the same open time replaces the last bar; a new open time appends. */
export function mergeBar(bars: HlBar[], bar: HlBar, max = 1500): HlBar[] {
  const last = bars[bars.length - 1];
  if (!last) return [bar];
  if (bar.t === last.t) {
    const next = bars.slice();
    next[next.length - 1] = bar;
    return next;
  }
  if (bar.t > last.t) return bars.length >= max ? [...bars.slice(1), bar] : [...bars, bar];
  return bars; // out of order, ignore
}

export interface BookRow {
  p: number;
  q: number;
  n: number;
}
export const toRows = (levels: BookLevel[], depth: number): BookRow[] =>
  levels.slice(0, depth).map((l) => ({ p: +l.px, q: +l.sz, n: l.n }));

/** 128-bit client order id. Lets the backend retry safely without double orders. */
export function newCloid(): `0x${string}` {
  const b = new Uint8Array(16);
  const c = (globalThis as { crypto?: { getRandomValues?: (a: Uint8Array) => Uint8Array } }).crypto;
  if (c?.getRandomValues) c.getRandomValues(b);
  else for (let i = 0; i < 16; i++) b[i] = Math.floor(Math.random() * 256);
  return `0x${Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("")}`;
}

/** "0.05%" -> 50 (tenths of a basis point, the unit maxBuilderFee returns). */
export const feePctToTenthBps = (pct: string) => Math.round(parseFloat(pct) * 1000);

export const errMsg = (e: unknown) => (e instanceof Error ? e.message : String(e));
