// src/components/PriceChart.tsx — price chart in the prototype's style.
// Same props as before (mint, initialPeriod, onChange, onScrub), so callers keep working.
//
// • line draws itself left → right (900ms), gradient fill fades in under it
// • a mint dot sits on the latest price with a ping ring pulsing out of it
// • drag sideways to scrub: hairline + white dot follow your finger,
//   onScrub reports the candle so the header can show that price and date
// • period switch: 1D 1W 1M 1Y All (prototype range group)

import { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedProps,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Svg, { Defs, LinearGradient, Path, Stop } from "react-native-svg";
import { C, FONT, TYPE } from "../theme";
import { timing } from "../theme/motion";
import { hSelect } from "../lib/haptics";
import { CHART_PERIODS, useStockChart, type Candle, type ChartPeriod } from "../hooks";
import { Skeleton } from "./ui/Skeleton";

const AnimatedPath = Animated.createAnimatedComponent(Path);

const H = 160;
const PAD_TOP = 14;
const PAD_BOTTOM = 10;

export type ChartChange = { period: ChartPeriod; changeAbs: number; changePct: number };

type Props = {
  mint: string;
  initialPeriod?: ChartPeriod;
  onChange?: (change: ChartChange) => void;
  onScrub?: (candle: Candle | null) => void;
  /** also report period switches (for "past year" labels) */
  onPeriod?: (p: ChartPeriod) => void;
};

export function PriceChart({ mint, initialPeriod = "1Y", onChange, onScrub, onPeriod }: Props) {
  const [period, setPeriod] = useState<ChartPeriod>(initialPeriod);
  const { candles, loading, error, reload } = useStockChart(mint, period);
  const [width, setWidth] = useState(0);
  const [active, setActive] = useState<number | null>(null);

  const geo = useMemo(() => {
    if (!candles || candles.length < 2 || width === 0) return null;
    const closes = candles.map((c) => c.close);
    const lo = Math.min(...closes);
    const hi = Math.max(...closes);
    const pad = (hi - lo) * 0.12 || 1;
    const y = (v: number) => PAD_TOP + (1 - (v - (lo - pad)) / (hi + pad - (lo - pad))) * (H - PAD_TOP - PAD_BOTTOM);
    const W = width - 8; // leave room for the end dot
    const step = W / (closes.length - 1);
    const pts = closes.map((v, i) => [i * step, y(v)] as const);
    let len = 0;
    for (let i = 1; i < pts.length; i++) len += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    const line = pts.map(([x, yy], i) => `${i ? "L" : "M"}${x.toFixed(1)},${yy.toFixed(1)}`).join(" ");
    const area = `${line} L${pts[pts.length - 1][0].toFixed(1)},${H} L0,${H} Z`;
    return { pts, line, area, len, step };
  }, [candles, width]);

  const change = useMemo<ChartChange | null>(() => {
    if (!candles || candles.length === 0) return null;
    const first = candles[0].open || candles[0].close;
    const last = candles[candles.length - 1].close;
    const changeAbs = last - first;
    return { period, changeAbs, changePct: first ? (changeAbs / first) * 100 : 0 };
  }, [candles, period]);

  useEffect(() => {
    if (change) onChange?.(change);
  }, [change]);

  const up = (change?.changeAbs ?? 0) >= 0;
  const stroke = up ? C.mint : C.loss;

  // ---- draw-in animation, replayed whenever the line changes ----
  const draw = useSharedValue(0);
  const fill = useSharedValue(0);
  const dot = useSharedValue(0);
  useEffect(() => {
    if (!geo) return;
    draw.value = 0;
    fill.value = 0;
    dot.value = 0;
    draw.value = withTiming(1, timing(900));
    fill.value = withDelay(250, withTiming(1, timing(700)));
    dot.value = withDelay(850, withTiming(1, timing(250)));
  }, [geo?.line]);

  const len = geo?.len ?? 1;
  const lineProps = useAnimatedProps(() => ({ strokeDashoffset: (1 - draw.value) * len }));
  const areaProps = useAnimatedProps(() => ({ opacity: fill.value }));

  // ---- ping ring on the end dot ----
  const reduced = useReducedMotion();
  const ping = useSharedValue(reduced ? 1 : 0); // 1 = ring fully faded out
  useEffect(() => {
    if (reduced) return; // Reduce Motion: keep the dot, drop the pulsing ring
    ping.value = withRepeat(withTiming(1, { duration: 1800, easing: Easing.bezier(0.22, 0.61, 0.36, 1) }), -1, false);
  }, [reduced]);
  const scrubbing = active != null;
  const dotStyle = useAnimatedStyle(() => ({ opacity: scrubbing ? 0 : dot.value }));
  const pingStyle = useAnimatedStyle(() => ({
    opacity: 1 - ping.value,
    transform: [{ scale: 0.6 + 1.6 * ping.value }],
  }));

  // ---- scrubbing ----
  const geoRef = useRef(geo);
  geoRef.current = geo;
  const candlesRef = useRef(candles);
  candlesRef.current = candles;
  const lastIndex = useRef<number | null>(null);
  const onScrubRef = useRef(onScrub);
  onScrubRef.current = onScrub;

  const pick = (x: number) => {
    const g = geoRef.current;
    const cs = candlesRef.current;
    if (!g || !cs) return;
    const i = Math.max(0, Math.min(cs.length - 1, Math.round(x / g.step)));
    if (i === lastIndex.current) return;
    lastIndex.current = i;
    setActive(i);
    onScrubRef.current?.(cs[i]);
  };
  const end = () => {
    lastIndex.current = null;
    setActive(null);
    onScrubRef.current?.(null);
  };

  const pan = useMemo(
    () =>
      Gesture.Pan()
        .runOnJS(true)
        .activeOffsetX([-6, 6])
        .failOffsetY([-14, 14])
        .onStart((e) => {
          hSelect();
          pick(e.x);
        })
        .onUpdate((e) => pick(e.x))
        .onFinalize(end),
    [],
  );

  useEffect(() => end(), [period]);

  const activePt = active != null && geo ? geo.pts[active] : null;
  const endPt = geo ? geo.pts[geo.pts.length - 1] : null;

  return (
    <View style={s.card}>
      <View style={s.chart} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
        {!candles && loading ? (
          <Skeleton height={H - 20} radius={12} />
        ) : error && !candles ? (
          <Pressable onPress={reload} style={s.center} accessibilityRole="button">
            <Text style={[TYPE.sub, { color: C.loss }]}>Couldn't load the chart</Text>
            <Text style={s.retry}>Tap to retry</Text>
          </Pressable>
        ) : !geo ? (
          <View style={s.center}>
            <Text style={TYPE.sub}>Not enough price history yet</Text>
          </View>
        ) : (
          <GestureDetector gesture={pan}>
            <View style={StyleSheet.absoluteFill} accessibilityLabel={`Price chart, ${period}`}>
              <Svg width={width} height={H}>
                <Defs>
                  <LinearGradient id="pcFill" x1="0" y1="0" x2="0" y2="1">
                    <Stop offset="0" stopColor={stroke} stopOpacity={0.22} />
                    <Stop offset="1" stopColor={stroke} stopOpacity={0} />
                  </LinearGradient>
                </Defs>
                <AnimatedPath d={geo.area} fill="url(#pcFill)" animatedProps={areaProps} />
                <AnimatedPath
                  d={geo.line}
                  stroke={stroke}
                  strokeWidth={2}
                  fill="none"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                  strokeDasharray={[geo.len, geo.len]}
                  animatedProps={lineProps}
                />
              </Svg>

              {endPt ? (
                <Animated.View pointerEvents="none" style={[s.endWrap, { left: endPt[0] - 7, top: endPt[1] - 7 }, dotStyle]}>
                  <Animated.View style={[s.ping, { borderColor: up ? "rgba(55,224,153,0.45)" : "rgba(240,96,77,0.45)" }, pingStyle]} />
                  <View style={[s.glow, { backgroundColor: up ? "rgba(55,224,153,0.18)" : "rgba(240,96,77,0.18)" }]} />
                  <View style={[s.endDot, { backgroundColor: stroke }]} />
                </Animated.View>
              ) : null}

              {activePt ? (
                <>
                  <View pointerEvents="none" style={[s.scrubLine, { left: activePt[0] }]} />
                  <View pointerEvents="none" style={[s.scrubDot, { left: activePt[0] - 6, top: activePt[1] - 6 }]} />
                </>
              ) : null}
            </View>
          </GestureDetector>
        )}

        {loading && candles ? <ActivityIndicator size="small" color={C.ink4} style={s.spinner} /> : null}
      </View>

      <View style={s.periods} accessibilityRole="tablist">
        {CHART_PERIODS.map((p) => (
          <PeriodButton
            key={p}
            label={p}
            on={p === period}
            onPress={() => {
              if (p === period) return;
              hSelect();
              setPeriod(p);
              onPeriod?.(p);
            }}
          />
        ))}
      </View>
    </View>
  );
}

function PeriodButton({ label, on, onPress }: { label: string; on: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={{ top: 6, bottom: 6 }}
      style={[s.period, on && s.periodOn]}
      accessibilityRole="tab"
      accessibilityState={{ selected: on }}
    >
      <Text style={[s.periodText, on && { color: C.ink1 }]}>{label}</Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  card: { backgroundColor: C.surface, borderRadius: 16, paddingTop: 14, paddingHorizontal: 14, paddingBottom: 10, gap: 8 },
  chart: { height: H, justifyContent: "center" },
  center: { alignItems: "center", gap: 6 },
  retry: { fontFamily: FONT.sans600, fontSize: 13, color: C.mint },
  spinner: { position: "absolute", top: 0, right: 0 },

  endWrap: { position: "absolute", width: 14, height: 14 },
  endDot: { position: "absolute", left: 0, top: 0, width: 14, height: 14, borderRadius: 999 },
  glow: { position: "absolute", left: -4, top: -4, width: 22, height: 22, borderRadius: 999 },
  ping: { position: "absolute", left: -4, top: -4, width: 22, height: 22, borderRadius: 999, borderWidth: 2 },

  scrubLine: { position: "absolute", top: 0, bottom: 0, width: 1, backgroundColor: "rgba(255,255,255,0.22)" },
  scrubDot: {
    position: "absolute",
    width: 12,
    height: 12,
    borderRadius: 999,
    backgroundColor: C.ink1,
    borderWidth: 3,
    borderColor: C.ground,
  },

  periods: { flexDirection: "row", gap: 2 },
  period: { flex: 1, height: 32, borderRadius: 9, alignItems: "center", justifyContent: "center" },
  periodOn: { backgroundColor: C.raised },
  periodText: { fontFamily: FONT.sans700, fontSize: 12.5, color: C.ink4 },
});
