// src/screens/TradeScreen.tsx — prototype #s-trade (the perps terminal)
//
//   [logo] NVDA PERP ⌄            Spot ›
//   $184.20  +2.10%  24H
//   MARK · ORACLE · FUNDING/1H · NEXT FUNDING · 24H VOLUME · OPEN INTEREST   (scrolls)
//   ● US MARKET OPEN · TRACKS THE LIVE PRICE
//   chart stage (timeframes, type, indicators, full screen)
//   Positions · Orders · Order book · Contract
//   [ Long 10x ] [ Short 10x ]      ← docked above the tab bar

import { useEffect, useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { FadeInDown, FadeOutUp } from "react-native-reanimated";
import Svg, { Path } from "react-native-svg";
import {
  useNavigation,
  useRoute,
  useScrollToTop,
} from "@react-navigation/native";

import { TAB_BAR_HEIGHT, useTabBarSpace } from "../navigation/TabBar";
import { C, FONT } from "../theme";
import { hTap } from "../lib/haptics";
import {
  MarketPickerSheet,
  MarketStatusSheet,
  PositionSheet,
  UnlockSheet,
} from "../components/PerpSheets";
import { AMBER, Btn, Kv, ON_MINT, ON_SHORT, Tag } from "../components/PerpUi";
import { PERP_MARKETS, perpLabel } from "../data/perps";
import { sampleBook } from "../data/perpsChart";
import {
  MAXLEV,
  MMR,
  TAKER,
  cancelOrder,
  changeOf,
  fmtNum,
  fmtPx,
  fundLeft,
  liqOf,
  marketOf,
  mktOpen,
  pnlOf,
  qtyFmt,
  roeOf,
  sMoney,
  sPct,
  sideTxt,
  toast,
  usePerps,
} from "../data/perpsStore";
import { ChartStage } from "../components/Perpchart";
import { OrderTicketSheet } from "../components/Orderticketsheet";

type PTab = "pos" | "ord" | "book" | "info";
type SheetState =
  | null
  | { t: "market" }
  | { t: "status" }
  | { t: "unlock"; side: 1 | -1 }
  | { t: "ticket"; side: 1 | -1 }
  | { t: "position"; id: number };

const DEFAULT_LEV = 10;
const tone = (n: number) => (n >= 0 ? C.mint : C.loss);

export function TradeScreen() {
  const nav = useNavigation();
  const route = useRoute();
  const st = usePerps();
  const insets = useSafeAreaInsets();
  const bottom = useTabBarSpace();
  const scrollRef = useRef<ScrollView>(null);
  useScrollToTop(scrollRef);

  const paramSym = (route.params as { symbol?: string } | undefined)?.symbol;
  const [sym, setSym] = useState(paramSym ?? "NVDA");
  useEffect(() => {
    if (paramSym) setSym(paramSym);
  }, [paramSym]);

  const [tab, setTab] = useState<PTab>("pos");
  const [sheet, setSheet] = useState<SheetState>(null);
  const [locked, setLocked] = useState(false); // freezes scroll while the chart crosshair is held
  const [chartY, setChartY] = useState(0);
  const [, tick] = useState(0);
  useEffect(() => {
    const i = setInterval(() => tick((n) => n + 1), 1000);
    return () => clearInterval(i);
  }, []);

  const m = marketOf(sym),
    mk = st.marks[sym],
    ch = changeOf(sym),
    open = mktOpen(m);
  const label = perpLabel(m);

  // price flash on each tick
  const [flash, setFlash] = useState<null | "up" | "dn">(null);
  useEffect(() => {
    if (mk.mark === mk.prev) return;
    setFlash(mk.mark > mk.prev ? "up" : "dn");
    const t = setTimeout(() => setFlash(null), 600);
    return () => clearTimeout(t);
  }, [mk.mark]); // eslint-disable-line

  const openTicket = (side: 1 | -1) =>
    setSheet(st.perpOK ? { t: "ticket", side } : { t: "unlock", side });
  const toChart = () =>
    scrollRef.current?.scrollTo({
      y: Math.max(0, chartY - 60),
      animated: true,
    });
  const goSpot = () => {
    if (m.category === "stocks")
      (nav as any).navigate("Home", {
        screen: "StockDetail",
        params: { symbol: m.symbol, category: "us-stock" },
      });
    else
      toast(
        "No spot page yet",
        label.toUpperCase() + " IS PERP-ONLY IN THIS BUILD",
      );
  };

  const fr = m.funding;
  const stats: [string, string, "up" | "down" | null][] = [
    ["MARK", fmtPx(mk.mark), null],
    ["ORACLE", fmtPx(mk.mark * (1 - 0.00012)), null],
    [
      "FUNDING / 1H",
      `${fr >= 0 ? "+" : "−"}${Math.abs(fr).toFixed(4)}%`,
      fr >= 0 ? "up" : "down",
    ],
    ["NEXT FUNDING", fundLeft(), null],
    ["24H VOLUME", `$${m.vol24.toFixed(1)}M`, null],
    ["OPEN INTEREST", `$${m.oi.toFixed(1)}M`, null],
  ];

  const positions = st.perps
    .slice()
    .sort((a, b) => Number(b.sym === sym) - Number(a.sym === sym));

  return (
    <SafeAreaView style={s.safe} edges={["top"]}>
      <ScrollView
        ref={scrollRef}
        scrollEnabled={!locked}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: 18, paddingBottom: bottom + 84 }}
      >
        {/* header */}
        <View style={s.head}>
          <Pressable
            style={s.mktBtn}
            onPress={() => {
              hTap();
              setSheet({ t: "market" });
            }}
            accessibilityRole="button"
            accessibilityLabel="Change market"
          >
            <View style={s.logo}>
              <Text style={s.logoT}>
                {m.symbol.replace(/[^A-Z0-9]/g, "").slice(0, 3)}
              </Text>
            </View>
            <View style={{ gap: 3, flexShrink: 1 }}>
              <View style={s.rowC}>
                <Text style={s.sym}>{label}</Text>
                <Tag label="PERP" />
                <Svg
                  width={14}
                  height={14}
                  viewBox="0 0 16 16"
                  fill="none"
                  stroke={C.ink3}
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <Path d="m4 6 4 4 4-4" />
                </Svg>
              </View>
              <Text style={s.sub} numberOfLines={1}>
                {m.name} · up to {MAXLEV}x
              </Text>
            </View>
          </Pressable>
          <Pressable
            style={s.spot}
            hitSlop={{ top: 6, bottom: 6 }}
            onPress={() => {
              hTap();
              goSpot();
            }}
            accessibilityRole="button"
          >
            <Text style={s.spotT}>Spot ›</Text>
          </Pressable>
        </View>

        {/* price */}
        <View style={s.px}>
          <Text
            style={[
              s.big,
              flash && { color: flash === "up" ? C.mint : C.loss },
            ]}
          >
            {fmtPx(mk.mark)}
          </Text>
          <Text style={[s.chg, { color: tone(ch) }]}>{sPct(ch)}</Text>
          <Text style={s.h24}>24H</Text>
        </View>

        {/* stats strip */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.stats}
          style={{ marginTop: 14 }}
        >
          {stats.map(([k, v, t]) => (
            <View key={k} style={{ gap: 5 }}>
              <Text style={s.statK}>{k}</Text>
              <Text
                style={[
                  s.statV,
                  t === "up" && { color: C.mint },
                  t === "down" && { color: C.loss },
                ]}
              >
                {v}
              </Text>
            </View>
          ))}
        </ScrollView>

        {/* market status */}
        <Pressable
          style={s.status}
          hitSlop={{ top: 8, bottom: 8 }}
          onPress={() => {
            hTap();
            setSheet({ t: "status" });
          }}
          accessibilityRole="button"
        >
          <View
            style={[
              s.dot,
              {
                backgroundColor: open ? C.mint : AMBER,
                shadowColor: open ? C.mint : AMBER,
              },
            ]}
          />
          <Text style={s.statusT}>
            {m.category === "commodities"
              ? m.short.toUpperCase() + " MARKET"
              : "US MARKET"}{" "}
            {open
              ? "OPEN · TRACKS THE LIVE PRICE"
              : "CLOSED · PERP TRADES 24/7"}
          </Text>
        </Pressable>

        {/* chart */}
        <View
          onLayout={(e) => setChartY(e.nativeEvent.layout.y)}
          style={{ marginTop: 16 }}
        >
          <ChartStage sym={sym} onScrollLock={setLocked} />
        </View>

        {/* panel tabs */}
        <View style={s.tabs}>
          {(
            [
              ["pos", "Positions", st.perps.length],
              ["ord", "Orders", st.orders.length],
              ["book", "Order book"],
              ["info", "Contract"],
            ] as [PTab, string, number?][]
          ).map(([k, t, n]) => (
            <Pressable
              key={k}
              onPress={() => {
                hTap();
                setTab(k);
              }}
              style={s.tabB}
              accessibilityRole="tab"
              accessibilityState={{ selected: tab === k }}
            >
              <Text style={[s.tabT, tab === k && { color: C.ink1 }]}>
                {t}
                {n != null ? <Text style={s.tabN}> {n}</Text> : null}
              </Text>
              {tab === k ? <View style={s.tabLine} /> : null}
            </Pressable>
          ))}
        </View>

        <View style={s.panel}>
          {tab === "pos" ? (
            positions.length ? (
              positions.map((p) => {
                const pm = marketOf(p.sym),
                  mark = st.marks[p.sym].mark,
                  pnl = pnlOf(p, mark),
                  roe = roeOf(p, mark);
                return (
                  <Pressable
                    key={p.id}
                    style={s.pRow}
                    onPress={() => {
                      hTap();
                      setSheet({ t: "position", id: p.id });
                    }}
                    accessibilityRole="button"
                  >
                    <View style={s.logo}>
                      <Text style={s.logoT}>
                        {pm.symbol.replace(/[^A-Z0-9]/g, "").slice(0, 3)}
                      </Text>
                    </View>
                    <View style={{ flex: 1, gap: 5, minWidth: 0 }}>
                      <View style={[s.rowC, { gap: 8 }]}>
                        <Text style={s.ttl}>{perpLabel(pm)}</Text>
                        <Tag
                          label={`${sideTxt(p.side)} ${p.lev}x`}
                          tone={p.side > 0 ? "long" : "short"}
                        />
                      </View>
                      <Text style={s.entry} numberOfLines={1}>
                        {fmtPx(p.entry)} → {fmtPx(mark)}
                      </Text>
                    </View>
                    <View style={{ alignItems: "flex-end", gap: 4 }}>
                      <Text style={[s.pnl, { color: tone(pnl) }]}>
                        {sMoney(pnl)}
                      </Text>
                      <Text style={[s.roe, { color: tone(roe) }]}>
                        {sPct(roe)}
                      </Text>
                    </View>
                  </Pressable>
                );
              })
            ) : (
              <View style={s.empty}>
                <Text style={s.ttl}>No open positions</Text>
                <Text style={s.emptyT}>
                  Tap Long if you think {label} goes up, Short if you think it
                  goes down. You can start from $10.
                </Text>
              </View>
            )
          ) : null}

          {tab === "ord" ? (
            st.orders.length ? (
              st.orders.map((o) => {
                const om = marketOf(o.sym);
                return (
                  <View key={o.id} style={s.pRow}>
                    <View style={s.logo}>
                      <Text style={s.logoT}>
                        {om.symbol.replace(/[^A-Z0-9]/g, "").slice(0, 3)}
                      </Text>
                    </View>
                    <View style={{ flex: 1, gap: 5, minWidth: 0 }}>
                      <View style={[s.rowC, { gap: 8 }]}>
                        <Text style={s.ttl}>{perpLabel(om)}</Text>
                        <Tag
                          label={`${o.kind.toUpperCase()} ${sideTxt(o.side)} ${o.lev}x`}
                          tone={o.side > 0 ? "long" : "short"}
                        />
                      </View>
                      <Text style={s.entry} numberOfLines={1}>
                        at {fmtPx(o.px)} · {fmtPx(o.margin)} margin
                      </Text>
                    </View>
                    <Pressable
                      onPress={() => {
                        hTap();
                        cancelOrder(o.id);
                      }}
                      style={s.cancel}
                      accessibilityRole="button"
                    >
                      <Text style={s.cancelT}>Cancel</Text>
                    </Pressable>
                  </View>
                );
              })
            ) : (
              <View style={s.empty}>
                <Text style={s.ttl}>No open orders</Text>
                <Text style={s.emptyT}>
                  Choose Limit or Stop in the ticket to trade at a price you
                  set. Orders show on the chart.
                </Text>
              </View>
            )
          ) : null}

          {tab === "book" ? (
            <Book sym={sym} mark={mk.mark} label={label} />
          ) : null}

          {tab === "info" ? (
            <View>
              {(
                [
                  [
                    "UNDERLYING",
                    m.category === "index" ? m.name + " index" : m.name,
                  ],
                  ["VENUE", "QFX"],
                  ["MAX LEVERAGE", MAXLEV + "x"],
                  [
                    "FUNDING",
                    `Every hour · ${fr >= 0 ? "+" : "−"}${Math.abs(fr).toFixed(4)}%`,
                  ],
                  ["MAINTENANCE MARGIN", (MMR * 100).toFixed(2) + "%"],
                  ["FEES", (TAKER * 100).toFixed(2) + "% taker · 0.02% maker"],
                  ["MARGIN", "USDC · isolated per position"],
                  ["HOURS", "24/7"],
                ] as [string, string][]
              ).map(([k, v]) => (
                <Kv key={k} k={k} v={v} />
              ))}
              <View style={{ paddingVertical: 12, gap: 8 }}>
                <View style={s.rowC}>
                  <Text style={[s.statK, { flex: 1 }]}>LONG / SHORT</Text>
                  <Text style={[s.statV, { color: C.mint }]}>{m.longPct}%</Text>
                  <Text style={[s.statV, { color: C.ink4 }]}>/</Text>
                  <Text style={[s.statV, { color: C.loss }]}>
                    {100 - m.longPct}%
                  </Text>
                </View>
                <View style={s.ratio}>
                  <View
                    style={{ width: `${m.longPct}%`, backgroundColor: C.mint }}
                  />
                  <View style={{ flex: 1, backgroundColor: C.loss }} />
                </View>
              </View>
              <Text style={s.foot}>SAMPLE PARAMETERS UNTIL QFX CONFIRMS</Text>
            </View>
          ) : null}
        </View>
      </ScrollView>

      {/* long / short dock */}
      <LinearGradient
        pointerEvents="box-none"
        colors={["rgba(10,11,14,0)", C.ground]}
        locations={[0, 0.3]}
        style={[s.dock, { bottom: TAB_BAR_HEIGHT + insets.bottom }]}
      >
        <Btn kind="long" style={{ flex: 1 }} onPress={() => openTicket(1)}>
          <Text style={[s.dockT, { color: ON_MINT }]}>
            Long <Text style={s.lv}>{DEFAULT_LEV}x</Text>
          </Text>
        </Btn>
        <Btn kind="short" style={{ flex: 1 }} onPress={() => openTicket(-1)}>
          <Text style={[s.dockT, { color: ON_SHORT }]}>
            Short <Text style={s.lv}>{DEFAULT_LEV}x</Text>
          </Text>
        </Btn>
      </LinearGradient>

      {/* toast */}
      <ToastView />

      {/* sheets */}
      {sheet?.t === "market" ? (
        <MarketPickerSheet
          current={sym}
          onClose={() => setSheet(null)}
          onPick={(x) => {
            setSym(x);
            setSheet(null);
          }}
        />
      ) : null}
      {sheet?.t === "status" ? (
        <MarketStatusSheet sym={sym} onClose={() => setSheet(null)} />
      ) : null}
      {sheet?.t === "unlock" ? (
        <UnlockSheet
          onClose={() => setSheet(null)}
          onDone={() => setSheet({ t: "ticket", side: sheet.side })}
        />
      ) : null}
      {sheet?.t === "ticket" ? (
        <OrderTicketSheet
          sym={sym}
          initialSide={sheet.side}
          onClose={() => setSheet(null)}
          onChart={toChart}
        />
      ) : null}
      {sheet?.t === "position" ? (
        <PositionSheet id={sheet.id} onClose={() => setSheet(null)} />
      ) : null}
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------- order book
function Book({
  sym,
  mark,
  label,
}: {
  sym: string;
  mark: number;
  label: string;
}) {
  const { asks, bids, spread } = sampleBook(mark);
  const mx = Math.max(...asks.map((x) => x.q), ...bids.map((x) => x.q));
  const Row = ({ x, bid }: { x: { p: number; q: number }; bid: boolean }) => (
    <View style={s.bRow}>
      <View
        style={[
          s.bBar,
          bid
            ? { right: 0, backgroundColor: "rgba(55,224,153,.12)" }
            : { left: 0, backgroundColor: "rgba(240,96,77,.12)" },
          { width: `${(x.q / mx) * 100}%` },
        ]}
      />
      <Text style={[s.bTxt, { color: bid ? C.mint : C.loss }]}>
        {fmtNum(x.p)}
      </Text>
      <Text style={[s.bTxt, { color: C.ink3 }]}>{qtyFmt(x.q)}</Text>
    </View>
  );
  return (
    <View>
      <View style={{ flexDirection: "row", gap: 14 }}>
        <View style={{ flex: 1 }}>
          <Text style={s.bHd}>BIDS · {label.toUpperCase()}</Text>
          {bids.map((x, i) => (
            <Row key={"b" + i} x={x} bid />
          ))}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[s.bHd, { textAlign: "right" }]}>ASKS</Text>
          {asks.map((x, i) => (
            <Row key={"a" + i} x={x} bid={false} />
          ))}
        </View>
      </View>
      <Text style={s.foot}>
        SPREAD {fmtPx(spread)} · {((spread / mark) * 100).toFixed(3)}% · SAMPLE
        BOOK
      </Text>
    </View>
  );
}

