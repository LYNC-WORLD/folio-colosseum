import { useEffect, useMemo, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
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
import Svg, {
  Circle,
  Defs,
  LinearGradient,
  Path,
  Pattern,
  Rect,
  Stop,
} from "react-native-svg";
import { C } from "../../theme";
import { timing } from "../../theme/motion";
import { hSelect } from "../../lib/haptics";
import type { SeriesPoint } from "../../hooks/usePortfolioSeries";

const AnimatedPath = Animated.createAnimatedComponent(Path);
const H = 200;
const TOP = 22;
const BOT = 18;

/** Catmull-Rom → cubic Bézier, same as the prototype's smoothPath */
function smoothPath(pts: [number, number][]) {
  let d = `M${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] || p2;
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C${c1[0].toFixed(1)},${c1[1].toFixed(1)} ${c2[0].toFixed(1)},${c2[1].toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`;
  }
  return d;
}

type Props = {
  points: SeriesPoint[];
  onScrub: (index: number | null) => void;
  replayKey: string;
};

export function PortfolioChart({ points, onScrub, replayKey }: Props) {
  const [width, setWidth] = useState(0);
  const [active, setActive] = useState<number | null>(null);

  const geo = useMemo(() => {
    if (width === 0 || points.length < 2) return null;

    // Remove invalid points before calculating min/max or SVG coordinates.
    const validPoints = points.filter(
      (p) => Number.isFinite(p.t) && Number.isFinite(p.v),
    );

    if (validPoints.length < 2) return null;

    const vs = validPoints.map((p) => p.v);

    const lo = Math.min(...vs);
    const hi = Math.max(...vs);

    // Extra safety.
    if (!Number.isFinite(lo) || !Number.isFinite(hi)) {
      return null;
    }

    const valueRange = hi - lo;

    const pad =
      valueRange > 0 ? valueRange * 0.18 : Math.max(1, Math.abs(hi) * 0.02);

    const chartLo = lo - pad;
    const chartHi = hi + pad;
    const chartRange = chartHi - chartLo;

    if (!Number.isFinite(chartRange) || chartRange <= 0) {
      return null;
    }

    const W = Math.max(1, width - 14);
    const chartHeight = H - TOP - BOT;

    const y = (v: number) => {
      const normalized = (v - chartLo) / chartRange;

      if (!Number.isFinite(normalized)) {
        return H / 2;
      }

      return TOP + (1 - normalized) * chartHeight;
    };

    const pts = validPoints.map((p, i) => {
      const x =
        validPoints.length === 1 ? 0 : (i / (validPoints.length - 1)) * W;

      const yy = y(p.v);

      return [Number.isFinite(x) ? x : 0, Number.isFinite(yy) ? yy : H / 2] as [
        number,
        number,
      ];
    });

    if (pts.length < 2) return null;

    const line = smoothPath(pts);

    const last = pts[pts.length - 1];

    const area = `${line} ` + `L${last[0].toFixed(1)},${H} ` + `L0,${H} Z`;

    let len = 0;

    for (let i = 1; i < pts.length; i++) {
      const dx = pts[i][0] - pts[i - 1][0];
      const dy = pts[i][1] - pts[i - 1][1];

      len += Math.hypot(dx, dy);
    }

    len *= 1.05;

    // Never allow an invalid dash length.
    if (!Number.isFinite(len) || len <= 0) {
      len = 1;
    }

    return {
      pts,
      line,
      area,
      W,
      len,
    };
  }, [points, width]);

  // draw-in: dash the line by its own length, then slide the offset to 0
  const draw = useSharedValue(0);
  const fill = useSharedValue(0);
  const dot = useSharedValue(0);
  useEffect(() => {
    if (!geo) return;
    draw.value = 0;
    fill.value = 0;
    dot.value = 0;
    draw.value = withTiming(1, timing(1000));
    fill.value = withDelay(250, withTiming(1, timing(750)));
    dot.value = withDelay(950, withTiming(1, timing(220)));
  }, [replayKey, geo != null]);

  const len = geo?.len ?? 1;
  const lineProps = useAnimatedProps(() => ({
    strokeDashoffset: (1 - draw.value) * len,
  }));
  const areaProps = useAnimatedProps(() => ({ opacity: fill.value }));

  const reduced = useReducedMotion();
  const ping = useSharedValue(reduced ? 1 : 0); // 1 = ring fully faded out
  useEffect(() => {
    if (reduced) return; // Reduce Motion: keep the dot, drop the pulsing ring
    ping.value = withRepeat(
      withTiming(1, {
        duration: 1800,
        easing: Easing.bezier(0.22, 0.61, 0.36, 1),
      }),
      -1,
      false,
    );
  }, [reduced]);
  const scrubbing = active != null;
  const dotStyle = useAnimatedStyle(() => ({
    opacity: scrubbing ? 0 : dot.value,
  }));
  const pingStyle = useAnimatedStyle(() => ({
    opacity: 1 - ping.value,
    transform: [{ scale: 0.6 + 1.6 * ping.value }],
  }));

  // scrub
  const geoRef = useRef(geo);
  geoRef.current = geo;
  const onScrubRef = useRef(onScrub);
  onScrubRef.current = onScrub;
  const last = useRef<number | null>(null);
  const pick = (x: number) => {
    const g = geoRef.current;
    if (!g) return;
    const i = Math.max(
      0,
      Math.min(g.pts.length - 1, Math.round((x / g.W) * (g.pts.length - 1))),
    );
    if (i === last.current) return;
    last.current = i;
    setActive(i);
    onScrubRef.current(i);
  };
  const end = () => {
    last.current = null;
    setActive(null);
    onScrubRef.current(null);
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

  const endPt = geo ? geo.pts[geo.pts.length - 1] : null;
  const act = active != null && geo ? geo.pts[active] : null;

  return (
    <GestureDetector gesture={pan}>
      <View
        style={s.wrap}
        onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
        accessibilityLabel="Total value over time"
      >
        {width > 0 ? (
          <Svg width={width} height={H} style={StyleSheet.absoluteFill}>
            <Defs>
              {/* prototype: radial dots every 14px */}
              <Pattern
                id="dots"
                x="7"
                y="7"
                width="14"
                height="14"
                patternUnits="userSpaceOnUse"
              >
                <Circle cx="0" cy="0" r="1.1" fill="#1B2029" />
              </Pattern>
              <LinearGradient id="fg" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={C.mint} stopOpacity={0.22} />
                <Stop offset="1" stopColor={C.mint} stopOpacity={0} />
              </LinearGradient>
            </Defs>
            <Rect x="0" y="0" width={width} height={H} fill="url(#dots)" />
            {geo ? (
              <>
                <AnimatedPath
                  d={geo.area}
                  fill="url(#fg)"
                  animatedProps={areaProps}
                />
                <AnimatedPath
                  d={geo.line}
                  fill="none"
                  stroke={C.mint}
                  strokeWidth={2.6}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeDasharray={[geo.len, geo.len]}
                  animatedProps={lineProps}
                />
              </>
            ) : null}
          </Svg>
        ) : null}

        {endPt ? (
          <Animated.View
            pointerEvents="none"
            style={[
              s.endWrap,
              { left: endPt[0] - 7, top: endPt[1] - 7 },
              dotStyle,
            ]}
          >
            <Animated.View style={[s.ring, pingStyle]} />
            <View style={s.glow} />
            <View style={s.endDot} />
          </Animated.View>
        ) : null}

        {act ? (
          <>
            <View
              pointerEvents="none"
              style={[s.scrubLine, { left: act[0] }]}
            />
            <View
              pointerEvents="none"
              style={[s.scrubDot, { left: act[0] - 6, top: act[1] - 6 }]}
            />
          </>
        ) : null}
      </View>
    </GestureDetector>
  );
}

const s = StyleSheet.create({
  wrap: { height: H, marginHorizontal: -20 },
  endWrap: { position: "absolute", width: 14, height: 14 },
  endDot: {
    position: "absolute",
    width: 14,
    height: 14,
    borderRadius: 999,
    backgroundColor: C.mint,
  },
  glow: {
    position: "absolute",
    left: -4,
    top: -4,
    width: 22,
    height: 22,
    borderRadius: 999,
    backgroundColor: "rgba(55,224,153,0.18)",
  },
  ring: {
    position: "absolute",
    left: -4,
    top: -4,
    width: 22,
    height: 22,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: "rgba(55,224,153,0.45)",
  },
  scrubLine: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: "rgba(255,255,255,0.22)",
  },
  scrubDot: {
    position: "absolute",
    width: 12,
    height: 12,
    borderRadius: 999,
    backgroundColor: C.ink1,
    borderWidth: 3,
    borderColor: C.ground,
  },
});
