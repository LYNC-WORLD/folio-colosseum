// src/components/folio/ShareSheet.tsx — "Share your profile" (prototype openShare)
//
//   Portfolio | Top holdings | Perps
//   ┌ card ─────────────────────────────┐
//   │ (S) @shanu            #2,418      │
//   │     THE BUILDER      GLOBAL RANK  │
//   │ $0.00                             │
//   │ +$0.00 · +0.00% 7d                │
//   │ ···· chart (replays) ····  $hi/$lo│
//   │ 25 Sept     28 Sept       2 Oct   │
//   │ [Folio]        10% off … SHANU    │
//   └───────────────────────────────────┘
//   ▶ Replay portfolio
//   ( 24h 7d 30d All )  ( $ % )  ( 👁 Ref code )
//   [ Share ] [ Copy link ] [ Copy image ]
//
// Copy image needs:  npx expo install react-native-view-shot
import { useEffect, useMemo, useRef, useState } from "react";
import {
  LayoutChangeEvent,
  Pressable,
  Share,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import * as Clipboard from "expo-clipboard";
import { captureRef } from "react-native-view-shot";
import Svg, {
  Circle,
  Defs,
  LinearGradient as SvgGradient,
  Path,
  Rect,
  Stop,
} from "react-native-svg";
import { ChartPeriod } from "../hooks";
import { money, money0 } from "../lib/format";
import { usePortfolioSeries } from "../hooks/usePortfolioSeries";
import { C, em, FONT } from "../theme";
import { hSelect, hTap } from "../lib/haptics";
import { AssetAvatar } from "./AssetAvatar";

type Tab = "port" | "hold" | "perp";
const TABS: [Tab, string][] = [
  ["port", "Portfolio"],
  ["hold", "Top holdings"],
  ["perp", "Perps"],
];
const RNG: { key: string; period: ChartPeriod; days: number }[] = [
  { key: "24h", period: "1D", days: 1 },
  { key: "7d", period: "1W", days: 7 },
  { key: "30d", period: "1M", days: 30 },
  { key: "All", period: "All", days: 180 },
];

export type ShareHolding = {
  symbol: string;
  imageUrl?: string | null;
  value: number;
  change: number | null;
};

type Props = {
  handle: string; // "@shanu"
  initial: string; // "S"
  chip: string; // investor profile title
  rank?: number;
  refCode: string; // "SHANU"
  holdings: { mint: string; balance: number; price: number }[]; // for the chart
  usdcValue: number;
  positions: ShareHolding[]; // for Top holdings
  perp: { positions: any[]; pnl: number };
};

const H = 130; // chart height
const sMoney = (n: number) => `${n >= 0 ? "+" : "−"}${money(Math.abs(n))}`;
const sPct = (n: number) => `${n >= 0 ? "+" : "−"}${Math.abs(n).toFixed(2)}%`;
const fmtDate = (d: Date, hourly: boolean) =>
  hourly
    ? d.toLocaleTimeString("en-GB", { hour: "numeric", minute: "2-digit" })
    : d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });

export function ShareSheet({
  handle,
  initial,
  chip,
  rank = 2418,
  refCode,
  holdings,
  usdcValue,
  positions,
  perp,
}: Props) {
  const [tab, setTab] = useState<Tab>("port");
  const [rng, setRng] = useState(RNG[1]); // 7d like the prototype
  const [pct, setPct] = useState(false);
  const [showRef, setShowRef] = useState(true);
  const [cw, setCw] = useState(0); // chart width (px)
  const [k, setK] = useState(1); // replay progress 0..1
  const [done, setDone] = useState<"share" | "link" | "image" | null>(null);
  const [note, setNote] = useState("");

  const cardRef = useRef<View>(null);
  const raf = useRef<number | null>(null);
  const flash = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { points } = usePortfolioSeries(holdings, usdcValue, rng.period);
  const series = useMemo(() => {
    const v = points.map((p) => p.v);
    return v.length >= 2 ? v : [v[0] ?? 0, v[0] ?? 0];
  }, [points]);

  // ---- series maths (prototype shBody) ----
  const first = series[0];
  const last = series[series.length - 1];
  const d = last - first;
  const pc = (d / (first || 1)) * 100;
  const up = d >= 0;
  const col = up ? C.mint : C.loss;
  const lo = Math.min(...series);
  const hi = Math.max(...series);
  const pad = (hi - lo) * 0.15 || 1;
  const pts = useMemo(
    () =>
      series.map((v, i) => [
        (i / (series.length - 1)) * cw,
        8 + (1 - (v - lo + pad) / (hi - lo + pad * 2)) * (H - 16),
      ]),
    [series, cw, lo, hi, pad],
  );

  const dates = useMemo(() => {
    const now = Date.now();
    const f = (ms: number) => fmtDate(new Date(ms), rng.key === "24h");
    return [f(now - rng.days * 864e5), f(now - rng.days * 432e5), f(now)];
  }, [rng]);

  // ---- replay animation ----
  const replay = (dur: number) => {
    if (raf.current) cancelAnimationFrame(raf.current);
    const t0 = Date.now();
    setK(0);
    const step = () => {
      const x = Math.min(1, (Date.now() - t0) / dur);
      setK(x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2);
      if (x < 1) raf.current = requestAnimationFrame(step);
    };
    step();
  };
  useEffect(() => {
    if (tab === "port" && cw) replay(1400);
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
    };
  }, [tab, rng, cw, points.length]);
  useEffect(
    () => () => {
      if (flash.current) clearTimeout(flash.current);
    },
    [],
  );

  const N = pts.length;
  const f = Math.max(0, Math.min(1, k)) * (N - 1);
  const n = Math.floor(f);
  const t = f - n;
  const shown = pts.slice(0, n + 1);
  if (n < N - 1) {
    const a = pts[n],
      c = pts[n + 1];
    shown.push([a[0] + (c[0] - a[0]) * t, a[1] + (c[1] - a[1]) * t]);
  }
  const line = shown
    .map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)} ${p[1].toFixed(1)}`)
    .join("");
  const end = shown[shown.length - 1] ?? [0, H / 2];
  const area = `${line}L${end[0].toFixed(1)} ${H}L0 ${H}Z`;
  const liveVal = series[Math.min(N - 1, Math.round(f))] ?? last;

  // ---- holdings tab ----
  const topRows = useMemo(
    () => [...positions].sort((a, b) => b.value - a.value).slice(0, 4),
    [positions],
  );
  const invested = positions.reduce((s, p) => s + p.value, 0);

  // ---- perps tab ----
  const roeOf = (p: any): number =>
    Number(p.roe ?? p.pnlPct ?? p.returnPct ?? 0) || 0;
  const bestRoe = perp.positions.length
    ? Math.max(...perp.positions.map(roeOf))
    : 0;

  // ---- actions ----
  const link = `tryfolio.money/${handle}${showRef ? `?ref=${refCode}` : ""}`;
  const mark = (w: "share" | "link" | "image", msg = "") => {
    setDone(w);
    setNote(msg);
    if (flash.current) clearTimeout(flash.current);
    flash.current = setTimeout(() => {
      setDone(null);
      setNote("");
    }, 1800);
  };
  const doShare = async () => {
    hTap();
    try {
      await Share.share({ message: `See my Folio https://${link}` });
    } catch {
      await Clipboard.setStringAsync(link);
      mark("share", "Link copied · paste it anywhere");
    }
  };
  const doLink = async () => {
    hTap();
    await Clipboard.setStringAsync(link);
    mark("link", "Profile link copied");
  };
  const doImage = async () => {
    hTap();
    try {
      const b64 = await captureRef(cardRef, {
        format: "png",
        quality: 1,
        result: "base64",
      });
      await Clipboard.setImageAsync(b64);
      mark("image", "Card copied as an image · paste it into any chat");
    } catch {
      setNote("Copying images is not available here. Copy the link instead?");
    }
  };

  return (
    <View style={{ gap: 14 }}>
      {/* tabs */}
      <View style={s.tabs} accessibilityRole="tablist">
        {TABS.map(([key, label]) => (
          <Pressable
            key={key}
            onPress={() => {
              if (key === tab) return;
              hSelect();
              setTab(key);
            }}
            style={s.tab}
            accessibilityRole="tab"
            accessibilityState={{ selected: tab === key }}
          >
            <Text style={[s.tabTxt, tab === key && { color: C.ink1 }]}>
              {label}
            </Text>
            <View style={[s.tabLine, tab === key && { opacity: 1 }]} />
          </Pressable>
        ))}
      </View>

      {/* card */}
      <View ref={cardRef} collapsable={false} style={s.card}>
        <LinearGradient
          colors={["rgba(55,224,153,.16)", "rgba(55,224,153,0)"]}
          start={{ x: 1, y: 0 }}
          end={{ x: 0.3, y: 0.55 }}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />
        <View style={s.cardIn}>
          <View style={s.top}>
            <View style={s.av}>
              <Text style={s.avTxt}>{initial}</Text>
            </View>
            <View style={{ flex: 1, gap: 5, minWidth: 0 }}>
              <Text style={s.hdl} numberOfLines={1}>
                {handle}
              </Text>
              {chip ? (
                <View style={s.chip}>
                  <Text style={s.chipTxt}>{chip.toUpperCase()}</Text>
                </View>
              ) : null}
            </View>
            <View style={{ alignItems: "flex-end", gap: 3 }}>
              <Text style={s.rank}>
                <Text style={{ color: C.mint }}>#</Text>
                {rank.toLocaleString("en-US")}
              </Text>
              <Text style={s.k}>GLOBAL RANK</Text>
            </View>
          </View>

          <View style={{ gap: 12, minHeight: 226 }}>
            {tab === "port" ? (
              <>
                <View style={{ gap: 4 }}>
                  <Text style={s.val}>
                    {pct ? sPct(pc) : money(k >= 1 ? last : liveVal)}
                  </Text>
                  <Text style={[s.sub, { color: col }]}>
                    {pct ? `past ${rng.key}` : `${sMoney(d)} · ${sPct(pc)} `}
                    {pct ? null : (
                      <Text style={{ color: C.ink4 }}>{rng.key}</Text>
                    )}
                  </Text>
                </View>
                <View
                  style={{ height: H }}
                  onLayout={(e: LayoutChangeEvent) =>
                    setCw(Math.round(e.nativeEvent.layout.width))
                  }
                >
                  {cw > 0 ? (
                    <Svg width={cw} height={H}>
                      <Defs>
                        <SvgGradient id="shG" x1="0" y1="0" x2="0" y2="1">
                          <Stop offset="0" stopColor={col} stopOpacity={0.32} />
                          <Stop offset="1" stopColor={col} stopOpacity={0} />
                        </SvgGradient>
                      </Defs>
                      <Path d={area} fill="url(#shG)" />
                      <Path
                        d={line}
                        fill="none"
                        stroke={col}
                        strokeWidth={2.4}
                        strokeLinejoin="round"
                        strokeLinecap="round"
                      />
                      <Circle
                        cx={end[0]}
                        cy={end[1]}
                        r={9}
                        fill={col}
                        opacity={0.2}
                      />
                      <Circle cx={end[0]} cy={end[1]} r={5} fill={col} />
                    </Svg>
                  ) : null}
                  {pct ? null : (
                    <>
                      <Text style={[s.yLbl, { top: 0 }]}>{money0(hi)}</Text>
                      <Text style={[s.yLbl, { bottom: 0 }]}>{money0(lo)}</Text>
                    </>
                  )}
                </View>
                <View style={s.xRow}>
                  {dates.map((x, i) => (
                    <Text key={i} style={s.xTxt}>
                      {x}
                    </Text>
                  ))}
                </View>
              </>
            ) : tab === "hold" ? (
              topRows.length ? (
                <>
                  <Text style={s.k}>TOP HOLDINGS</Text>
                  {topRows.map((h) => {
                    const w = invested ? (h.value / invested) * 100 : 0;
                    return (
                      <View key={h.symbol} style={s.row}>
                        <AssetAvatar
                          symbol={h.symbol}
                          imageUrl={h.imageUrl}
                          size={34}
                          radius={999}
                        />
                        <View style={{ flex: 1, gap: 6, minWidth: 0 }}>
                          <Text style={s.rowTtl}>{h.symbol}</Text>
                          <View style={s.bar}>
                            <View
                              style={[s.barIn, { width: `${Math.max(2, w)}%` }]}
                            />
                          </View>
                        </View>
                        <View style={{ alignItems: "flex-end", gap: 3 }}>
                          <Text style={s.rowVal}>
                            {pct ? `${w.toFixed(0)}%` : money0(h.value)}
                          </Text>
                          {h.change != null ? (
                            <Text
                              style={[
                                s.rowChg,
                                { color: h.change >= 0 ? C.mint : C.loss },
                              ]}
                            >
                              {sPct(h.change)}
                            </Text>
                          ) : null}
                        </View>
                      </View>
                    );
                  })}
                </>
              ) : (
                <Text style={s.empty}>Nothing held yet.</Text>
              )
            ) : perp.positions.length ? (
              <>
                <View style={{ gap: 4 }}>
                  <Text style={s.k}>OPEN PERPS</Text>
                  <Text
                    style={[
                      s.val,
                      {
                        color:
                          (pct ? bestRoe : perp.pnl) >= 0 ? C.mint : C.loss,
                      },
                    ]}
                  >
                    {pct ? sPct(bestRoe) : sMoney(perp.pnl)}
                  </Text>
                  <Text style={[s.sub, { color: C.ink3 }]}>
                    {pct
                      ? "best trade, return on margin"
                      : `${perp.positions.length} ${perp.positions.length === 1 ? "position" : "positions"} · unrealized`}
                  </Text>
                </View>
                {perp.positions.slice(0, 3).map((p, i) => {
                  const r = roeOf(p);
                  return (
                    <View key={p.symbol ?? i} style={s.row}>
                      <AssetAvatar
                        symbol={String(p.symbol ?? "?")}
                        size={34}
                        radius={999}
                      />
                      <View style={{ flex: 1, gap: 4 }}>
                        <Text style={s.rowTtl}>{p.symbol}</Text>
                        <Text style={s.side}>
                          {String(p.side ?? "").toUpperCase()}
                          {p.leverage ? ` ${p.leverage}x` : ""}
                        </Text>
                      </View>
                      <Text
                        style={[s.rowVal, { color: r >= 0 ? C.mint : C.loss }]}
                      >
                        {sPct(r)}
                      </Text>
                    </View>
                  );
                })}
              </>
            ) : (
              <Text style={s.empty}>No open perps right now.</Text>
            )}
          </View>
        </View>

        {/* footer */}
        <View style={s.foot}>
          <Svg width={17} height={24} viewBox="0 0 17 24" fill="none">
            <Rect
              x="0"
              y="0"
              width="17"
              height="7"
              rx="2"
              fill={C.onMint}
              opacity={0.85}
            />
            <Rect
              x="0"
              y="9"
              width="12"
              height="6"
              rx="2"
              fill={C.onMint}
              opacity={0.6}
            />
            <Rect
              x="0"
              y="17"
              width="7"
              height="7"
              rx="2"
              fill={C.onMint}
              opacity={0.4}
            />
          </Svg>
          <Text style={s.brand}>Folio</Text>
          <View style={{ flex: 1 }} />
          <View
            style={{ alignItems: "flex-end", gap: 2, opacity: showRef ? 1 : 0 }}
          >
            <Text style={s.refSub}>10% off fees with code</Text>
            <Text style={s.refCode}>{refCode}</Text>
          </View>
        </View>
      </View>

      {tab === "port" ? (
        <Pressable
          onPress={() => {
            hTap();
            replay(2600);
          }}
          style={s.replay}
          accessibilityRole="button"
        >
          <Svg width={14} height={14} viewBox="0 0 16 16" fill={C.mint}>
            <Path d="M4 2.5v11l9-5.5z" />
          </Svg>
          <Text style={s.replayTxt}>Replay portfolio</Text>
        </Pressable>
      ) : null}

      {/* controls */}
      <View style={s.ctl}>
        <View
          style={[s.seg, tab !== "port" && { opacity: 0.35 }]}
          pointerEvents={tab === "port" ? "auto" : "none"}
        >
          {RNG.map((r) => (
            <Pressable
              key={r.key}
              onPress={() => {
                if (r.key === rng.key) return;
                hSelect();
                setRng(r);
              }}
              style={[s.segBtn, r.key === rng.key && s.segOn]}
            >
              <Text style={[s.segTxt, r.key === rng.key && { color: C.ink1 }]}>
                {r.key}
              </Text>
            </Pressable>
          ))}
        </View>
        <View style={s.seg}>
          {(["usd", "pct"] as const).map((m) => {
            const on = (m === "pct") === pct;
            return (
              <Pressable
                key={m}
                onPress={() => {
                  hSelect();
                  setPct(m === "pct");
                }}
                style={[s.segBtn, on && s.segOn]}
                accessibilityLabel={
                  m === "pct" ? "Show percent only" : "Show amounts"
                }
              >
                <Text style={[s.segTxt, on && { color: C.ink1 }]}>
                  {m === "pct" ? "%" : "$"}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <Pressable
          onPress={() => {
            hSelect();
            setShowRef((v) => !v);
          }}
          style={[s.seg, s.refBtn]}
          accessibilityRole="button"
          accessibilityState={{ selected: showRef }}
        >
          <Svg
            width={15}
            height={15}
            viewBox="0 0 20 20"
            fill="none"
            stroke={showRef ? C.mint : C.ink3}
            strokeWidth={1.8}
            strokeLinecap="round"
          >
            <Path d="M2 10s3-5.5 8-5.5S18 10 18 10s-3 5.5-8 5.5S2 10 2 10z" />
            <Circle cx="10" cy="10" r="2.4" />
          </Svg>
          <Text style={[s.segTxt, { color: showRef ? C.mint : C.ink3 }]}>
            Ref code
          </Text>
        </Pressable>
      </View>

      {/* actions */}
      <View style={s.acts}>
        <Act label={done === "share" ? "Copied" : "Share"} onPress={doShare}>
          <Path d="M10 12.5V3M6.5 6.5 10 3l3.5 3.5" />
          <Path d="M5 10H4.5A1.5 1.5 0 0 0 3 11.5v4A1.5 1.5 0 0 0 4.5 17h11a1.5 1.5 0 0 0 1.5-1.5v-4A1.5 1.5 0 0 0 15.5 10H15" />
        </Act>
        <Act label={done === "link" ? "Copied" : "Copy link"} onPress={doLink}>
          <Path d="M8.5 11.5a3.5 3.5 0 0 0 5 0l2.5-2.5a3.5 3.5 0 0 0-5-5l-1 1" />
          <Path d="M11.5 8.5a3.5 3.5 0 0 0-5 0L4 11a3.5 3.5 0 0 0 5 5l1-1" />
        </Act>
        <Act
          label={done === "image" ? "Copied" : "Copy image"}
          onPress={doImage}
        >
          <Rect x="7" y="7" width="10" height="10" rx="2" />
          <Path d="M13 5V4.5A1.5 1.5 0 0 0 11.5 3h-7A1.5 1.5 0 0 0 3 4.5v7A1.5 1.5 0 0 0 4.5 13H5" />
        </Act>
      </View>
      {note ? <Text style={s.note}>{note}</Text> : null}
    </View>
  );
}

function Act({
  label,
  onPress,
  children,
}: {
  label: string;
  onPress: () => void;
  children: React.ReactNode;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={s.act}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <View style={s.actIco}>
        <Svg
          width={19}
          height={19}
          viewBox="0 0 20 20"
          fill="none"
          stroke={C.ink1}
          strokeWidth={1.8}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {children}
        </Svg>
      </View>
      <Text style={s.actTxt}>{label}</Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  tabs: { flexDirection: "row", justifyContent: "center", gap: 28 },
  tab: { alignItems: "center", gap: 7, paddingTop: 2 },
  tabTxt: { fontFamily: FONT.sans700, fontSize: 17, color: C.ink4 },
  tabLine: {
    height: 3,
    width: "70%",
    borderRadius: 3,
    backgroundColor: C.mint,
    opacity: 0,
  },

  card: {
    borderRadius: 28,
    borderWidth: 1.5,
    borderColor: C.mint,
    backgroundColor: "#11151B",
    overflow: "hidden",
  },
  cardIn: { padding: 18, gap: 14 },
  top: { flexDirection: "row", alignItems: "center", gap: 10 },
  av: {
    width: 38,
    height: 38,
    borderRadius: 999,
    backgroundColor: C.mint,
    alignItems: "center",
    justifyContent: "center",
  },
  avTxt: { fontFamily: FONT.sans800, fontSize: 16, color: C.onMint },
  hdl: {
    fontFamily: FONT.sans800,
    fontSize: 16,
    letterSpacing: em(16, -0.02),
    color: C.ink1,
  },
  chip: {
    alignSelf: "flex-start",
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: "rgba(55,224,153,.12)",
  },
  chipTxt: {
    fontFamily: FONT.mono400,
    fontSize: 9.5,
    letterSpacing: em(9.5, 0.16),
    color: C.mint,
  },
  rank: {
    fontFamily: FONT.sans800,
    fontSize: 21,
    letterSpacing: em(21, -0.03),
    color: C.ink1,
  },
  k: {
    fontFamily: FONT.mono400,
    fontSize: 9,
    letterSpacing: em(9, 0.16),
    color: C.ink4,
  },

  val: {
    fontFamily: FONT.sans800,
    fontSize: 38,
    letterSpacing: em(38, -0.045),
    color: C.ink1,
    fontVariant: ["tabular-nums"],
  },
  sub: { fontFamily: FONT.mono400, fontSize: 12.5 },
  yLbl: {
    position: "absolute",
    right: 0,
    fontFamily: FONT.mono400,
    fontSize: 10.5,
    color: C.ink4,
  },
  xRow: { flexDirection: "row", justifyContent: "space-between" },
  xTxt: { fontFamily: FONT.mono400, fontSize: 10.5, color: C.ink4 },

  row: { flexDirection: "row", alignItems: "center", gap: 10 },
  rowTtl: { fontFamily: FONT.sans700, fontSize: 14, color: C.ink1 },
  rowVal: { fontFamily: FONT.mono400, fontSize: 12.5, color: C.ink1 },
  rowChg: { fontFamily: FONT.mono400, fontSize: 11 },
  bar: {
    height: 4,
    borderRadius: 4,
    backgroundColor: "#242A33",
    overflow: "hidden",
  },
  barIn: { height: 4, borderRadius: 4, backgroundColor: C.mint },
  side: {
    fontFamily: FONT.mono400,
    fontSize: 10,
    letterSpacing: em(10, 0.1),
    color: C.ink3,
  },
  empty: {
    fontFamily: FONT.sans400,
    fontSize: 13,
    color: C.ink3,
    textAlign: "center",
    paddingVertical: 30,
  },

  foot: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 18,
    paddingVertical: 18,
    backgroundColor: C.mint,
  },
  brand: {
    fontFamily: FONT.sans800,
    fontSize: 22,
    letterSpacing: em(22, -0.04),
    color: C.onMint,
  },
  refSub: {
    fontFamily: FONT.sans400,
    fontSize: 10.5,
    color: C.onMint,
    opacity: 0.75,
  },
  refCode: {
    fontFamily: FONT.sans800,
    fontSize: 14,
    letterSpacing: em(14, 0.02),
    color: C.onMint,
  },

  replay: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    minHeight: 44,
    paddingHorizontal: 10,
  },
  replayTxt: {
    fontFamily: FONT.sans700,
    fontSize: 18,
    letterSpacing: em(18, -0.02),
    color: C.ink2,
  },

  ctl: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flexWrap: "wrap",
  },
  seg: {
    flexDirection: "row",
    alignItems: "center",
    padding: 4,
    borderRadius: 999,
    backgroundColor: "#171B22",
  },
  segBtn: {
    height: 36,
    minWidth: 40,
    paddingHorizontal: 12,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  segOn: { backgroundColor: "#2B313B" },
  segTxt: { fontFamily: FONT.sans700, fontSize: 15, color: C.ink4 },
  refBtn: { height: 44, paddingHorizontal: 16, gap: 8 },

  acts: { flexDirection: "row", justifyContent: "space-around", marginTop: 4 },
  act: { alignItems: "center", gap: 8, minWidth: 88 },
  actIco: {
    width: 52,
    height: 52,
    borderRadius: 999,
    backgroundColor: "#2A303A",
    alignItems: "center",
    justifyContent: "center",
  },
  actTxt: { fontFamily: FONT.sans600, fontSize: 13, color: C.ink2 },
  note: {
    fontFamily: FONT.sans600,
    fontSize: 12.5,
    color: C.ink3,
    textAlign: "center",
  },
});