// ---------------------------------------------------------------- toast
function ToastView() {
  const { toast: t } = usePerps();
  const insets = useSafeAreaInsets();
  const [shown, setShown] = useState<typeof t>(null);
  useEffect(() => {
    if (!t) return;
    setShown(t);
    const id = setTimeout(() => setShown(null), 2900);
    return () => clearTimeout(id);
  }, [t?.id]); // eslint-disable-line
  if (!shown) return null;
  return (
    <Animated.View
      entering={FadeInDown.duration(220)}
      exiting={FadeOutUp.duration(180)}
      pointerEvents="none"
      style={[s.toast, { top: insets.top + 10 }]}
    >
      <Text style={s.toastT}>{shown.title}</Text>
      {shown.sub ? <Text style={s.toastS}>{shown.sub}</Text> : null}
    </Animated.View>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.ground },
  rowC: { flexDirection: "row", alignItems: "center", gap: 8 },
  head: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 20,
  },
  mktBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    minHeight: 48,
    minWidth: 0,
  },
  logo: {
    width: 40,
    height: 40,
    borderRadius: 999,
    backgroundColor: "#262C36",
    alignItems: "center",
    justifyContent: "center",
  },
  logoT: { fontFamily: FONT.mono400, fontSize: 10.5, color: C.ink2 },
  sym: {
    fontFamily: FONT.sans800,
    fontSize: 21,
    letterSpacing: -0.7,
    color: C.ink1,
  },
  sub: { fontFamily: FONT.sans600, fontSize: 12.5, color: C.ink3 },
  spot: {
    height: 34,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#2A303A",
    justifyContent: "center",
  },
  spotT: { fontFamily: FONT.sans800, fontSize: 12.5, color: C.ink2 },
  px: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 10,
    marginTop: 14,
    paddingHorizontal: 20,
    flexWrap: "wrap",
  },
  big: {
    fontFamily: FONT.sans800,
    fontSize: 34,
    letterSpacing: -1.5,
    lineHeight: 38,
    color: C.ink1,
    fontVariant: ["tabular-nums"],
  },
  chg: {
    fontFamily: FONT.mono400,
    fontSize: 13.5,
    fontVariant: ["tabular-nums"],
  },
  h24: {
    fontFamily: FONT.mono400,
    fontSize: 9,
    letterSpacing: 1.4,
    color: C.ink4,
  },
  stats: { gap: 18, paddingHorizontal: 20, paddingBottom: 2 },
  statK: {
    fontFamily: FONT.mono400,
    fontSize: 8.5,
    letterSpacing: 1.4,
    color: C.ink4,
  },
  statV: {
    fontFamily: FONT.mono400,
    fontSize: 12,
    color: "#D6DAE0",
    fontVariant: ["tabular-nums"],
  },
  status: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    alignSelf: "flex-start",
    marginTop: 14,
    marginLeft: 20,
    minHeight: 30,
    paddingHorizontal: 11,
    borderRadius: 999,
    backgroundColor: C.surface,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 999,
    shadowOpacity: 0.5,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 0 },
  },
  statusT: {
    fontFamily: FONT.mono400,
    fontSize: 9.5,
    letterSpacing: 1.2,
    color: C.ink2,
  },
  tabs: {
    flexDirection: "row",
    gap: 18,
    marginTop: 6,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: C.hair,
  },
  tabB: { height: 46, justifyContent: "center" },
  tabT: { fontFamily: FONT.sans800, fontSize: 14, color: C.ink4 },
  tabN: { fontFamily: FONT.mono400, fontSize: 11, color: C.ink4 },
  tabLine: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: -1,
    height: 2,
    borderRadius: 2,
    backgroundColor: C.mint,
  },
  panel: { paddingHorizontal: 20, minHeight: 120 },
  pRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    minHeight: 74,
    borderBottomWidth: 1,
    borderBottomColor: C.hair,
  },
  ttl: {
    fontFamily: FONT.sans800,
    fontSize: 15.5,
    letterSpacing: -0.3,
    color: C.ink1,
  },
  entry: { fontFamily: FONT.mono400, fontSize: 11.5, color: C.ink3 },
  pnl: {
    fontFamily: FONT.sans800,
    fontSize: 15.5,
    fontVariant: ["tabular-nums"],
  },
  roe: {
    fontFamily: FONT.mono400,
    fontSize: 11.5,
    fontVariant: ["tabular-nums"],
  },
  empty: { gap: 8, paddingVertical: 20 },
  emptyT: {
    fontFamily: FONT.sans600,
    fontSize: 13,
    lineHeight: 20,
    color: C.ink3,
  },
  cancel: {
    height: 34,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: C.loss,
    justifyContent: "center",
  },
  cancelT: { fontFamily: FONT.sans800, fontSize: 13, color: C.loss },
  ratio: {
    flexDirection: "row",
    height: 6,
    borderRadius: 999,
    overflow: "hidden",
  },
  foot: {
    marginTop: 10,
    textAlign: "center",
    fontFamily: FONT.mono400,
    fontSize: 9.5,
    letterSpacing: 1.3,
    color: C.ink4,
  },
  bHd: {
    fontFamily: FONT.mono400,
    fontSize: 8.5,
    letterSpacing: 1.4,
    color: C.ink4,
    paddingTop: 12,
    paddingBottom: 6,
  },
  bRow: {
    height: 26,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 6,
  },
  bBar: { position: "absolute", top: 3, bottom: 3, borderRadius: 3 },
  bTxt: {
    fontFamily: FONT.mono400,
    fontSize: 11.5,
    fontVariant: ["tabular-nums"],
  },
  dock: {
    position: "absolute",
    left: 0,
    right: 0,
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 14,
  },
  dockT: { fontFamily: FONT.sans800, fontSize: 15.5, letterSpacing: -0.2 },
  lv: { fontFamily: FONT.mono400, fontSize: 11, opacity: 0.7 },
  toast: {
    position: "absolute",
    left: 20,
    right: 20,
    gap: 3,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    backgroundColor: C.raised,
    borderWidth: 1,
    borderColor: "#262C36",
    zIndex: 50,
    elevation: 12,
  },
  toastT: {
    fontFamily: FONT.sans800,
    fontSize: 13,
    letterSpacing: -0.2,
    color: C.ink1,
  },
  toastS: {
    fontFamily: FONT.mono400,
    fontSize: 9.5,
    letterSpacing: 1.4,
    color: C.mint,
  },
});
