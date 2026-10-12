import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from "react-native-gesture-handler";
import Svg, {
  ClipPath,
  Defs,
  G,
  Line,
  LinearGradient,
  Path,
  Polyline,
  Rect,
  Stop,
  Text as SvgText,
} from "react-native-svg";
import { sideTxt, sMoney, fmtNum } from "../data/perpsStore";
import {
  CIND,
  CTYPES,
  TF_SEC,
  bands,
  ema,
  haOf,
  niceStep,
  rsiOf,
  sma,
  vwapOf,
  type Bar,
  type ChartType,
  type IndKey,
} from "../data/perpsChart";
import { C, FONT } from "../theme";
import { hTap } from "../lib/haptics";
import {
  livePnl,
  useCandles,
  useLiveMarket,
  type UiOrder,
  type UiPosition,
} from "../hooks/perps";

const UP = "#37E099",
  DN = "#F0604D",
  AXIS = "#7C838C",
  INK = "#D6DAE0",
  AMBER = "#E8A33D";
const MONO = FONT.mono400;
type Ind = Record<IndKey, boolean>;
const NONE_P: UiPosition[] = [];
const NONE_O: UiOrder[] = [];

// ---- viewport: how wide one candle is, and how many candles we are scrolled back
const BW0 = 7; // default candle slot width (px)
const BW_MIN = 2; // most zoomed out
const BW_MAX = 30; // most zoomed in
const RP = 35; // empty space to the right of the newest candle (px)
const MIN_BARS = 8; // never scroll the last few candles off screen
type Vp = { bw: number; off: number };
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const f1 = (v: number) => v.toFixed(1);

const ICON: Record<ChartType, { d: string; fill?: boolean; soft?: boolean }[]> =
  {
    candles: [
      { d: "M6 3v3M6 14v3M14 4.5v2.5M14 15v1.5" },
      {
        d: "M5 6h2a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1z",
      },
      {
        d: "M13 7h2a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1h-2a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1z",
        fill: true,
      },
    ],
    ha: [
      { d: "M6 3.5v13M14 3.5v13" },
      {
        d: "M5 5.5h2a1 1 0 0 1 1 1v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-5a1 1 0 0 1 1-1z",
        fill: true,
      },
      {
        d: "M13 8h2a1 1 0 0 1 1 1v4.5a1 1 0 0 1-1 1h-2a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z",
        fill: true,
      },
    ],
    bars: [{ d: "M6 3.5v13M3.5 7H6M6 13h2.5M14 3.5v12M11.5 11H14M14 6h2.5" }],
    line: [{ d: "M2.5 14.5 7 9l3 3 7.5-8" }],
    area: [
      { d: "M2.5 14.5 7 9l3 3 7.5-8V17h-15z", fill: true, soft: true },
      { d: "M2.5 14.5 7 9l3 3 7.5-8" },
    ],
  };
function TypeIcon({
  t,
  size = 19,
  color,
}: {
  t: ChartType;
  size?: number;
  color: string;
}) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 20 20"
      fill="none"
      stroke={color}
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {ICON[t].map((p, i) => (
        <Path
          key={i}
          d={p.d}
          fill={p.fill ? color : "none"}
          fillOpacity={p.soft ? 0.28 : 1}
          stroke={p.soft ? "none" : color}
        />
      ))}
    </Svg>
  );
}

