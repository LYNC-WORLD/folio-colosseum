// src/components/perps/PerpChart.tsx
// Chart stage from the prototype: timeframes, chart type, indicators, full screen,
// price axis, last-price tag, your entry / liquidation / TP / SL / order lines,
// and a press-and-hold crosshair. Drawn with react-native-svg from mock candles.
//
// Not ported (needs gesture-handler work): pan/pinch zoom and dragging TP/SL lines.
// TP/SL are edited from the position sheet instead.

import { useMemo, useRef, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import Svg, {
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
import {
  usePerps,
  liqOf,
  pnlOf,
  sideTxt,
  sMoney,
  fmtNum,
} from "../data/perpsStore";
import {
  CIND,
  CTYPES,
  TF_SEC,
  bands,
  ema,
  genBars,
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

const UP = "#37E099",
  DN = "#F0604D",
  AXIS = "#7C838C",
  INK = "#D6DAE0",
  AMBER = "#E8A33D";
const MONO = FONT.mono400;
type Ind = Record<IndKey, boolean>;

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
  onScrollLock,
}: {
  sym: string;
  tf: string;
  type: ChartType;
  ind: Ind;
  height: number;
  onScrollLock?: (l: boolean) => void;
}) {
  const st = usePerps();
  const m = st.marks[sym];
  const [W, setW] = useState(0);
  const [cross, setCross] = useState<{ x: number; y: number } | null>(null);
  const hold = useRef<{
    t: ReturnType<typeof setTimeout> | null;
    on: boolean;
    x: number;
    y: number;
  }>({ t: null, on: false, x: 0, y: 0 });

  const base = useMemo(() => genBars(sym, tf, m.anchor, m.o24), [sym, tf]); // eslint-disable-line
  const bars = useMemo(() => {
    const b = base.slice();
    const l = { ...b[b.length - 1] };
    l.c = m.mark;
    l.h = Math.max(l.h, m.mark);
    l.l = Math.min(l.l, m.mark);
    b[b.length - 1] = l;
    return b;
  }, [base, m.mark]);

  const myPos = st.perps.filter((p) => p.sym === sym);
  const myOrd = st.orders.filter((o) => o.sym === sym);

  const AX = 58,
    TH = 20,
    RS = ind.rsi ? 72 : 0;
  const PW = W - AX,
    MH = height - TH - RS,
    bw = 7,
    rp = bw * 5;
  const n = bars.length;
  const view: Bar[] = type === "ha" ? haOf(bars) : bars;
  const i1 = n - 1,
    i0 = Math.max(0, i1 - Math.floor((PW - rp) / bw));
  const xi = (i: number) => PW - rp - (n - 1 - i) * bw;

  const closes = useMemo(() => bars.map((b) => b.c), [bars]);
  const I = useMemo(
    () => ({
      ma: ind.ma ? sma(closes, 20) : null,
      ema: ind.ema ? ema(closes, 50) : null,
      bb: ind.bb ? bands(closes, 20, 2) : null,
      vwap: ind.vwap ? vwapOf(bars) : null,
      rsi: ind.rsi ? rsiOf(closes, 14) : null,
    }),
    [closes, bars, ind.ma, ind.ema, ind.bb, ind.vwap, ind.rsi],
  );

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

  const last = view[i1],
    lastUp = last.c >= last.o;
  const fp = (p: number) => (p >= 1000 ? fmtNum(p) : p.toFixed(2));

  // crosshair index
  const ci = cross
    ? Math.max(i0, Math.min(i1, Math.round(n - 1 - (PW - rp - cross.x) / bw)))
    : null;
  const shown = ci != null ? view[ci] : last;
  const prevC = (
    ci != null ? view[Math.max(0, ci - 1)] : view[Math.max(0, i1 - 1)]
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
      d += (pen ? "L" : "M") + xi(i).toFixed(1) + " " + y(v).toFixed(1);
      pen = true;
    }
    return d;
  };

  const step = niceStep((hi - lo) / 5);
  const busy = [
    y(last.c),
    ...myPos.flatMap((q) => [y(q.entry), y(liqOf(q))]),
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
  const timeTicks: number[] = [];
  for (let i = i1; i >= i0; i -= 10) timeTicks.push(i);

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

  const touch = (e: any) => ({
    x: e.nativeEvent.locationX as number,
    y: e.nativeEvent.locationY as number,
  });
  const clearHold = () => {
    const h = hold.current;
    if (h.t) clearTimeout(h.t);
    h.t = null;
    if (h.on) {
      h.on = false;
      onScrollLock?.(false);
    }
    setCross(null);
  };

  const legend: [string, string, string][] = [];
  if (ind.ma && I.ma?.[i1] != null)
    legend.push(["MA 20", "#E8A33D", fp(I.ma[ci ?? i1] ?? I.ma[i1]!)]);
  if (ind.ema && I.ema?.[i1] != null)
    legend.push(["EMA 50", "#6FA8F5", fp(I.ema[ci ?? i1] ?? I.ema[i1]!)]);
  if (ind.vwap && I.vwap)
    legend.push(["VWAP", "#F07F9B", fp(I.vwap[ci ?? i1])]);

  const chg = (shown.c / prevC - 1) * 100;
  const rsiVal = I.rsi?.[ci ?? i1];

  return (
    <View
      style={{
        height,
        borderTopWidth: 1,
        borderBottomWidth: 1,
        borderColor: C.hair,
      }}
      onLayout={(e) => setW(e.nativeEvent.layout.width)}
      onTouchStart={(e) => {
        const p = touch(e),
          h = hold.current;
        h.x = p.x;
        h.y = p.y;
        h.t = setTimeout(() => {
          h.on = true;
          onScrollLock?.(true);
          hTap();
          setCross({ x: h.x, y: h.y });
        }, 220);
      }}
      onTouchMove={(e) => {
        const p = touch(e),
          h = hold.current;
        if (h.on) setCross(p);
        else if (h.t && (Math.abs(p.x - h.x) > 8 || Math.abs(p.y - h.y) > 8)) {
          clearTimeout(h.t);
          h.t = null;
        }
      }}
      onTouchEnd={clearHold}
      onTouchCancel={clearHold}
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

          {/* volume */}
          {ind.vol
            ? view.slice(i0, i1 + 1).map((b, k) => {
                const h = (b.v / (vmax || 1)) * MH * 0.15;
                return (
                  <Rect
                    key={"v" + k}
                    x={xi(i0 + k) - bw * 0.35}
                    y={MH - h}
                    width={bw * 0.7}
                    height={h}
                    fill={b.c >= b.o ? UP : DN}
                    opacity={0.32}
                  />
                );
              })
            : null}

          {/* Bollinger / MA / EMA / VWAP */}
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
                `M${xi(i0).toFixed(1)} ${bot} ` +
                view
                  .slice(i0, i1 + 1)
                  .map(
                    (b, k) => `L${xi(i0 + k).toFixed(1)} ${y(b.c).toFixed(1)}`,
                  )
                  .join(" ") +
                ` L${xi(i1).toFixed(1)} ${bot} Z`
              }
              fill="url(#pcArea)"
            />
          ) : null}
          {lineOnly ? (
            <Polyline
              points={view
                .slice(i0, i1 + 1)
                .map((b, k) => `${xi(i0 + k).toFixed(1)},${y(b.c).toFixed(1)}`)
                .join(" ")}
              fill="none"
              stroke={lastUp ? UP : DN}
              strokeWidth={1.6}
              strokeLinejoin="round"
            />
          ) : type === "bars" ? (
            view.slice(i0, i1 + 1).map((b, k) => {
              const x = xi(i0 + k),
                col = b.c >= b.o ? UP : DN;
              return (
                <Path
                  key={"b" + k}
                  d={`M${x} ${y(b.h)}V${y(b.l)}M${x - 3} ${y(b.o)}H${x}M${x} ${y(b.c)}H${x + 3}`}
                  stroke={col}
                  strokeWidth={1.2}
                  fill="none"
                />
              );
            })
          ) : (
            view.slice(i0, i1 + 1).map((b, k) => {
              const x = xi(i0 + k),
                col = b.c >= b.o ? UP : DN,
                yo = y(b.o),
                yc = y(b.c);
              return (
                <G key={"c" + k}>
                  <Line
                    x1={x}
                    x2={x}
                    y1={y(b.h)}
                    y2={y(b.l)}
                    stroke={col}
                    strokeWidth={1}
                  />
                  <Rect
                    x={x - bw * 0.35}
                    y={Math.min(yo, yc)}
                    width={bw * 0.7}
                    height={Math.max(1, Math.abs(yo - yc))}
                    fill={col}
                  />
                </G>
              );
            })
          )}
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

          {/* last price */}
          <Line
            x1={0}
            x2={PW}
            y1={y(last.c)}
            y2={y(last.c)}
            stroke={lastUp ? UP : DN}
            strokeWidth={1}
            strokeDasharray="2 3"
            opacity={0.7}
          />
          <Rect
            x={PW + 1}
            y={y(last.c) - 9}
            width={AX - 2}
            height={18}
            rx={4}
            fill={lastUp ? UP : DN}
          />
          <SvgText
            x={PW + AX / 2}
            y={y(last.c) + 0.5}
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
            const pnl = pnlOf(q, m.mark);
            return (
              <G key={"p" + q.id}>
                {lineChip(
                  "e" + q.id,
                  q.entry,
                  `${sideTxt(q.side)} ${q.lev}x  ${sMoney(pnl)}`,
                  INK,
                  "#0A0B0E",
                )}
                {lineChip("l" + q.id, liqOf(q), "LIQ", DN, "#1C0805", "2 4")}
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
              `${o.kind.toUpperCase()} ${sideTxt(o.side)} ${o.lev}x`,
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
                      xi(i).toFixed(1) +
                      " " +
                      (MH + 8 + ((100 - v) / 100) * (RS - 16)).toFixed(1);
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
              {tLabel(bars[i].t, bars[Math.max(0, i - 10)].t)}
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
    </View>
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
        onScrollLock={onScrollLock}
      />

      {menu ? (
        <>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setMenu(null)}
          />
          <View style={[s.menu, { right: menu === "type" ? 14 : 14 }]}>
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
}: {
  sym: string;
  onScrollLock?: (l: boolean) => void;
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
      />
      <Modal
        visible={fs}
        animationType="fade"
        onRequestClose={() => setFs(false)}
        statusBarTranslucent
        supportedOrientations={["portrait", "landscape"]}
      >
        <View style={{ flex: 1, backgroundColor: C.ground }}>
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
            />
          </View>
        </View>
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
