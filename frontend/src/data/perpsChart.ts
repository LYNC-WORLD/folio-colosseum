// src/data/perpsChart.ts — mock candle generator + indicators (ported from the prototype)
import { dvOf } from "./perpsStore";

export type Bar = { t: number; o: number; h: number; l: number; c: number; v: number };
export const TF_SEC: Record<string, number> = { "1m": 60, "5m": 300, "15m": 900, "1H": 3600, "4H": 14400, "1D": 86400, "1W": 604800 };
export type ChartType = "candles" | "ha" | "bars" | "line" | "area";
export const CTYPES: [ChartType, string][] = [["candles", "Candles"], ["ha", "Heikin-Ashi"], ["bars", "Bars"], ["line", "Line"], ["area", "Area"]];
export type IndKey = "vol" | "ma" | "ema" | "bb" | "vwap" | "rsi";
export const CIND: [IndKey, string, string][] = [
  ["vol", "Volume", "#6B737E"], ["ma", "MA 20", "#E8A33D"], ["ema", "EMA 50", "#6FA8F5"],
  ["bb", "Bollinger 20, 2", "#C79BF0"], ["vwap", "VWAP", "#F07F9B"], ["rsi", "RSI 14", "#7FD3E0"],
];

const hashStr = (s: string) => { let h = 2166136261; for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return h >>> 0; };
const rngOf = (seed: number) => () => {
  seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const gauss = (r: () => number) => { let u = 0, v = 0; while (!u) u = r(); while (!v) v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };

/** deterministic history that ends at the current mark, so the chart always meets the price */
export function genBars(sym: string, tf: string, mark: number, o24: number, N = 320): Bar[] {
  const dv = dvOf(sym), sec = TF_SEC[tf], r = rngOf(hashStr(sym + tf));
  const dayFrac = Math.min(sec, 5 * 86400) / 86400;
  const sig = (dv / 100) * Math.sqrt(dayFrac) * (sec < 3600 ? 1.2 : 1);
  const drift = (mark >= o24 ? 1 : -1) * sig * 0.05;
  const t0 = Math.floor(Date.now() / 1000 / sec) * sec, baseV = 2.4e5 * dv * Math.sqrt(dayFrac);
  const out: Bar[] = [];
  let c = mark;
  for (let i = 0; i < N; i++) {
    const ret = sig * gauss(r) + drift, o = c / Math.exp(ret);
    const h = Math.max(o, c) * Math.exp(Math.abs(gauss(r)) * sig * 0.4);
    const l = Math.min(o, c) / Math.exp(Math.abs(gauss(r)) * sig * 0.4);
    out.push({ t: t0 - i * sec, o, h, l, c, v: baseV * (0.45 + (Math.abs(ret) / sig) * 0.55 + r() * 0.7) });
    c = o;
  }
  return out.reverse();
}
export function haOf(b: Bar[]): Bar[] {
  const out: Bar[] = [];
  b.forEach((x, i) => {
    const c = (x.o + x.h + x.l + x.c) / 4, o = i ? (out[i - 1].o + out[i - 1].c) / 2 : (x.o + x.c) / 2;
    out.push({ t: x.t, o, c, h: Math.max(x.h, o, c), l: Math.min(x.l, o, c), v: x.v });
  });
  return out;
}
export function sma(v: number[], n: number): (number | null)[] {
  const o: (number | null)[] = new Array(v.length).fill(null); let s = 0;
  for (let i = 0; i < v.length; i++) { s += v[i]; if (i >= n) s -= v[i - n]; if (i >= n - 1) o[i] = s / n; }
  return o;
}
export function ema(v: number[], n: number): (number | null)[] {
  const k = 2 / (n + 1); let e = v[0];
  return v.map((x, i) => { e = i ? x * k + e * (1 - k) : x; return i >= n - 1 ? e : null; });
}
export function bands(v: number[], n: number, m: number): ([number, number] | null)[] {
  const mid = sma(v, n);
  return mid.map((x, i) => {
    if (x == null) return null;
    let s = 0; for (let j = i - n + 1; j <= i; j++) s += (v[j] - x) ** 2;
    const sd = Math.sqrt(s / n);
    return [x + m * sd, x - m * sd];
  });
}
export function vwapOf(b: Bar[]): number[] {
  let pv = 0, vv = 0;
  return b.map((x) => { pv += ((x.h + x.l + x.c) / 3) * x.v; vv += x.v; return pv / vv; });
}
export function rsiOf(v: number[], n: number): (number | null)[] {
  const o: (number | null)[] = new Array(v.length).fill(null); let g = 0, l = 0;
  for (let i = 1; i < v.length; i++) {
    const d = v[i] - v[i - 1], up = Math.max(d, 0), dn = Math.max(-d, 0);
    if (i <= n) { g += up; l += dn; if (i === n) { g /= n; l /= n; o[i] = 100 - 100 / (1 + g / (l || 1e-9)); } }
    else { g = (g * (n - 1) + up) / n; l = (l * (n - 1) + dn) / n; o[i] = 100 - 100 / (1 + g / (l || 1e-9)); }
  }
  return o;
}
export function niceStep(x: number) {
  const e = Math.pow(10, Math.floor(Math.log10(x))), f = x / e;
  return (f < 1.5 ? 1 : f < 3 ? 2 : f < 7 ? 5 : 10) * e;
}
/** sample order book around the mark (regenerates each second) */
export function sampleBook(mark: number) {
  const t = mark * 0.00018, r = rngOf(Math.floor(Date.now() / 1000));
  const lvl = (s: number) => Array.from({ length: 7 }, (_, i) => ({ p: mark + s * t * (i + 0.5), q: ((r() * 1.4 + 0.25) * (i + 1) * 18000) / mark }));
  return { asks: lvl(1), bids: lvl(-1), spread: t };
}