// ---------------------------------------------------------------- chart body
function ChartBody({
  sym,
  tf,
  type,
  ind,
  height,
  fs,
  onScrollLock,
  positions,
  orders,
}: {
  sym: string;
  tf: string;
  type: ChartType;
  ind: Ind;
  height: number;
  fs: boolean;
  onScrollLock?: (l: boolean) => void;
  positions: UiPosition[];
  orders: UiOrder[];
}) {
  const live = useLiveMarket(sym);
  const mark = live.mark;
  const { bars: base, loading, error } = useCandles(sym, tf);
  const [W, setW] = useState(0);
  const [cross, setCross] = useState<{ x: number; y: number } | null>(null);
  const [vp, setVp] = useState<Vp>({ bw: BW0, off: 0 });

  // latest geometry / callbacks for the gesture handlers (they are created once)
  const geo = useRef({ n: 0, PW: 0 });
  const lockRef = useRef(onScrollLock);
  lockRef.current = onScrollLock;
  const fling = useRef<number | null>(null);
  const stopFling = useCallback(() => {
    if (fling.current != null) cancelAnimationFrame(fling.current);
    fling.current = null;
  }, []);
  useEffect(() => stopFling, [stopFling]);

  // keep the last candle glued to the live mark price
  const bars = useMemo(() => {
    const b = base.slice() as unknown as Bar[];
    if (!b.length || !mark) return b;
    const l = { ...b[b.length - 1] };
    l.c = mark;
    l.h = Math.max(l.h, mark);
    l.l = Math.min(l.l, mark);
    b[b.length - 1] = l;
    return b;
  }, [base, mark]);
  const view: Bar[] = useMemo(
    () => (type === "ha" ? haOf(bars) : bars),
    [bars, type],
  );

  // new market or timeframe -> snap back to the latest candle (zoom level is kept)
  useEffect(() => {
    stopFling();
    setVp((v) => (v.off === 0 ? v : { ...v, off: 0 }));
  }, [sym, tf, stopFling]);

  // while you are looking at history, a new candle must not shift the view
  const lastT = bars.length ? bars[bars.length - 1].t : 0;
  const prevT = useRef(0);
  useEffect(() => {
    if (prevT.current && lastT > prevT.current)
      setVp((v) => (v.off > 0 ? { ...v, off: v.off + 1 } : v));
    prevT.current = lastT;
  }, [lastT]);

  // ---- gestures
  const gesture = useMemo(() => {
    const fit = (bw: number, off: number): Vp => ({
      bw: clamp(bw, BW_MIN, BW_MAX),
      off: clamp(off, 0, Math.max(0, geo.current.n - MIN_BARS)),
    });
    // parent ScrollView lock, counted so overlapping gestures do not unlock each other
    let held = 0;
    const session = () => {
      let on = false;
      return {
        start() {
          if (on) return;
          on = true;
          if (held++ === 0) lockRef.current?.(true);
        },
        end() {
          if (!on) return;
          on = false;
          held = Math.max(0, held - 1);
          if (held === 0) lockRef.current?.(false);
        },
      };
    };

    // --- drag to scroll. Uses the finger position inside the chart (e.x) rather than
    // translationX so it also works when the full-screen stage is rotated 90 degrees.
    const ps = session();
    let lastX = 0,
      lastAt = 0,
      vel = 0; // px per second
    const pan = (
      fs
        ? Gesture.Pan().minDistance(6)
        : // inline: only grab horizontal drags, leave vertical ones to the page scroll
          Gesture.Pan().activeOffsetX([-8, 8]).failOffsetY([-14, 14])
    )
      .runOnJS(true)
      .maxPointers(1)
      .onBegin(() => stopFling())
      .onStart((e) => {
        lastX = e.x;
        lastAt = Date.now();
        vel = 0;
        ps.start();
      })
      .onUpdate((e) => {
        const now = Date.now(),
          dx = e.x - lastX,
          dt = Math.max(1, now - lastAt);
        lastX = e.x;
        lastAt = now;
        vel = vel * 0.6 + (dx / dt) * 1000 * 0.4;
        setVp((v) => fit(v.bw, v.off + dx / v.bw));
      })
      .onEnd(() => {
        // inertia: keep gliding after a quick flick
        if (Date.now() - lastAt > 80 || Math.abs(vel) < 150) return;
        let v0 = vel,
          t = Date.now();
        const tick = () => {
          const now = Date.now(),
            dt = (now - t) / 1000;
          t = now;
          v0 *= Math.exp(-4 * dt);
          if (Math.abs(v0) < 25) {
            fling.current = null;
            return;
          }
          setVp((v) => fit(v.bw, v.off + (v0 * dt) / v.bw));
          fling.current = requestAnimationFrame(tick);
        };
        fling.current = requestAnimationFrame(tick);
      })
      .onFinalize(() => ps.end());

    // --- pinch to zoom, keeping the candle under your fingers in place
    const zs = session();
    let lastScale = 1;
    const pinch = Gesture.Pinch()
      .runOnJS(true)
      .onStart(() => {
        stopFling();
        lastScale = 1;
        zs.start();
      })
      .onUpdate((e) => {
        const k = e.scale / (lastScale || 1);
        lastScale = e.scale;
        const A = geo.current.PW - RP - e.focalX;
        setVp((v) => {
          const bw = clamp(v.bw * k, BW_MIN, BW_MAX);
          return fit(bw, v.off + A / v.bw - A / bw);
        });
      })
      .onFinalize(() => zs.end());

    // --- press and hold for the crosshair
    const cs = session();
    const crossG = Gesture.Pan()
      .runOnJS(true)
      .maxPointers(1)
      .activateAfterLongPress(220)
      .onStart((e) => {
        stopFling();
        cs.start();
        hTap();
        setCross({ x: e.x, y: e.y });
      })
      .onUpdate((e) => setCross({ x: e.x, y: e.y }))
      .onFinalize(() => {
        cs.end();
        setCross(null);
      });

    return Gesture.Race(crossG, Gesture.Simultaneous(pan, pinch));
  }, [fs, stopFling]);

  const myPos = positions.filter((p) => p.sym === sym);
  const myOrd = orders.filter((o) => o.sym === sym);

  const closes = useMemo(() => bars.map((b) => b.c), [bars]);
  const I = useMemo(
    () => ({
      ma: ind.ma ? sma(closes, 20) : null,
      ema: ind.ema ? ema(closes, 50) : null,
      bb: ind.bb ? bands(closes, 20, 2) : null,
      vwap: ind.vwap && bars.length ? vwapOf(bars) : null,
      rsi: ind.rsi ? rsiOf(closes, 14) : null,
    }),
    [closes, bars, ind.ma, ind.ema, ind.bb, ind.vwap, ind.rsi],
  );

  // ---- nothing to draw yet (all hooks are above this line)
  if (bars.length < 2) {
    return (
      <View
        style={{
          height,
          borderTopWidth: 1,
          borderBottomWidth: 1,
          borderColor: C.hair,
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
        }}
      >
        {loading ? (
          <ActivityIndicator color={C.ink3} />
        ) : (
          <Text style={s.ohlcT}>
            {error
              ? "Chart couldn't load. " + error
              : "No trades in this timeframe yet."}
          </Text>
        )}
      </View>
    );
  }

  const AX = 58,
    TH = 20,
    RS = ind.rsi ? 72 : 0;
  const PW = W - AX,
    MH = height - TH - RS;
  const n = bars.length,
    iN = n - 1;
  const bw = vp.bw;
  const off = clamp(vp.off, 0, Math.max(0, n - MIN_BARS));
  geo.current.n = n;
  geo.current.PW = PW;

  // `anchor` is the (fractional) candle index sitting at the right edge of the plot
  const anchor = iN - off;
  const xi = (i: number) => PW - RP - (anchor - i) * bw;
  const i1 = Math.min(iN, Math.floor(anchor + RP / bw));
  const i0 = Math.max(0, Math.min(i1, Math.ceil(anchor - (PW - RP) / bw) - 1));

  const lineOnly = type === "line" || type === "area";
  let hi = -Infinity,
    lo = Infinity,
    vmax = 0;
  for (let i = i0; i <= i1; i++) {
    const b = view[i];
    hi = Math.max(hi, lineOnly ? b.c : b.h);
    lo = Math.min(lo, lineOnly ? b.c : b.l);
    vmax = Math.max(vmax, b.v);
    const bb = I.bb?.[i];
    if (bb) {
      hi = Math.max(hi, bb[0]);
      lo = Math.min(lo, bb[1]);
    }
  }
  // pull nearby position lines into range
  const sp0 = hi - lo || hi * 0.01,
    near: number[] = [];
  myPos.forEach((q) => {
    near.push(q.entry);
    if (q.tp != null) near.push(q.tp);
    if (q.sl != null) near.push(q.sl);
  });
  myOrd.forEach((o) => near.push(o.px));
  near.forEach((v) => {
    if (v > hi && v - hi < sp0 * 0.8) hi = v;
    if (v < lo && lo - v < sp0 * 0.8) lo = v;
  });
  const span = hi - lo || hi * 0.01;
  hi += span * 0.14;
  lo -= span * 0.1;
  const top = 52,
    bot = MH - (ind.vol ? MH * 0.19 : 12);
  const y = (p: number) => top + ((hi - p) / (hi - lo)) * (bot - top);
  const py = (Y: number) => hi - ((Y - top) / (bot - top)) * (hi - lo);

  // the newest candle (may be off screen when you have scrolled back)
  const last = view[iN],
    lastUp = last.c >= last.o;
  const lastY = y(last.c),
    lastIn = lastY >= 0 && lastY <= MH,
    tagY = clamp(lastY, 10, MH - 10);
  const fp = (p: number) => (p >= 1000 ? fmtNum(p) : p.toFixed(2));

  // crosshair index
  const ci = cross
    ? clamp(Math.round(anchor - (PW - RP - cross.x) / bw), i0, i1)
    : null;
  const shown = ci != null ? view[ci] : last;
  const prevC = (
    ci != null ? view[Math.max(0, ci - 1)] : view[Math.max(0, iN - 1)]
  ).c;

  const pathOf = (arr: (number | null)[] | null) => {
    if (!arr) return "";
    let d = "",
      pen = false;
    for (let i = i0; i <= i1; i++) {
      const v = arr[i];
      if (v == null) {
        pen = false;
        continue;
      }
      d += (pen ? "L" : "M") + f1(xi(i)) + " " + f1(y(v));
      pen = true;
    }
    return d;
  };

  // candles / bars / volume as a handful of big paths (much cheaper to redraw while panning)
  let wickUp = "",
    wickDn = "",
    bodyUp = "",
    bodyDn = "",
    volUp = "",
    volDn = "";
  const half = Math.max(0.5, bw * 0.35);
  if (!lineOnly || ind.vol) {
    const tick = Math.max(1.5, bw * 0.43);
    for (let i = i0; i <= i1; i++) {
      const b = view[i],
        x = xi(i),
        up = b.c >= b.o;
      if (type === "bars") {
        const d = `M${f1(x)} ${f1(y(b.h))}V${f1(y(b.l))}M${f1(x - tick)} ${f1(y(b.o))}H${f1(x)}M${f1(x)} ${f1(y(b.c))}H${f1(x + tick)}`;
        if (up) wickUp += d;
        else wickDn += d;
      } else if (!lineOnly) {
        const yo = y(b.o),
          yc = y(b.c),
          h = Math.max(1, Math.abs(yo - yc));
        const w = `M${f1(x)} ${f1(y(b.h))}V${f1(y(b.l))}`;
        const r = `M${f1(x - half)} ${f1(Math.min(yo, yc))}h${f1(half * 2)}v${f1(h)}h${f1(-half * 2)}Z`;
        if (up) {
          wickUp += w;
          bodyUp += r;
        } else {
          wickDn += w;
          bodyDn += r;
        }
      }
      if (ind.vol) {
        const h = (b.v / (vmax || 1)) * MH * 0.15;
        const r = `M${f1(x - half)} ${f1(MH - h)}h${f1(half * 2)}v${f1(h)}h${f1(-half * 2)}Z`;
        if (up) volUp += r;
        else volDn += r;
      }
    }
  }

  const step = niceStep((hi - lo) / 5);
  const busy = [
    tagY,
    ...myPos.flatMap((q) =>
      q.liq != null ? [y(q.entry), y(q.liq)] : [y(q.entry)],
    ),
    ...myOrd.map((o) => y(o.px)),
  ];
  const grid: number[] = [];
  for (let p = Math.ceil(lo / step) * step; p <= hi; p += step) {
    const Y = y(p);
    if (Y < 6 || Y > MH - 4) continue;
    grid.push(p);
  }

  const tLabel = (t: number, prevT?: number) => {
    const d = new Date(t * 1000);
    if (tf === "1W" || tf === "1D")
      return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
    if (prevT != null && new Date(prevT * 1000).getDate() !== d.getDate())
      return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
    return (
      String(d.getHours()).padStart(2, "0") +
      ":" +
      String(d.getMinutes()).padStart(2, "0")
    );
  };
  // one label roughly every 64px, pinned to fixed candles so they slide with the chart
  const every = Math.max(1, Math.ceil(64 / bw));
  const timeTicks: number[] = [];
  for (let i = iN - Math.ceil((iN - i1) / every) * every; i >= i0; i -= every) {
    const x = xi(i);
    if (x > 24 && x < PW - 4) timeTicks.push(i);
  }

  // ---- overlay line helper (dashed line + left chip + axis tag)
  const lineChip = (
    key: string,
    price: number,
    label: string,
    col: string,
    dark: string,
    dash = "4 4",
  ) => {
    const Y = Math.max(12, Math.min(MH - 12, y(price)));
    const w = Math.ceil(label.length * 6.1) + 14;
    return (
      <G key={key}>
        <Line
          x1={0}
          x2={PW}
          y1={Y}
          y2={Y}
          stroke={col}
          strokeWidth={1}
          strokeDasharray={dash}
          opacity={0.9}
        />
        <Rect x={8} y={Y - 10} width={w} height={20} rx={6} fill={col} />
        <SvgText
          x={15}
          y={Y + 0.5}
          fill={dark}
          fontSize={10}
          fontFamily={MONO}
          fontWeight="600"
          alignmentBaseline="middle"
        >
          {label}
        </SvgText>
        <Rect
          x={PW + 1}
          y={Y - 9}
          width={AX - 2}
          height={18}
          rx={4}
          fill={col}
        />
        <SvgText
          x={PW + AX / 2}
          y={Y + 0.5}
          fill={dark}
          fontSize={10}
          fontFamily={MONO}
          textAnchor="middle"
          alignmentBaseline="middle"
        >
          {fp(price)}
        </SvgText>
      </G>
    );
  };

  const legend: [string, string, string][] = [];
  if (ind.ma && I.ma?.[iN] != null)
    legend.push(["MA 20", "#E8A33D", fp(I.ma[ci ?? iN] ?? I.ma[iN]!)]);
  if (ind.ema && I.ema?.[iN] != null)
    legend.push(["EMA 50", "#6FA8F5", fp(I.ema[ci ?? iN] ?? I.ema[iN]!)]);
  if (ind.vwap && I.vwap)
    legend.push(["VWAP", "#F07F9B", fp(I.vwap[ci ?? iN])]);

  const chg = (shown.c / prevC - 1) * 100;
  const rsiVal = I.rsi?.[ci ?? iN];

  return (
    <GestureDetector gesture={gesture}>
      <View
        collapsable={false}
        style={{
          height,
          borderTopWidth: 1,
          borderBottomWidth: 1,
          borderColor: C.hair,
        }}
        onLayout={(e) => setW(e.nativeEvent.layout.width)}
      >
        {W > 0 ? (
          <Svg pointerEvents="none" width={W} height={height}>
            <Defs>
              <LinearGradient id="pcArea" x1="0" y1="0" x2="0" y2="1">
                <Stop
                  offset="0"
                  stopColor={lastUp ? UP : DN}
                  stopOpacity={0.28}
                />
                <Stop offset="1" stopColor={lastUp ? UP : DN} stopOpacity={0} />
              </LinearGradient>
              {/* keeps candles from drawing over the price axis while scrolling */}
              <ClipPath id="pcClip">
                <Rect x={0} y={0} width={Math.max(0, PW)} height={height} />
              </ClipPath>
            </Defs>

            {/* grid + price axis */}
            {grid.map((p) => {
              const Y = Math.round(y(p)) + 0.5,
                hide = busy.some((b) => Math.abs(b - Y) < 11);
              return (
                <G key={p}>
                  <Line
                    x1={0}
                    x2={PW}
                    y1={Y}
                    y2={Y}
                    stroke="#161A21"
                    strokeWidth={1}
                  />
                  {!hide ? (
                    <SvgText
                      x={PW + 6}
                      y={Y}
                      fill={AXIS}
                      fontSize={10}
                      fontFamily={MONO}
                      alignmentBaseline="middle"
                    >
                      {fp(p)}
                    </SvgText>
                  ) : null}
                </G>
              );
            })}

            <G clipPath="url(#pcClip)">
              {/* volume */}
              {volUp ? <Path d={volUp} fill={UP} opacity={0.32} /> : null}
              {volDn ? <Path d={volDn} fill={DN} opacity={0.32} /> : null}

              {/* Bollinger */}
              {ind.bb ? (
                <>
                  <Path
                    d={pathOf(I.bb!.map((v) => (v ? v[0] : null)))}
                    stroke="#C79BF0"
                    strokeWidth={1}
                    fill="none"
                    opacity={0.8}
                  />
                  <Path
                    d={pathOf(I.bb!.map((v) => (v ? v[1] : null)))}
                    stroke="#C79BF0"
                    strokeWidth={1}
                    fill="none"
                    opacity={0.8}
                  />
                </>
              ) : null}

              {/* price series */}
              {type === "area" ? (
                <Path
                  d={
                    `M${f1(xi(i0))} ${bot} ` +
                    view
                      .slice(i0, i1 + 1)
                      .map((b, k) => `L${f1(xi(i0 + k))} ${f1(y(b.c))}`)
                      .join(" ") +
                    ` L${f1(xi(i1))} ${bot} Z`
                  }
                  fill="url(#pcArea)"
                />
              ) : null}
              {lineOnly ? (
                <Polyline
                  points={view
                    .slice(i0, i1 + 1)
                    .map((b, k) => `${f1(xi(i0 + k))},${f1(y(b.c))}`)
                    .join(" ")}
                  fill="none"
                  stroke={lastUp ? UP : DN}
                  strokeWidth={1.6}
                  strokeLinejoin="round"
                />
              ) : (
                <>
                  {wickUp ? (
                    <Path
                      d={wickUp}
                      stroke={UP}
                      strokeWidth={type === "bars" ? 1.2 : 1}
                      fill="none"
                    />
                  ) : null}
                  {wickDn ? (
                    <Path
                      d={wickDn}
                      stroke={DN}
                      strokeWidth={type === "bars" ? 1.2 : 1}
                      fill="none"
                    />
                  ) : null}
                  {bodyUp ? <Path d={bodyUp} fill={UP} /> : null}
                  {bodyDn ? <Path d={bodyDn} fill={DN} /> : null}
                </>
              )}

              {/* MA / EMA / VWAP */}
              {ind.ma ? (
                <Path
                  d={pathOf(I.ma)}
                  stroke="#E8A33D"
                  strokeWidth={1.2}
                  fill="none"
                />
              ) : null}
              {ind.ema ? (
                <Path
                  d={pathOf(I.ema)}
                  stroke="#6FA8F5"
                  strokeWidth={1.2}
                  fill="none"
                />
              ) : null}
              {ind.vwap ? (
                <Path
                  d={pathOf(I.vwap)}
                  stroke="#F07F9B"
                  strokeWidth={1.2}
                  fill="none"
                />
              ) : null}
            </G>

            {/* last price (tag sticks to the edge if the price is out of view) */}
            {lastIn ? (
              <Line
                x1={0}
                x2={PW}
                y1={lastY}
                y2={lastY}
                stroke={lastUp ? UP : DN}
                strokeWidth={1}
                strokeDasharray="2 3"
                opacity={0.7}
              />
            ) : null}
            <Rect
              x={PW + 1}
              y={tagY - 9}
              width={AX - 2}
              height={18}
              rx={4}
              fill={lastUp ? UP : DN}
            />
            <SvgText
              x={PW + AX / 2}
              y={tagY + 0.5}
              fill={lastUp ? "#06120D" : "#1C0805"}
              fontSize={10}
              fontFamily={MONO}
              textAnchor="middle"
              alignmentBaseline="middle"
            >
              {fp(last.c)}
            </SvgText>

            {/* your positions and orders */}
            {myPos.map((q) => {
              const pnl = livePnl(q, mark || q.entry);
              return (
                <G key={"p" + q.id}>
                  {lineChip(
                    "e" + q.id,
                    q.entry,
                    `${sideTxt(q.side)} ${q.lev}x  ${sMoney(pnl)}`,
                    INK,
                    "#0A0B0E",
                  )}
                  {q.liq != null
                    ? lineChip("l" + q.id, q.liq, "LIQ", DN, "#1C0805", "2 4")
                    : null}
                  {q.tp != null
                    ? lineChip("t" + q.id, q.tp, "TP", UP, "#06120D")
                    : null}
                  {q.sl != null
                    ? lineChip("s" + q.id, q.sl, "SL", DN, "#1C0805")
                    : null}
                </G>
              );
            })}
            {myOrd.map((o) =>
              lineChip(
                "o" + o.id,
                o.px,
                `${o.kind.toUpperCase()} ${sideTxt(o.side)}`,
                AMBER,
                "#1B1204",
                "6 3",
              ),
            )}

            {/* RSI pane */}
            {ind.rsi ? (
              <G>
                <Line x1={0} x2={W} y1={MH} y2={MH} stroke={C.hair} />
                {[30, 70].map((v) => {
                  const Y = MH + 8 + ((100 - v) / 100) * (RS - 16);
                  return (
                    <Line
                      key={v}
                      x1={0}
                      x2={PW}
                      y1={Y}
                      y2={Y}
                      stroke="#1C2129"
                      strokeDasharray="3 3"
                    />
                  );
                })}
                <Path
                  clipPath="url(#pcClip)"
                  d={(() => {
                    let d = "",
                      pen = false;
                    for (let i = i0; i <= i1; i++) {
                      const v = I.rsi![i];
                      if (v == null) {
                        pen = false;
                        continue;
                      }
                      d +=
                        (pen ? "L" : "M") +
                        f1(xi(i)) +
                        " " +
                        f1(MH + 8 + ((100 - v) / 100) * (RS - 16));
                      pen = true;
                    }
                    return d;
                  })()}
                  stroke="#7FD3E0"
                  strokeWidth={1.2}
                  fill="none"
                />
                <SvgText
                  x={PW + 6}
                  y={MH + 14}
                  fill="#7FD3E0"
                  fontSize={10}
                  fontFamily={MONO}
                >
                  {rsiVal != null ? rsiVal.toFixed(1) : ""}
                </SvgText>
              </G>
            ) : null}

            {/* time axis */}
            {timeTicks.map((i) => (
              <SvgText
                key={"t" + i}
                x={xi(i)}
                y={height - 7}
                fill={AXIS}
                fontSize={9.5}
                fontFamily={MONO}
                textAnchor="middle"
              >
                {tLabel(bars[i].t, bars[Math.max(0, i - every)].t)}
              </SvgText>
            ))}

            {/* crosshair */}
            {cross && ci != null ? (
              <G>
                <Line
                  x1={xi(ci)}
                  x2={xi(ci)}
                  y1={0}
                  y2={height - TH}
                  stroke={AXIS}
                  strokeDasharray="3 3"
                />
                <Line
                  x1={0}
                  x2={PW}
                  y1={cross.y}
                  y2={cross.y}
                  stroke={AXIS}
                  strokeDasharray="3 3"
                />
                <Rect
                  x={PW + 1}
                  y={cross.y - 9}
                  width={AX - 2}
                  height={18}
                  rx={4}
                  fill="#262C36"
                />
                <SvgText
                  x={PW + AX / 2}
                  y={cross.y + 0.5}
                  fill={INK}
                  fontSize={10}
                  fontFamily={MONO}
                  textAnchor="middle"
                  alignmentBaseline="middle"
                >
                  {fp(py(cross.y))}
                </SvgText>
                <Rect
                  x={Math.max(2, Math.min(PW - 84, xi(ci) - 42))}
                  y={height - TH + 1}
                  width={84}
                  height={16}
                  rx={4}
                  fill="#262C36"
                />
                <SvgText
                  x={Math.max(2, Math.min(PW - 84, xi(ci) - 42)) + 42}
                  y={height - TH + 9.5}
                  fill={INK}
                  fontSize={9.5}
                  fontFamily={MONO}
                  textAnchor="middle"
                  alignmentBaseline="middle"
                >
                  {tLabel(bars[ci].t)}
                </SvgText>
              </G>
            ) : null}
          </Svg>
        ) : null}

        {/* OHLC readout */}
        <View pointerEvents="none" style={s.ohlc}>
          <Text style={s.ohlcT} numberOfLines={1}>
            <Text style={s.k}>O </Text>
            <Text style={s.b}>{fp(shown.o)} </Text>
            <Text style={s.k}>H </Text>
            <Text style={s.b}>{fp(shown.h)} </Text>
            <Text style={s.k}>L </Text>
            <Text style={s.b}>{fp(shown.l)} </Text>
            <Text style={s.k}>C </Text>
            <Text style={s.b}>{fp(shown.c)} </Text>
            <Text style={{ color: chg >= 0 ? UP : DN }}>
              {chg >= 0 ? "+" : "−"}
              {Math.abs(chg).toFixed(2)}%
            </Text>
          </Text>
          {legend.length ? (
            <Text style={s.ohlcT} numberOfLines={1}>
              {legend.map(([k, c, v]) => (
                <Text key={k} style={{ color: c }}>
                  {k} {v}{" "}
                </Text>
              ))}
            </Text>
          ) : null}
        </View>

        {/* jump back to the latest candle */}
        {off > 0.5 && W > 0 ? (
          <Pressable
            onPress={() => {
              hTap();
              stopFling();
              setVp((v) => ({ ...v, off: 0 }));
            }}
            hitSlop={8}
            accessibilityLabel="Jump to latest candle"
            style={[s.jump, { left: PW - 38, top: MH - 38 }]}
          >
            <Svg
              width={16}
              height={16}
              viewBox="0 0 20 20"
              fill="none"
              stroke={INK}
              strokeWidth={1.8}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <Path d="M5 5l5 5-5 5M14.5 5v10" />
            </Svg>
          </Pressable>
        ) : null}
      </View>
    </GestureDetector>
  );
}

