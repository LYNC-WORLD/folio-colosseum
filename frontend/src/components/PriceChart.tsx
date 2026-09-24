import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
} from "react-native";
import Svg, {
  Circle,
  Defs,
  Line,
  LinearGradient,
  Path,
  Stop,
} from "react-native-svg";
import { C, RADIUS, FONT } from "../theme";
import {
  CHART_PERIODS,
  useStockChart,
  type Candle,
  type ChartPeriod,
} from "../hooks";

const CHART_HEIGHT = 220;
const PAD_TOP = 76; // room for the tooltip
const PAD_BOTTOM = 16;

export type ChartChange = {
  period: ChartPeriod;
  changeAbs: number;
  changePct: number;
};

type Props = {
  mint: string;
  initialPeriod?: ChartPeriod;
  /** Fires when data for a period loads — use it to drive the +/- row above the chart */
  onChange?: (change: ChartChange) => void;
  /** Fires while the user drags (candle) and on release (null) */
  onScrub?: (candle: Candle | null) => void;
};

function formatPrice(n: number) {
  return n.toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatDate(unixSec: number, period: ChartPeriod) {
  const d = new Date(unixSec * 1000);
  if (period === "1D" || period === "1W") {
    return d.toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  }
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function PriceChart({
  mint,
  initialPeriod = "1Y",
  onChange,
  onScrub,
}: Props) {
  const [period, setPeriod] = useState<ChartPeriod>(initialPeriod);
  const { candles, loading, error, reload } = useStockChart(mint, period);

  const [width, setWidth] = useState(0);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const onLayout = (e: LayoutChangeEvent) =>
    setWidth(e.nativeEvent.layout.width);

  // ---- geometry ----
  const geo = useMemo(() => {
    if (!candles || candles.length < 2 || width === 0) return null;

    const closes = candles.map((c) => c.close);
    const min = Math.min(...closes);
    const max = Math.max(...closes);
    const range = max - min || 1;
    const drawH = CHART_HEIGHT - PAD_TOP - PAD_BOTTOM;
    const stepX = width / (candles.length - 1);

    const points = closes.map((v, i) => ({
      x: i * stepX,
      y: PAD_TOP + (1 - (v - min) / range) * drawH,
    }));

    const line = points
      .map(
        (p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(2)},${p.y.toFixed(2)}`,
      )
      .join(" ");
    const area = `${line} L${width},${CHART_HEIGHT} L0,${CHART_HEIGHT} Z`;

    return { points, line, area, stepX };
  }, [candles, width]);

  // ---- period change (first open → last close) ----
  const change = useMemo(() => {
    if (!candles || candles.length === 0) return null;
    const first = candles[0].open;
    const last = candles[candles.length - 1].close;
    const changeAbs = last - first;
    const changePct = first ? (changeAbs / first) * 100 : 0;
    return { period, changeAbs, changePct: Number(changePct.toFixed(2)) };
  }, [candles, period]);

  useEffect(() => {
    if (change) onChange?.(change);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [change]);

  const positive = (change?.changeAbs ?? 0) >= 0;
  const stroke = positive ? C.jade : C.clay;

  // ---- scrubbing ----
  const geoRef = useRef(geo);
  geoRef.current = geo;
  const candlesRef = useRef(candles);
  candlesRef.current = candles;
  const onScrubRef = useRef(onScrub);
  onScrubRef.current = onScrub;

  const pan = useMemo(() => {
    const pick = (x: number) => {
      const g = geoRef.current;
      const cs = candlesRef.current;
      if (!g || !cs) return;
      const i = Math.max(0, Math.min(cs.length - 1, Math.round(x / g.stepX)));
      setActiveIndex(i);
      onScrubRef.current?.(cs[i]);
    };
    const end = () => {
      setActiveIndex(null);
      onScrubRef.current?.(null);
    };
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => false, // keep the gesture from the ScrollView
      onPanResponderGrant: (e) => pick(e.nativeEvent.locationX),
      onPanResponderMove: (e) => pick(e.nativeEvent.locationX),
      onPanResponderRelease: end,
      onPanResponderTerminate: end,
    });
  }, []);

  // Reset scrub when switching tabs
  useEffect(() => setActiveIndex(null), [period]);

  // Tooltip shows the scrubbed point, or the latest candle by default
  const shownIndex =
    activeIndex ?? (candles && candles.length ? candles.length - 1 : null);
  const shownCandle =
    shownIndex != null && candles ? candles[shownIndex] : null;
  const activePoint =
    activeIndex != null && geo ? geo.points[activeIndex] : null;

  // Keep tooltip inside the box while it follows the finger
  const TOOLTIP_W = 150;
  const tooltipLeft = activePoint
    ? Math.max(
        8,
        Math.min(width - TOOLTIP_W - 8, activePoint.x - TOOLTIP_W / 2),
      )
    : undefined;

  const firstLoad = loading && !candles;

  return (
    <View>
      <View style={s.chartBox} onLayout={onLayout}>
        {firstLoad ? (
          <ActivityIndicator color={C.inkMuted} />
        ) : error && !candles ? (
          <Pressable onPress={reload} style={s.centerMsg}>
            <Text style={s.errorText}>Couldn't load the chart</Text>
            <Text style={s.retryText}>Tap to retry</Text>
          </Pressable>
        ) : !geo ? (
          <Text style={s.emptyText}>Not enough price history yet</Text>
        ) : (
          <>
            <View style={StyleSheet.absoluteFill} {...pan.panHandlers}>
              <Svg width={width} height={CHART_HEIGHT}>
                <Defs>
                  <LinearGradient id="fill" x1="0" y1="0" x2="0" y2="1">
                    <Stop offset="0" stopColor={stroke} stopOpacity={0.22} />
                    <Stop offset="1" stopColor={stroke} stopOpacity={0} />
                  </LinearGradient>
                </Defs>

                <Path d={geo.area} fill="url(#fill)" />
                <Path
                  d={geo.line}
                  stroke={stroke}
                  strokeWidth={2}
                  fill="none"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />

                {activePoint && (
                  <>
                    <Line
                      x1={activePoint.x}
                      x2={activePoint.x}
                      y1={PAD_TOP - 8}
                      y2={CHART_HEIGHT}
                      stroke={C.hairline}
                      strokeWidth={1}
                    />
                    <Circle
                      cx={activePoint.x}
                      cy={activePoint.y}
                      r={5}
                      fill={stroke}
                      stroke={C.card}
                      strokeWidth={2}
                    />
                  </>
                )}
              </Svg>
            </View>

            {shownCandle && (
              <View
                pointerEvents="none"
                style={[
                  s.chartTooltip,
                  tooltipLeft != null
                    ? { left: tooltipLeft, width: TOOLTIP_W }
                    : { alignSelf: "center" },
                ]}
              >
                <Text style={s.chartTooltipDate}>
                  {formatDate(shownCandle.time, period)}
                </Text>
                <Text style={s.chartTooltipPrice}>
                  {formatPrice(shownCandle.close)}
                </Text>
              </View>
            )}

            {/* Switching periods: keep the old line visible, show a small spinner */}
            {loading && (
              <ActivityIndicator
                size="small"
                color={C.inkMuted}
                style={s.refreshSpinner}
              />
            )}
          </>
        )}
      </View>

      <View style={s.periodTabs}>
        {CHART_PERIODS.map((p) => (
          <Pressable
            key={p}
            onPress={() => setPeriod(p)}
            style={[s.periodPill, period === p && s.periodPillActive]}
          >
            <Text style={[s.periodText, period === p && s.periodTextActive]}>
              {p}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  chartBox: {
    height: CHART_HEIGHT,
    marginTop: 18,
    borderRadius: RADIUS.md,
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.hairline,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  centerMsg: { alignItems: "center", gap: 6 },
  errorText: { color: C.clay, fontSize: 13, fontFamily: FONT.display400 },
  retryText: { color: C.bone, fontSize: 13, fontFamily: FONT.display600 },
  emptyText: { color: C.inkMuted, fontSize: 13, fontFamily: FONT.display400 },

  chartTooltip: {
    position: "absolute",
    top: 14,
    alignItems: "center",
    backgroundColor: C.raised,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: "#453D37",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  chartTooltipDate: {
    color: C.inkMuted,
    fontSize: 11,
    fontFamily: FONT.display400,
  },
  chartTooltipPrice: {
    color: C.bone,
    fontSize: 14,
    marginTop: 2,
    fontFamily: FONT.mono500,
  },
  refreshSpinner: { position: "absolute", top: 14, right: 14 },

  periodTabs: { flexDirection: "row", gap: 8, marginTop: 14 },
  periodPill: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: RADIUS.sm,
    alignItems: "center",
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "transparent",
  },
  periodPillActive: { backgroundColor: C.raised, borderColor: "#453D37" },
  periodText: { color: C.inkMuted, fontSize: 12, fontFamily: FONT.display500 },
  periodTextActive: { color: C.bone },
});