// ---------------------------------------------------------------- stage (toolbar + chart)
function Stage({
  sym,
  tf,
  setTf,
  type,
  setType,
  ind,
  setInd,
  height,
  fs,
  onFs,
  onScrollLock,
  positions,
  orders,
}: {
  sym: string;
  tf: string;
  setTf: (t: string) => void;
  type: ChartType;
  setType: (t: ChartType) => void;
  ind: Ind;
  setInd: (i: Ind) => void;
  height: number;
  fs: boolean;
  onFs: () => void;
  onScrollLock?: (l: boolean) => void;
  positions: UiPosition[];
  orders: UiOrder[];
}) {
  const [menu, setMenu] = useState<null | "type" | "ind">(null);
  const anyInd = (Object.keys(ind) as IndKey[]).some(
    (k) => ind[k] && k !== "vol",
  );
  return (
    <View style={{ backgroundColor: C.ground, zIndex: 5 }}>
      <View style={s.bar}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ flex: 1 }}
          contentContainerStyle={{ gap: 2, alignItems: "center" }}
        >
          {Object.keys(TF_SEC).map((t) => (
            <Pressable
              key={t}
              hitSlop={{ top: 8, bottom: 8 }}
              onPress={() => {
                hTap();
                setTf(t);
              }}
              style={[s.tf, t === tf && s.tfOn]}
              accessibilityRole="tab"
              accessibilityState={{ selected: t === tf }}
            >
              <Text style={[s.tfT, t === tf && { color: C.ink1 }]}>{t}</Text>
            </Pressable>
          ))}
        </ScrollView>
        <View style={s.div} />
        <Pressable
          style={s.icon}
          onPress={() => setMenu(menu === "type" ? null : "type")}
          accessibilityLabel="Chart type"
          hitSlop={5}
        >
          <TypeIcon t={type} color={C.ink2} />
        </Pressable>
        <Pressable
          style={s.icon}
          onPress={() => setMenu(menu === "ind" ? null : "ind")}
          accessibilityLabel="Indicators"
          hitSlop={5}
        >
          <Svg
            width={18}
            height={18}
            viewBox="0 0 20 20"
            fill="none"
            stroke={anyInd ? C.mint : C.ink2}
            strokeWidth={1.7}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <Path d="M2.5 14.5c2.2 0 2.8-9 5-9s2.8 9 5 9 2.8-6 5-6" />
          </Svg>
        </Pressable>
        <Pressable
          style={s.icon}
          onPress={onFs}
          accessibilityLabel={fs ? "Exit full screen" : "Full-screen chart"}
          hitSlop={5}
        >
          <Svg
            width={17}
            height={17}
            viewBox="0 0 20 20"
            fill="none"
            stroke={C.ink2}
            strokeWidth={1.8}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <Path
              d={
                fs
                  ? "M7.5 3.5v4h-4M12.5 3.5v4h4M7.5 16.5v-4h-4M12.5 16.5v-4h4"
                  : "M3.5 7.5v-4h4M16.5 7.5v-4h-4M3.5 12.5v4h4M16.5 12.5v4h-4"
              }
            />
          </Svg>
        </Pressable>
      </View>

      <ChartBody
        sym={sym}
        tf={tf}
        type={type}
        ind={ind}
        height={height}
        fs={fs}
        onScrollLock={onScrollLock}
        positions={positions}
        orders={orders}
      />

      {menu ? (
        <>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setMenu(null)}
          />
          <View style={[s.menu, { right: 14 }]}>
            <Text style={s.menuLbl}>
              {menu === "type" ? "CHART TYPE" : "INDICATORS"}
            </Text>
            {menu === "type"
              ? CTYPES.map(([k, t]) => (
                  <Pressable
                    key={k}
                    style={[s.mi, k === type && s.miOn]}
                    onPress={() => {
                      setType(k);
                      setMenu(null);
                    }}
                  >
                    <TypeIcon
                      t={k}
                      size={18}
                      color={k === type ? C.mint : C.ink3}
                    />
                    <Text style={[s.miT, k === type && { color: C.ink1 }]}>
                      {t}
                    </Text>
                  </Pressable>
                ))
              : CIND.map(([k, t, c]) => (
                  <Pressable
                    key={k}
                    style={[s.mi, ind[k] && s.miOn]}
                    onPress={() => setInd({ ...ind, [k]: !ind[k] })}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: ind[k] }}
                  >
                    <View style={[s.sw, { backgroundColor: c }]} />
                    <Text style={[s.miT, ind[k] && { color: C.ink1 }]}>
                      {t}
                    </Text>
                    <View
                      style={[
                        s.mk,
                        ind[k] && { backgroundColor: C.mint, borderWidth: 0 },
                      ]}
                    />
                  </Pressable>
                ))}
          </View>
        </>
      ) : null}
    </View>
  );
}

export function ChartStage({
  sym,
  onScrollLock,
  positions = NONE_P,
  orders = NONE_O,
}: {
  sym: string;
  onScrollLock?: (l: boolean) => void;
  positions?: UiPosition[];
  orders?: UiOrder[];
}) {
  const [tf, setTf] = useState("15m");
  const [type, setType] = useState<ChartType>("candles");
  const [ind, setInd] = useState<Ind>({
    vol: true,
    ma: true,
    ema: false,
    bb: false,
    vwap: false,
    rsi: false,
  });
  const [fs, setFs] = useState(false);
  const { width: SW, height: SH } = useWindowDimensions();

  return (
    <>
      <Stage
        sym={sym}
        tf={tf}
        setTf={setTf}
        type={type}
        setType={setType}
        ind={ind}
        setInd={setInd}
        height={318}
        fs={false}
        onFs={() => setFs(true)}
        onScrollLock={onScrollLock}
        positions={positions}
        orders={orders}
      />
      <Modal
        visible={fs}
        animationType="fade"
        onRequestClose={() => setFs(false)}
        statusBarTranslucent
        supportedOrientations={["portrait", "landscape"]}
      >
        {/* a Modal is a separate native window, so gestures need their own root view here */}
        <GestureHandlerRootView style={{ flex: 1, backgroundColor: C.ground }}>
          {/* phone upright -> rotate the stage to landscape, like the prototype */}
          <View
            style={{
              position: "absolute",
              width: SH,
              height: SW,
              left: (SW - SH) / 2,
              top: (SH - SW) / 2,
              transform: [{ rotate: SH > SW * 1.1 ? "90deg" : "0deg" }],
            }}
          >
            {fs ? (
              <Stage
                sym={sym}
                tf={tf}
                setTf={setTf}
                type={type}
                setType={setType}
                ind={ind}
                setInd={setInd}
                height={SW - 46}
                fs
                onFs={() => setFs(false)}
                positions={positions}
                orders={orders}
              />
            ) : null}
          </View>
        </GestureHandlerRootView>
      </Modal>
    </>
  );
}

const s = StyleSheet.create({
  bar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingLeft: 20,
    paddingRight: 14,
    height: 46,
  },
  tf: {
    height: 30,
    paddingHorizontal: 8,
    borderRadius: 8,
    justifyContent: "center",
  },
  tfOn: { backgroundColor: C.raised },
  tfT: { fontFamily: MONO, fontSize: 11.5, color: C.ink4 },
  div: { width: 1, height: 18, backgroundColor: C.hair, marginHorizontal: 3 },
  icon: {
    width: 34,
    height: 30,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
  },
  ohlc: { position: "absolute", left: 20, top: 8, right: 64 },
  ohlcT: {
    fontFamily: MONO,
    fontSize: 9.5,
    lineHeight: 15,
    color: C.ink3,
    fontVariant: ["tabular-nums"],
  },
  k: { color: C.ink3 },
  b: { color: INK },
  jump: {
    position: "absolute",
    width: 30,
    height: 30,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#262C36",
    borderWidth: 1,
    borderColor: "#3A404A",
  },
  menu: {
    position: "absolute",
    top: 44,
    minWidth: 204,
    padding: 6,
    borderRadius: 16,
    backgroundColor: C.raised,
    borderWidth: 1,
    borderColor: "#262C36",
    zIndex: 9,
    elevation: 9,
  },
  menuLbl: {
    fontFamily: MONO,
    fontSize: 9,
    letterSpacing: 1.6,
    color: C.ink4,
    marginHorizontal: 10,
    marginTop: 6,
    marginBottom: 4,
  },
  mi: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    minHeight: 44,
    paddingHorizontal: 10,
    borderRadius: 10,
  },
  miOn: { backgroundColor: "#20252E" },
  miT: { flex: 1, fontFamily: FONT.sans600, fontSize: 14, color: C.ink2 },
  sw: { width: 8, height: 8, borderRadius: 999 },
  mk: {
    width: 16,
    height: 16,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: "#3A404A",
  },
});
